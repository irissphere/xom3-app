// Pipeline Executor Engine
// Executes migration pipelines end-to-end

import { MigrationPipeline, PipelineExecution } from "./types";
import { transformBatch } from "../transform/engine";
import { detectCSVSchema, detectAPISchema } from "./schema-detector";
import { uoiHeartbeat } from "../uoi/heartbeat";
import { emitWorkflowSignal } from "../uoi/workflow-signal";
import { vizUpdate, vizStatusStore } from "../amp/viz/store";
import { getAirtableBase } from "../airtable/client";

let basePromise: Promise<any> | null = null;
async function getBase() {
  if (!basePromise) basePromise = getAirtableBase();
  return basePromise;
}

// AMP-ER: Log error to AMP Errors table
async function logErrorToAirtable(
  pipeline: MigrationPipeline,
  execution: PipelineExecution,
  rawRow: Record<string, any>,
  errorMessage: string
): Promise<void> {
  try {
    const base = await getBase();
    const errorTable = base("AMP Errors");
    await errorTable.create([
      {
        fields: {
          PipelineID: pipeline.id,
          Tenant: pipeline.tenant,
          RawRow: JSON.stringify(rawRow),
          ErrorMessage: errorMessage,
          Timestamp: new Date().toISOString(),
          ExecutionID: execution.id,
          MappingProfile: pipeline.mapping.profileKey,
          RetryCount: 0,
          Status: "pending"
        }
      }
    ]);
  } catch (error) {
    // Don't fail the entire pipeline if error logging fails
    console.error("Failed to log error to AMP Errors table:", error);
  }
}

// UOI Signal Emitter - Unified way for AMP to talk to UOI
import { emitSignal } from "../uoi/signals";
import { pushHistory } from "../hse/history-store";
import { emitPipelineEvent } from "@/lib/cockpit/activity-events";
import { emitErrorSurface } from "@/lib/cockpit/error-surfaces";

function emitAmpSignal(type: string, severity: number, payload: any = {}) {
  try {
    // Emit signal to UOI signal queue (this stores it for HSE to read)
    emitSignal({
      source: "amp",
      type: type as any,
      payload,
      priority: severity >= 7 ? "high" : severity >= 4 ? "medium" : "low"
    });
    
    // Also trigger heartbeat for immediate processing (this also stores in memory)
    uoiHeartbeat({
      source: "amp",
      type,
      severity,
      payload
    });

    // Push to history store for temporal intelligence
    const historyValue = type.includes("error") ? 1 : 
                        type === "drift" ? (payload.driftAmount || payload.drift || 0) :
                        type === "queue" || type === "queue_pressure" ? (payload.queueSize || 0) :
                        type === "throughput" ? (payload.rowsPerSecond || 0) :
                        severity / 10; // Normalize severity to 0-1

    pushHistory({
      timestamp: Date.now(),
      subsystem: "amp",
      type: type,
      value: historyValue
    });
  } catch (error) {
    // Don't fail pipeline if UOI signal fails
    console.error(`[UOI] Failed to emit signal: ${type}`, error);
  }
}


export async function executePipeline(
  pipeline: MigrationPipeline
): Promise<PipelineExecution> {
  // Lazy-load AMP-AI modules so `next build` can import this file without initializing Airtable.
  const {
    processWithAMPAI,
    repairRowsWithAMPAI,
    getAMPAISummary,
    runAPE,
    runPPOPredictions
  } = await import("../amp-ai/orchestrator");
  const { runAPR } = await import("../amp-ai/apr/orchestrator");
  const { runFAO } = await import("../amp-ai/fao/orchestrator");
  const { runTSE } = await import("../amp-ai/tse/orchestrator");
  const { runMOF } = await import("../amp-ai/mof/orchestrator");
  const { runOSC } = await import("../amp-ai/osc/orchestrator");

  const execution: PipelineExecution = {
    id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    pipelineId: pipeline.id,
    status: "running",
    startedAt: new Date().toISOString(),
    source: pipeline.source.type,
    mappingProfile: pipeline.mapping.profileKey
  };

  const startTime = Date.now();

  // Initialize visualization status
  vizStatusStore.initExecution(execution.id, pipeline.id);

  // UOI: Emit pipeline start signal
  emitAmpSignal("pipeline_start", 1, { pipelineId: pipeline.id });

  // Cockpit: Emit pipeline start event
  emitPipelineEvent(pipeline.id, "started", { message: `Pipeline ${pipeline.id} started` });

  try {
    // PPO: Run predictions before execution
    let ppoPredictions: any = null;
    try {
      const incomingColumns: string[] = [];
      // Extract columns from source if possible (simplified)
      const ppoResult = await runPPOPredictions(
        pipeline.id,
        pipeline.tenant,
        pipeline.mapping.profileKey,
        incomingColumns.length > 0 ? incomingColumns : undefined
      );
      ppoPredictions = ppoResult;
      
      if (ppoResult.overallRisk === "critical" || ppoResult.overallRisk === "high") {
        execution.details = {
          ...execution.details,
          ppoRisk: ppoResult.overallRisk,
          ppoSummary: ppoResult.summary
        };
      }
    } catch (error) {
      console.error("[PPO] Pre-execution prediction failed:", error);
      // Don't fail execution if prediction fails
    }

    // Step 1: Extract data from source
    vizUpdate(execution.id, "source", "running");
    const rawData = await extractData(pipeline.source);
    
    if (rawData.length === 0) {
      vizUpdate(execution.id, "source", "error", { errorMessage: "No data found in source" });
      execution.status = "error";
      execution.completedAt = new Date().toISOString();
      execution.errors = [{ row: 0, error: "No data found in source" }];
      execution.executionTime = Date.now() - startTime;
      
      // UOI: Emit error signal for empty source
      emitAmpSignal("error", 5, {
        pipelineId: pipeline.id,
        errorMessage: "No data found in source",
        errorType: "empty_source"
      });
      
      // UOI: Emit pipeline complete signal
      emitAmpSignal("pipeline_complete", 1, {
        pipelineId: pipeline.id,
        processed: 0,
        failed: 0,
        status: "error"
      });
      
      return execution;
    }

    const dataLength = Array.isArray(rawData) ? rawData.length : 0;
    vizUpdate(execution.id, "source", "success", { rowsProcessed: dataLength });

    // Step 2: Auto-detect schema if enabled (with AMP-AI)
    let profileKey = pipeline.mapping.profileKey;
    let ampAIContext: any = null;
    
    // Step 3: Transform data
    // Parse CSV if it's a string (using same parser as import route)
    let rawRows: Record<string, any>[] = [];
    
    if (pipeline.mapping.autoDetect) {
      // Use AMP-AI for enhanced schema detection
      const ampAIResult = await processWithAMPAI(
        typeof rawData === "string" ? rawData : (Array.isArray(rawData) ? rawData : []),
        pipeline.tenant,
        pipeline.id,
        execution.id,
        {
          autoDetectSchema: true,
          autoSuggestProfile: true,
          autoClean: true,
          autoRepair: false,
          autoApplyProfile: true,
          profileThreshold: 0.6
        }
      );

      ampAIContext = ampAIResult.context;

      if (ampAIResult.suggestedProfile) {
        profileKey = ampAIResult.suggestedProfile;
        execution.details = {
          ...execution.details,
          autoDetectedProfile: profileKey,
          detectionConfidence: ampAIResult.schemaAnalysis?.confidence || 0,
          ampAISummary: getAMPAISummary(ampAIContext)
        };
      } else {
        // Fallback to original detection
        const detection = detectCSVSchema(
          typeof rawData === "string" ? rawData : JSON.stringify(rawData)
        );
        
        if (detection.suggestedProfile && detection.confidence && detection.confidence > 0.6) {
          profileKey = detection.suggestedProfile;
          execution.details = {
            ...execution.details,
            autoDetectedProfile: profileKey,
            detectionConfidence: detection.confidence
          };
        }
      }

      // Use cleaned data if available
      if (ampAIResult.cleanedData && ampAIResult.cleanedData.length > 0) {
        rawRows = ampAIResult.cleanedData;
      }
    }
    if (typeof rawData === "string") {
      const lines = rawData.split("\n").filter(line => line.trim().length > 0);
      
      if (lines.length > 0) {
        // Parse CSV (handle quoted values with commas)
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                current += '"';
                i++; // Skip next quote
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === "," && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseCSVLine(lines[0]);
        const rows = lines.slice(1).map(parseCSVLine);
        
        rawRows = rows
          .filter(row => row.length > 0 && row.some(cell => cell.trim().length > 0))
          .map(cols => {
            const rawRow: Record<string, string> = {};
            headers.forEach((h, i) => {
              rawRow[h] = cols[i] || "";
            });
            return rawRow;
          });
      }
    } else {
      rawRows = Array.isArray(rawData) ? rawData : [];
    }

    // Step 3: Transform data
    vizUpdate(execution.id, "transform", "running");
    const { valid, errors: transformErrors } = transformBatch(
      rawRows,
      profileKey
    );

    // AMP-ER: Capture failed rows and log to Airtable
    const failedRows: Record<string, any>[] = [];
    const errorMessages: string[] = [];
    let repairedCount = 0;

    // AMP-AI: Auto-repair failed rows
    if (transformErrors.length > 0 && ampAIContext) {
      const failedRowsForRepair = transformErrors.map(err => ({
        row: rawRows[err.row - 1] || {},
        error: err.error
      }));

      const repairResult = repairRowsWithAMPAI(failedRowsForRepair, ampAIContext);
      
      // Retry repaired rows
      const repairedRows = repairResult.repaired
        .filter(r => r.repairResult.retryable && r.repairResult.applied)
        .map(r => r.repairResult.repaired);

      if (repairedRows.length > 0) {
        const { valid: repairedValid, errors: repairErrors } = transformBatch(repairedRows, profileKey);
        valid.push(...repairedValid);
        repairedCount = repairedValid.length;
        
        // Update context with repair explanations
        ampAIContext = repairResult.context;
        
        // Remove successfully repaired errors from transformErrors
        const remainingErrors = transformErrors.filter((err, idx) => {
          const repair = repairResult.repaired[idx];
          return !repair || !repair.repairResult.applied || repairErrors.some(e => e.row === err.row);
        });
        transformErrors.length = 0;
        transformErrors.push(...remainingErrors);
      }
    }

    for (const error of transformErrors) {
      const failedRow = rawRows[error.row - 1]; // error.row is 1-indexed
      if (failedRow) {
        failedRows.push(failedRow);
        errorMessages.push(error.error);
        // Log to AMP Errors table
        await logErrorToAirtable(pipeline, execution, failedRow, error.error);
      }
    }

    // UOI: Emit error signal if errors occurred during transformation
    if (transformErrors.length > 0) {
      emitAmpSignal("error", 7, {
        pipelineId: pipeline.id,
        failedRows: transformErrors.length,
        errorMessages: errorMessages.slice(0, 5) // First 5 errors
      });
    }

    execution.rowsProcessed = rawRows.length;
    execution.rowsImported = valid.length;
    execution.rowsFailed = transformErrors.length;
    execution.errors = transformErrors;
    execution.failedRows = failedRows;
    execution.errorMessages = errorMessages;

    // Add AMP-AI summary to execution details
    if (ampAIContext) {
      execution.details = {
        ...execution.details,
        ampAISummary: getAMPAISummary(ampAIContext),
        ampAIExplanations: ampAIContext.explanations,
        rowsRepaired: repairedCount
      };
    }

    vizUpdate(
      execution.id,
      "transform",
      transformErrors.length > 0 ? "error" : "success",
      {
        rowsProcessed: rawRows.length,
        rowsImported: valid.length,
        rowsFailed: transformErrors.length,
        errorMessage: transformErrors.length > 0 ? transformErrors[0].error : undefined
      }
    );

    // APE: Run evolution cycle after execution
    try {
      // Build column mappings from profile (simplified - would need actual profile structure)
      const columnMappings: Record<string, string> = {};
      // Extract from raw rows headers if available
      if (rawRows.length > 0) {
        const headers = Object.keys(rawRows[0]);
        // Basic mapping inference (would be better to get from actual profile)
        headers.forEach(header => {
          const lower = header.toLowerCase();
          if (/first|fname/i.test(lower)) columnMappings[header] = "firstName";
          else if (/last|lname/i.test(lower)) columnMappings[header] = "lastName";
          else if (/email/i.test(lower)) columnMappings[header] = "email";
          else if (/phone|tel/i.test(lower)) columnMappings[header] = "phone";
          else if (/status|stage/i.test(lower)) columnMappings[header] = "status";
          else if (/created|date/i.test(lower)) columnMappings[header] = "createdAt";
        });
      }
      
      const apeResult = await runAPE(
        pipeline.id,
        pipeline.tenant,
        profileKey,
        rawRows,
        valid.map(v => ({
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          phone: v.phone,
          status: v.status,
          createdAt: v.createdAt
        })),
        transformErrors,
        columnMappings
      );

      execution.details = {
        ...execution.details,
        apeEvolution: apeResult.evolutionSummary,
        apeSuggestions: apeResult.suggestions.length,
        apeProfileEvolved: apeResult.profileEvolution?.applied || false
      };
    } catch (error) {
      console.error("[APE] Evolution cycle failed:", error);
      // Don't fail execution if evolution fails
    }

    // APR: Run pipeline rewriting after execution
    try {
      const aprResult = await runAPR(pipeline, ppoPredictions);
      
      if (aprResult.rewrite && aprResult.applied) {
        execution.details = {
          ...execution.details,
          aprRewrite: aprResult.summary,
          aprApplied: true,
          aprChanges: aprResult.rewrite.changes.length
        };
      } else if (aprResult.suggestions.length > 0) {
        execution.details = {
          ...execution.details,
          aprSuggestions: aprResult.suggestions.length,
          aprSummary: aprResult.summary
        };
      }
    } catch (error) {
      console.error("[APR] Rewrite cycle failed:", error);
      // Don't fail execution if rewrite fails
    }

    if (valid.length === 0) {
      execution.status = "error";
      execution.completedAt = new Date().toISOString();
      execution.executionTime = Date.now() - startTime;
      
      // UOI: Emit error signal for no valid rows
      emitAmpSignal("error", 8, {
        pipelineId: pipeline.id,
        errorMessage: "No valid rows after transformation",
        errorType: "no_valid_rows",
        failedRows: execution.rowsFailed || 0
      });
      
      // UOI: Emit pipeline complete signal
      emitAmpSignal("pipeline_complete", 1, {
        pipelineId: pipeline.id,
        processed: execution.rowsProcessed || 0,
        failed: execution.rowsFailed || 0,
        status: "error"
      });
      
      return execution;
    }

    // Step 3.5: Validate (implicit in transform, but we track it separately)
    vizUpdate(execution.id, "validate", "running");
    vizUpdate(execution.id, "validate", "success", { rowsProcessed: valid.length });

    // Step 4: Load data to target
    vizUpdate(execution.id, "insert", "running");
    const base = await getBase();
    const records = valid.map(cleaned => ({
      fields: {
        FirstName: cleaned.firstName,
        LastName: cleaned.lastName,
        Email: cleaned.email,
        Phone: cleaned.phone || "",
        Status: cleaned.status,
        CreatedAt: cleaned.createdAt
      }
    }));

    // Batch insert (max 10 records per batch)
    const chunks: typeof records[] = [];
    const recordsCopy = [...records];
    while (recordsCopy.length) {
      chunks.push(recordsCopy.splice(0, 10) as typeof records);
    }

    let totalCreated = 0;
    let insertErrorCount = 0;
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      try {
        await base(pipeline.targetTable).create(chunk);
        totalCreated += chunk.length;
      } catch (error: any) {
        // AMP-ER: Capture failed insert rows
        const errorMsg = error.message || "Batch insert failed";
        execution.errors = execution.errors || [];
        
        // For each record in the failed chunk, log the error
        for (let i = 0; i < chunk.length; i++) {
          const recordIndex = chunkIndex * 10 + i;
          const validRecord = valid[recordIndex];
          
          if (validRecord) {
            // Reconstruct the raw row from the valid record (approximation)
            const rawRow = {
              firstName: validRecord.firstName,
              lastName: validRecord.lastName,
              email: validRecord.email,
              phone: validRecord.phone,
              status: validRecord.status
            };
            
            execution.errors.push({
              row: totalCreated + i + 1,
              error: errorMsg
            });
            
            execution.failedRows = execution.failedRows || [];
            execution.errorMessages = execution.errorMessages || [];
            execution.failedRows.push(rawRow);
            execution.errorMessages.push(errorMsg);
            
            // Log to AMP Errors table
            await logErrorToAirtable(pipeline, execution, rawRow, errorMsg);
            insertErrorCount++;
          }
        }
      }
    }

    // UOI: Emit error signal if insert errors occurred
    if (insertErrorCount > 0) {
      emitAmpSignal("error", 7, {
        pipelineId: pipeline.id,
        failedRows: insertErrorCount,
        errorType: "insert_failure"
      });
    }

    execution.rowsImported = totalCreated;
    execution.rowsFailed = (execution.rowsFailed || 0) + insertErrorCount;

    vizUpdate(
      execution.id,
      "insert",
      totalCreated > 0 ? "success" : "error",
      {
        rowsImported: totalCreated,
        rowsFailed: execution.rowsFailed || 0
      }
    );

    // Step 5: Trigger workflow if configured
    if (pipeline.workflow?.triggerOnSuccess && totalCreated > 0) {
      vizUpdate(execution.id, "workflows", "running");
      const workflowStartTime = Date.now();
      const workflowWebhook = pipeline.workflow?.workflowWebhook || "usha-intake";
      
      // UOI: Emit workflow start signal
      emitWorkflowSignal("workflow_start", 1, {
        workflowId: workflowWebhook,
        tenantId: pipeline.tenant,
        pipelineId: pipeline.id,
        executionId: execution.id,
        trigger: "pipeline_success"
      });
      
      try {
        await triggerWorkflow(pipeline, execution);
        execution.workflowTriggered = true;
        const workflowExecutionTime = Date.now() - workflowStartTime;
        vizUpdate(execution.id, "workflows", "success");
        
        // UOI: Emit workflow complete signal
        emitWorkflowSignal("workflow_complete", 1, {
          workflowId: workflowWebhook,
          tenantId: pipeline.tenant,
          durationMs: workflowExecutionTime
        });
        
        // UOI: Check for SLA breach (if execution time > 30 seconds)
        if (workflowExecutionTime > 30000) {
          emitWorkflowSignal("workflow_sla_breach", 6, {
            workflowId: workflowWebhook,
            tenantId: pipeline.tenant,
            durationMs: workflowExecutionTime,
            slaThreshold: 30000
          });
        }
        
        // UOI: Check for bottleneck (if execution time > 10 seconds)
        if (workflowExecutionTime > 10000) {
          emitWorkflowSignal("bottleneck", 6, {
            workflowId: workflowWebhook,
            tenantId: pipeline.tenant,
            step: "workflow_execution",
            durationMs: workflowExecutionTime
          });
        }
      } catch (error: any) {
        const workflowExecutionTime = Date.now() - workflowStartTime;
        console.error("Workflow trigger failed:", error);
        vizUpdate(execution.id, "workflows", "error", { errorMessage: "Workflow trigger failed" });
        
        // UOI: Emit workflow error signal
        emitWorkflowSignal("workflow_error", 7, {
          workflowId: workflowWebhook,
          tenantId: pipeline.tenant,
          error: error.message || "Workflow trigger failed"
        });
      }
    } else {
      vizUpdate(execution.id, "workflows", "idle");
    }

    // Step 6: Send notifications
    if (pipeline.notification?.onSuccess && totalCreated > 0) {
      vizUpdate(execution.id, "notifications", "running");
      try {
        await sendNotification(pipeline, execution, "success");
        execution.notificationsSent = true;
        vizUpdate(execution.id, "notifications", "success");
      } catch (error) {
        console.error("Notification failed:", error);
        vizUpdate(execution.id, "notifications", "error", { errorMessage: "Notification failed" });
      }
    } else {
      vizUpdate(execution.id, "notifications", "idle");
    }

    // Step 7: Log audit trail
    if (pipeline.audit) {
      vizUpdate(execution.id, "audit", "running");
      try {
        await logAudit(pipeline, execution);
        execution.auditLogged = true;
        vizUpdate(execution.id, "audit", "success");
      } catch (error) {
        console.error("Audit logging failed:", error);
        vizUpdate(execution.id, "audit", "error", { errorMessage: "Audit logging failed" });
      }
    } else {
      vizUpdate(execution.id, "audit", "idle");
    }

    execution.status = transformErrors.length > 0 ? "partial" : "success";
    execution.completedAt = new Date().toISOString();
    execution.executionTime = Date.now() - startTime;

    // UOI: Calculate and emit throughput signal
    const executionTimeSeconds = (execution.executionTime || 0) / 1000;
    const rowsPerSecond = executionTimeSeconds > 0 && execution.rowsProcessed
      ? execution.rowsProcessed / executionTimeSeconds
      : 0;
    
    // Emit throughput signal if throughput is low (less than 10 rows/second)
    if (rowsPerSecond > 0 && rowsPerSecond < 10) {
      emitAmpSignal("throughput", 4, {
        pipelineId: pipeline.id,
        rowsPerSecond: Math.round(rowsPerSecond * 100) / 100
      });
    }

    // UOI: Emit queue signal if there's queue pressure (multiple pending pipelines)
    // This is a simplified check - in production you'd check actual queue state
    const queueSize = 0; // TODO: Get actual queue size from scheduler
    if (queueSize > 5) {
      emitAmpSignal("queue", 3, {
        pipelineId: pipeline.id,
        queueSize
      });
    }

    // UOI: Emit drift signal if detected
    if (ppoPredictions?.predictions?.schemaDrift && ppoPredictions.predictions.schemaDrift.length > 0) {
      emitAmpSignal("drift", 5, {
        pipelineId: pipeline.id,
        driftFields: ppoPredictions.predictions.schemaDrift.map((d: any) => d.field || d).slice(0, 10)
      });
    }

    // FAO: Run full autonomous orchestration
    try {
      const faoResult = await runFAO(
        pipeline,
        {
          status: execution.status,
          rowsProcessed: execution.rowsProcessed || 0,
          rowsFailed: execution.rowsFailed || 0,
          executionTime: execution.executionTime || 0,
          errors: execution.errors
        },
        {
          load: 0.5, // Would calculate actual load
          drift: ppoPredictions?.predictions?.schemaDrift && ppoPredictions.predictions.schemaDrift.length > 0,
          errors: execution.rowsFailed && execution.rowsProcessed 
            ? execution.rowsFailed / execution.rowsProcessed 
            : 0,
          predictions: ppoPredictions
        }
      );

      execution.details = {
        ...execution.details,
        faoOrchestration: faoResult.summary,
        faoDecisions: faoResult.explanations.length,
        faoSchedule: faoResult.schedule?.schedule,
        faoRoute: faoResult.route?.path.join(" → ")
      };
    } catch (error) {
      console.error("[FAO] Orchestration cycle failed:", error);
      // Don't fail execution if orchestration fails
    }

    // TSE: Run sovereign engine - the crown
    try {
      const tseResult = await runTSE(
        pipeline,
        {
          status: execution.status,
          rowsProcessed: execution.rowsProcessed || 0,
          rowsFailed: execution.rowsFailed || 0,
          executionTime: execution.executionTime || 0
        }
      );

      execution.details = {
        ...execution.details,
        tseSovereign: tseResult.summary,
        tseDecisions: tseResult.decisions.length,
        tseRules: Object.keys(tseResult.rules).length,
        tsePriorities: tseResult.priorities.goals.length,
        tseState: {
          pipelines: tseResult.state.pipelines.length,
          errors: tseResult.state.errors.length,
          mappings: tseResult.state.mappings.length
        }
      };
    } catch (error) {
      console.error("[TSE] Sovereign cycle failed:", error);
      // Don't fail execution if sovereign cycle fails
    }

    // MOF: Run multi-organism federation - the federation layer
    try {
      const mofResult = await runMOF(
        pipeline,
        {
          threat: execution.rowsFailed && execution.rowsProcessed && (execution.rowsFailed / execution.rowsProcessed) > 0.3
            ? {
                type: "error_spike",
                severity: "high",
                description: `High error rate: ${((execution.rowsFailed / execution.rowsProcessed) * 100).toFixed(1)}%`
              }
            : undefined,
          load: {
            healthcare: 0.5,
            healthcrm: 0.5,
            benefitscrm: 0.5,
            compliance: 0.6,
            workflow: 0.7,
            notification: 0.4,
            migration: 0.8,
            analytics: 0.5,
            commerce: 0.3,
            crm: 0.4,
            content: 0.3
          }
        }
      );

      execution.details = {
        ...execution.details,
        mofFederation: mofResult.summary,
        mofSovereigns: Object.keys(mofResult.state.sovereigns).length,
        mofSignals: mofResult.signals.length,
        mofEvents: mofResult.events.length,
        mofProtections: mofResult.protections.length
      };
    } catch (error) {
      console.error("[MOF] Federation cycle failed:", error);
      // Don't fail execution if federation fails
    }

    // OSC: Run omni-sovereign continuum - the apex
    try {
      const oscResult = await runOSC(
        pipeline,
        rawRows
      );

      execution.details = {
        ...execution.details,
        oscContinuum: oscResult.summary,
        oscFieldState: oscResult.state.field.state,
        oscCoherence: oscResult.state.field.coherence,
        oscFlows: oscResult.flows.length,
        oscBehaviors: oscResult.behaviors.length,
        oscAttractors: oscResult.attractors.length,
        oscRhythms: oscResult.rhythms.length,
        oscDistortions: oscResult.distortions.length,
        oscSignals: oscResult.signals.length
      };
    } catch (error) {
      console.error("[OSC] Continuum cycle failed:", error);
      // Don't fail execution if continuum fails
    }

    // UOI: Emit pipeline complete signal
    emitAmpSignal("pipeline_complete", 1, {
      pipelineId: pipeline.id,
      processed: execution.rowsProcessed || 0,
      failed: execution.rowsFailed || 0,
      status: execution.status
    });

    // Cockpit: Emit pipeline event for activity pane
    emitPipelineEvent(
      pipeline.id,
      execution.status === "success" ? "success" : execution.status === "partial" ? "error" : "started",
      {
        message: `Processed ${execution.rowsProcessed || 0} rows, ${execution.rowsFailed || 0} failed`,
        executionId: execution.id
      }
    );

    // Cockpit: Emit error surface if there are failures
    if (execution.rowsFailed && execution.rowsFailed > 0) {
      emitErrorSurface(
        "pipeline",
        execution.rowsFailed > 10 ? "critical" : "elevated",
        `Pipeline ${pipeline.id} has ${execution.rowsFailed} failed rows`,
        `Pipeline execution completed with ${execution.rowsFailed} failed rows out of ${execution.rowsProcessed || 0} total`,
        "amp",
        { pipelineId: pipeline.id, executionId: execution.id, failedRows: execution.rowsFailed },
        `/app/healthcare/amp/history?pipelineId=${pipeline.id}`
      );
    }

    return execution;
  } catch (error: any) {
    // Mark all active nodes as error
    vizUpdate(execution.id, "source", "error", { errorMessage: error.message });
    vizUpdate(execution.id, "transform", "error", { errorMessage: error.message });
    vizUpdate(execution.id, "validate", "error", { errorMessage: error.message });
    vizUpdate(execution.id, "insert", "error", { errorMessage: error.message });
    
    execution.status = "error";
    execution.completedAt = new Date().toISOString();
    execution.errors = [{ row: 0, error: error.message || "Pipeline execution failed" }];
    execution.executionTime = Date.now() - startTime;

    // UOI: Emit error signal for pipeline failure
    emitAmpSignal("error", 10, {
      pipelineId: pipeline.id,
      errorMessage: error.message || "Pipeline execution failed",
      errorType: "pipeline_failure"
    });

    // UOI: Emit pipeline complete signal (even on failure)
    emitAmpSignal("pipeline_complete", 1, {
      pipelineId: pipeline.id,
      processed: execution.rowsProcessed || 0,
      failed: execution.rowsFailed || 0,
      status: "error"
    });

    // Cockpit: Emit pipeline error event
    emitPipelineEvent(pipeline.id, "error", {
      message: error.message || "Pipeline execution failed",
      errorType: "pipeline_failure"
    });

    // Cockpit: Emit critical error surface
    emitErrorSurface(
      "pipeline",
      "critical",
      `Pipeline ${pipeline.id} failed`,
      error.message || "Pipeline execution failed",
      "amp",
      { pipelineId: pipeline.id, error: error.message },
      `/app/healthcare/amp/history?pipelineId=${pipeline.id}`
    );

    // Trigger error workflow/notifications
    if (pipeline.workflow?.triggerOnError) {
      vizUpdate(execution.id, "workflows", "running");
      const workflowStartTime = Date.now();
      const workflowWebhook = pipeline.workflow?.workflowWebhook || "usha-intake";
      
      // UOI: Emit workflow start signal
      emitWorkflowSignal("workflow_start", 1, {
        workflowId: workflowWebhook,
        tenantId: pipeline.tenant
      });
      
      try {
        await triggerWorkflow(pipeline, execution);
        const workflowExecutionTime = Date.now() - workflowStartTime;
        vizUpdate(execution.id, "workflows", "success");
        
        // UOI: Emit workflow complete signal
        emitWorkflowSignal("workflow_complete", 1, {
          workflowId: workflowWebhook,
          tenantId: pipeline.tenant,
          durationMs: workflowExecutionTime
        });
      } catch (err: any) {
        const workflowExecutionTime = Date.now() - workflowStartTime;
        console.error("Error workflow trigger failed:", err);
        vizUpdate(execution.id, "workflows", "error", { errorMessage: "Error workflow trigger failed" });
        
        // UOI: Emit workflow error signal
        emitWorkflowSignal("workflow_error", 7, {
          workflowId: workflowWebhook,
          tenantId: pipeline.tenant,
          error: err.message || "Error workflow trigger failed"
        });
      }
    }

    if (pipeline.notification?.onError) {
      vizUpdate(execution.id, "notifications", "running");
      try {
        await sendNotification(pipeline, execution, "error");
        vizUpdate(execution.id, "notifications", "success");
      } catch (err) {
        console.error("Error notification failed:", err);
        vizUpdate(execution.id, "notifications", "error", { errorMessage: "Error notification failed" });
      }
    }

    return execution;
  }
}

async function extractData(source: MigrationPipeline["source"]): Promise<any[] | string> {
  switch (source.type) {
    case "csv-upload":
    case "scheduled-csv":
      if (!source.filePath) {
        throw new Error("File path not specified");
      }
      
      try {
        const fs = await import("fs/promises");
        const path = await import("path");
        
        // Resolve the file path (handle both relative and absolute paths)
        let resolvedPath: string;
        if (path.isAbsolute(source.filePath)) {
          resolvedPath = source.filePath;
        } else {
          // If relative, resolve from process.cwd() (Next.js app directory)
          resolvedPath = path.resolve(process.cwd(), source.filePath);
        }
        
        // Normalize the path (handle .. and . segments)
        resolvedPath = path.normalize(resolvedPath);
        
        // Check if file exists before attempting to read
        try {
          await fs.access(resolvedPath);
        } catch (accessError: any) {
          throw new Error(
            `File not found: ${resolvedPath}. ` +
            `Original path: ${source.filePath}. ` +
            `Working directory: ${process.cwd()}. ` +
            `Error: ${accessError.message}`
          );
        }
        
        // Read the file
        return await fs.readFile(resolvedPath, "utf8");
      } catch (error: any) {
        // Provide detailed error information
        if (error.code === "ENOENT") {
          throw new Error(
            `File not found: ${source.filePath}. ` +
            `Resolved path: ${error.path || "unknown"}. ` +
            `Working directory: ${process.cwd()}`
          );
        } else if (error.code === "EACCES") {
          throw new Error(
            `Permission denied reading file: ${source.filePath}. ` +
            `Please check file permissions.`
          );
        } else if (error.code === "EISDIR") {
          throw new Error(
            `Path is a directory, not a file: ${source.filePath}`
          );
        } else {
          throw new Error(
            `Failed to read file: ${source.filePath}. ` +
            `Error: ${error.message || String(error)}`
          );
        }
      }

    case "csv-s3":
      // TODO: Implement S3 CSV extraction
      throw new Error("S3 CSV extraction not yet implemented");

    case "api-endpoint":
      if (!source.apiUrl) {
        throw new Error("API URL not specified");
      }
      const response = await fetch(source.apiUrl, {
        method: source.apiMethod || "GET",
        headers: source.apiHeaders || {}
      });
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [data];

    case "webhook":
      // Webhook data is passed directly, not extracted here
      throw new Error("Webhook extraction should be handled by webhook handler");

    default:
      throw new Error(`Unknown source type: ${source.type}`);
  }
}

async function triggerWorkflow(
  pipeline: MigrationPipeline,
  execution: PipelineExecution,
  retryCount: number = 0
): Promise<void> {
  const apiKey = process.env.N8N_API_KEY;
  const baseUrl = process.env.N8N_BASE_URL;
  const webhookPath = pipeline.workflow?.workflowWebhook || "usha-intake";

  if (!apiKey || !baseUrl) {
    throw new Error("n8n configuration missing");
  }

  // UOI: Emit retry signal if retrying
  if (retryCount > 0) {
    emitWorkflowSignal("workflow_retry", 4, {
      workflowId: webhookPath,
      tenantId: pipeline.tenant,
      attempt: retryCount
    });
  }

  // UOI: Check for queue pressure (simplified - in production would check actual n8n queue)
  // For now, we'll emit a queue signal if multiple workflows are being triggered
  const queueSize = 0; // TODO: Get actual queue size from n8n API
  if (queueSize > 10) {
    emitWorkflowSignal("queue_pressure", 5, {
      workflowId: webhookPath,
      queueSize,
      pipelineId: pipeline.id,
      tenantId: pipeline.tenant
    });
  }

  const response = await fetch(`${baseUrl}/webhook/${webhookPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": apiKey
    },
    body: JSON.stringify({
      pipelineId: pipeline.id,
      executionId: execution.id,
      rowsImported: execution.rowsImported,
      status: execution.status,
      ...pipeline.workflow?.payload
    })
  });

  if (!response.ok) {
    // Retry logic: retry up to 3 times with exponential backoff
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
      return triggerWorkflow(pipeline, execution, retryCount + 1);
    }
    throw new Error(`Workflow request failed: ${response.statusText}`);
  }
}

async function sendNotification(
  pipeline: MigrationPipeline,
  execution: PipelineExecution,
  type: "success" | "error"
): Promise<void> {
  const appBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const message = pipeline.notification?.customMessage || 
    `Pipeline "${pipeline.name}" ${type === "success" ? "completed" : "failed"}: ${execution.rowsImported || 0} rows imported`;

  await fetch(`${appBaseUrl}/api/usha/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      details: {
        pipelineId: pipeline.id,
        executionId: execution.id,
        status: execution.status,
        rowsImported: execution.rowsImported,
        rowsFailed: execution.rowsFailed
      },
      channels: pipeline.notification?.channels || ["slack"]
    })
  });
}

async function logAudit(
  pipeline: MigrationPipeline,
  execution: PipelineExecution
): Promise<void> {
  const appBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  
  const auditDetails: Record<string, any> = {
    pipelineId: pipeline.id,
    executionId: execution.id,
    status: execution.status,
    rowsProcessed: execution.rowsProcessed,
    rowsImported: execution.rowsImported,
    rowsFailed: execution.rowsFailed
  };

  if (pipeline.audit?.logSource) {
    auditDetails.source = pipeline.source;
  }
  if (pipeline.audit?.logMapping) {
    auditDetails.mappingProfile = pipeline.mapping.profileKey;
  }
  if (pipeline.audit?.logValidation) {
    auditDetails.validation = pipeline.validation;
  }
  if (pipeline.audit?.logWorkflows) {
    auditDetails.workflowTriggered = execution.workflowTriggered;
  }
  if (pipeline.audit?.logErrors && execution.errors) {
    auditDetails.errors = execution.errors;
  }

  await fetch(`${appBaseUrl}/api/usha/audit/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: `Pipeline Execution: ${pipeline.name}`,
      userId: "system",
      details: {
        ...auditDetails,
        ...pipeline.audit?.customFields
      }
    })
  });
}
