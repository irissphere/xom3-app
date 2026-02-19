// HPE Phase II - Strike 1: Stage Transition Service
// Orchestrates stage transitions with full automation

import { 
  getAutomationActions, 
  StageTransitionContext,
  StageAutomationRule 
} from "./stage-automation-rules";
import { executeAutomationActions, AutomationExecutionReport } from "./automation-executor";
import { emitSignal } from "@/lib/uoi/signals";
import { pushHistory } from "@/lib/hse/history-store";
import { emitStateUpdate } from "@/lib/hse/signals";
import { logPipelineEvent } from "./compliance-helpers";
import { handleStageTransitionNotification } from "@/lib/client/notifications";
import Airtable from "airtable";

export interface StageTransitionRequest {
  clientId: string;
  oldStage: string;
  newStage: string;
  userId?: string;
  metadata?: Record<string, any>;
  clientData?: Record<string, any>;
}

export interface StageTransitionResponse {
  success: boolean;
  error?: string;
  transitionId: string;
  timestamp: string;
  automationReport?: AutomationExecutionReport;
  auditLogged: boolean;
  complianceLogged: boolean;
  airtableSynced: boolean;
  uoiSignalEmitted: boolean;
  hseStateUpdated: boolean;
}

/**
 * Execute a complete stage transition with all automation
 */
export async function executeStageTransition(
  request: StageTransitionRequest,
  customRules: StageAutomationRule[] = []
): Promise<StageTransitionResponse> {
  const transitionId = `transition-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();
  
  const context: StageTransitionContext = {
    clientId: request.clientId,
    clientName: request.clientData?.name || request.clientData?.clientName,
    oldStage: request.oldStage,
    newStage: request.newStage,
    userId: request.userId,
    timestamp,
    metadata: request.metadata,
    clientData: request.clientData
  };
  
  const response: StageTransitionResponse = {
    success: false,
    transitionId,
    timestamp,
    auditLogged: false,
    complianceLogged: false,
    airtableSynced: false,
    uoiSignalEmitted: false,
    hseStateUpdated: false
  };
  
  try {
    // Step 1: Get automation actions for this transition
    const actions = getAutomationActions(
      request.oldStage,
      request.newStage,
      context,
      customRules
    );
    
    console.log(`[Stage Transition] ${request.oldStage} → ${request.newStage} (${actions.length} actions)`);
    
    // Step 2: Execute all automation actions
    const automationReport = await executeAutomationActions(actions, context);
    response.automationReport = automationReport;
    
    // Step 3: Update stage in Airtable (if not already done by automation)
    if (!automationReport.results.some(r => r.actionType === "sync_airtable" && r.success)) {
      await updateStageInAirtable(request.clientId, request.newStage);
      response.airtableSynced = true;
    } else {
      response.airtableSynced = true; // Already synced by automation
    }
    
    // Step 4: Log audit trail
    try {
      await logAuditTrail(context);
      response.auditLogged = true;
    } catch (error) {
      console.error("[Stage Transition] Audit logging failed:", error);
    }
    
    // Step 5: Emit UOI signal for transition (if not already done)
    if (!automationReport.results.some(r => r.actionType === "emit_uoi_signal" && r.success)) {
      emitSignal({
        source: "hpe-stage-transition",
        type: "stage_transition",
        payload: {
          clientId: request.clientId,
          oldStage: request.oldStage,
          newStage: request.newStage,
          timestamp,
          transitionId
        },
        priority: "medium"
      });
      response.uoiSignalEmitted = true;
    } else {
      response.uoiSignalEmitted = true; // Already emitted by automation
    }
    
    // Step 6: Update HSE state
    pushHistory({
      timestamp: Date.now(),
      subsystem: "hpe",
      type: "stage_transition",
      value: 1
    });
    
    emitStateUpdate(["hpe_stage_transition", `transition_${request.oldStage}_to_${request.newStage}`]);
    response.hseStateUpdated = true;
    
    // Step 7: Check if compliance was logged by automation
    response.complianceLogged = automationReport.results.some(
      r => r.actionType === "log_compliance" && r.success
    );
    
    // Step 8: Log pipeline event to compliance memory
    try {
      await logPipelineEvent("stage_transition", {
        clientId: request.clientId,
        agentId: request.userId,
        stage: request.newStage,
        description: `Client transitioned from "${request.oldStage}" to "${request.newStage}"`,
        metadata: {
          oldStage: request.oldStage,
          newStage: request.newStage,
          transitionId: response.transitionId,
          automationActions: automationReport.totalActions,
          automationSuccessful: automationReport.successful
        },
        source: request.metadata?.source === "pipeline-board-drag-drop" ? "UI" : "automation"
      });
    } catch (complianceError) {
      console.error("[Stage Transition] Compliance logging failed:", complianceError);
      // Continue even if compliance logging fails
    }

    // Step 9: Notify client of stage transition (Lane 4)
    try {
      await handleStageTransitionNotification(
        request.clientId,
        request.oldStage,
        request.newStage,
        request.clientData
      );
    } catch (notificationError) {
      console.error("[Stage Transition] Client notification failed:", notificationError);
      // Continue even if notification fails
    }
    
    response.success = true;
    
    console.log(`[Stage Transition] ✅ Complete: ${request.oldStage} → ${request.newStage}`);
    console.log(`[Stage Transition] Automation: ${automationReport.successful}/${automationReport.totalActions} successful`);
    
    return response;
  } catch (error: any) {
    console.error("[Stage Transition] Failed:", error);
    response.error = error.message || "Stage transition failed";
    response.success = false;
    return response;
  }
}

/**
 * Update stage in Airtable
 */
async function updateStageInAirtable(clientId: string, newStage: string): Promise<void> {
  if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_USHA_BASE_ID) {
    throw new Error("Airtable configuration missing");
  }
  
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
    .base(process.env.AIRTABLE_USHA_BASE_ID);
  
  await base("Clients").update([{
    id: clientId,
    fields: {
      "Status": newStage,
      "Last Status Update": new Date().toISOString()
    }
  }]);
}

/**
 * Log audit trail
 */
async function logAuditTrail(context: StageTransitionContext): Promise<void> {
  const response = await fetch("/api/usha/audit/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "Stage Transition",
      userId: context.userId || "system",
      clientId: context.clientId,
      details: {
        oldStage: context.oldStage,
        newStage: context.newStage,
        transitionType: "automated",
        timestamp: context.timestamp,
        ...context.metadata
      }
    })
  });
  
  if (!response.ok) {
    throw new Error("Failed to log audit trail");
  }
}
