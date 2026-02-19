"use client";

import { useEffect, useRef } from "react";
import { trackEvent, type EventType } from "./usage-analytics";

/**
 * Hook: Automatically tracks page views on mount and provides trackAction helper.
 * Usage:
 *   const { trackAction } = useAnalytics("/dashboard");
 *   trackAction("clicked_button", { button: "create_lead" });
 */
export function useAnalytics(pageName?: string) {
  const mountTime = useRef(Date.now());
  const pageRef = useRef(pageName);

  // Track page view on mount, page duration on unmount
  useEffect(() => {
    if (!pageRef.current) return;
    const page = pageRef.current;
    const start = Date.now();

    trackEvent("page_view", { page });

    return () => {
      const duration = Date.now() - start;
      if (duration > 1000) {
        trackEvent("page_view", { page, duration });
      }
    };
  }, []);

  const trackAction = (action: string, metadata?: Record<string, any>) => {
    trackEvent("action_taken", {
      page: pageRef.current,
      action,
      metadata,
    });
  };

  const trackClick = (component: string, metadata?: Record<string, any>) => {
    trackEvent("click", {
      page: pageRef.current,
      component,
      metadata,
    });
  };

  const trackError = (errorMessage: string, metadata?: Record<string, any>) => {
    trackEvent("error_encountered", {
      page: pageRef.current,
      action: errorMessage,
      metadata,
    });
  };

  const trackWorkflow = (workflow: string, type: "start" | "complete" | "abandon", duration?: number) => {
    const eventType: EventType = type === "start"
      ? "workflow_start"
      : type === "complete"
        ? "workflow_complete"
        : "workflow_abandon";

    trackEvent(eventType, {
      page: pageRef.current,
      action: workflow,
      duration,
    });
  };

  return { trackAction, trackClick, trackError, trackWorkflow };
}
