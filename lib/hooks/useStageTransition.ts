// Enhanced Stage Transition Hook
// Provides logging, automation triggers, and UI confirmation for stage changes
// HPE Phase II - Strike 1: Integrated with Stage-Based Automation Engine

import { useState, useCallback } from "react";
import { executeStageTransition, StageTransitionRequest } from "@/lib/hpe/stage-transition-service";

export interface StageTransitionOptions {
  clientId: string;
  oldStage: string;
  newStage: string;
  userId?: string;
  metadata?: Record<string, any>;
  clientData?: Record<string, any>;
  requireConfirmation?: boolean;
  confirmationMessage?: string;
}

export interface StageTransitionResult {
  success: boolean;
  error?: string;
  auditLogged?: boolean;
  automationTriggered?: boolean;
  complianceLogged?: boolean;
  notificationSent?: boolean;
  automationReport?: {
    totalActions: number;
    successful: number;
    failed: number;
  };
}

export interface UseStageTransitionReturn {
  transitionStage: (options: StageTransitionOptions) => Promise<StageTransitionResult>;
  isTransitioning: boolean;
  lastResult: StageTransitionResult | null;
}

/**
 * Enhanced hook for stage transitions with full automation engine integration
 */
export function useStageTransition(): UseStageTransitionReturn {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [lastResult, setLastResult] = useState<StageTransitionResult | null>(null);

  const transitionStage = useCallback(async (
    options: StageTransitionOptions
  ): Promise<StageTransitionResult> => {
    setIsTransitioning(true);
    setLastResult(null);

    const result: StageTransitionResult = {
      success: false,
      auditLogged: false,
      automationTriggered: false,
      complianceLogged: false,
      notificationSent: false
    };

    try {
      // Use the new Stage-Based Automation Engine
      const request: StageTransitionRequest = {
        clientId: options.clientId,
        oldStage: options.oldStage,
        newStage: options.newStage,
        userId: options.userId,
        metadata: options.metadata,
        clientData: options.clientData
      };

      const response = await executeStageTransition(request);

      // Map response to result format
      result.success = response.success;
      result.error = response.error;
      result.auditLogged = response.auditLogged;
      result.complianceLogged = response.complianceLogged;
      result.notificationSent = response.automationReport?.results.some(
        r => r.actionType === "send_notification" && r.success
      ) || false;
      result.automationTriggered = (response.automationReport?.totalActions || 0) > 0;
      
      if (response.automationReport) {
        result.automationReport = {
          totalActions: response.automationReport.totalActions,
          successful: response.automationReport.successful,
          failed: response.automationReport.failed
        };
      }

      console.log(`[Stage Transition] Complete:`, {
        clientId: options.clientId,
        transition: `${options.oldStage} → ${options.newStage}`,
        success: result.success,
        automationActions: result.automationReport?.totalActions || 0,
        timestamp: new Date().toISOString()
      });

      setLastResult(result);
      return result;

    } catch (error: any) {
      console.error("[Stage Transition] Failed:", error);
      result.error = error.message || "Stage transition failed";
      result.success = false;
      setLastResult(result);
      return result;
    } finally {
      setIsTransitioning(false);
    }
  }, []);

  return {
    transitionStage,
    isTransitioning,
    lastResult
  };
}
