"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OperatorDashboardContext } from "../page";

export type OperatorPanelState<T> = {
  loading: boolean;
  error: string | null;
  data: T | null;
  refreshedAt: number | null;
};

export function OperatorPanelFrame(props: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="xom3-glass xom3-glassEdge" style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <div style={{ fontWeight: 820 }}>{props.title}</div>
          {props.hint ? (
            <div className="xom3-mono" style={{ marginTop: 6, color: "var(--text-2)", fontSize: 12 }}>
              {props.hint}
            </div>
          ) : null}
        </div>
        {props.right ? <div>{props.right}</div> : null}
      </div>
      <div style={{ marginTop: 12 }}>{props.children}</div>
    </div>
  );
}

export function PostureChip(props: { label: string; tone?: "ok" | "missing" | "error" | "degraded" | "neutral" }) {
  const tone = props.tone || "neutral";
  const colors =
    tone === "ok"
      ? { bg: "rgba(34,197,94,0.14)", fg: "rgb(34,197,94)", border: "rgba(34,197,94,0.28)" }
      : tone === "missing"
        ? { bg: "rgba(148,163,184,0.10)", fg: "rgb(148,163,184)", border: "rgba(148,163,184,0.22)" }
        : tone === "degraded"
          ? { bg: "rgba(245,158,11,0.12)", fg: "rgb(245,158,11)", border: "rgba(245,158,11,0.26)" }
          : tone === "error"
            ? { bg: "rgba(239,68,68,0.12)", fg: "rgb(248,113,113)", border: "rgba(239,68,68,0.22)" }
            : { bg: "rgba(255,255,255,0.06)", fg: "var(--text-1)", border: "rgba(255,255,255,0.12)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        borderRadius: 999,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        color: colors.fg,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
      }}
    >
      {props.label}
    </span>
  );
}

export function PanelError(props: { label?: string; error: string }) {
  return (
    <div style={{ padding: 12, borderRadius: 12, border: "1px solid rgba(239,68,68,0.22)", background: "rgba(239,68,68,0.10)", color: "rgb(248,113,113)" }}>
      <div style={{ fontWeight: 750 }}>{props.label || "Panel degraded"}</div>
      <div className="xom3-mono" style={{ marginTop: 6, fontSize: 12, color: "rgba(248,113,113,0.95)" }}>
        {props.error}
      </div>
    </div>
  );
}

export function PanelEmpty(props: { label: string }) {
  return <div className="xom3-subtle">{props.label}</div>;
}

export function useOperatorPanel<T>(input: {
  ctx: OperatorDashboardContext;
  panel: string;
  load: (ctx: OperatorDashboardContext) => Promise<T>;
  refreshMs?: number;
}) {
  const { ctx, panel, load, refreshMs = 3500 } = input;
  
  const [state, setState] = useState<OperatorPanelState<T>>({
    loading: true,
    error: null,
    data: null,
    refreshedAt: null,
  });

  const lastErrorSentRef = useRef<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  const tick = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const data = await loadRef.current(ctx);
      setState({ loading: false, error: null, data, refreshedAt: Date.now() });
      lastErrorSentRef.current = null;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "panel_load_error";
      setState((s) => ({ ...s, loading: false, error: msg, refreshedAt: Date.now() }));

      if (lastErrorSentRef.current !== msg) {
        lastErrorSentRef.current = msg;
        fetch("/api/operator/dashboard/signal", {
          method: "POST",
          headers: ctx.headers,
          body: JSON.stringify({
            type: "operator.dashboard.error",
            payload: { panel, error: msg },
          }),
        }).catch(() => {});
      }
    }
  }, [ctx, panel]);

  useEffect(() => {
    let stopped = false;
    const run = async () => {
      if (stopped) return;
      await tick();
    };
    run().catch(() => {});
    const interval = setInterval(() => run().catch(() => {}), Math.max(1200, refreshMs));
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [tick, refreshMs]);

  return { state, refresh: tick };
}
