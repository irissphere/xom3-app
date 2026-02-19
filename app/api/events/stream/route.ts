import { publish, subscribe, type SovereignEvent } from "@/lib/sovereigns/event-bus";
import {
  recordEvent,
  recordReflexActivation,
  recordRitualStep,
  recordSovereignHealth,
  recordSovereignPosture,
} from "@/lib/constellation/memory";
import { ensureReflexChainsBound } from "@/lib/constellation/reflexChains";
import { ensureCosBound } from "@/lib/cos";
import { ensureCosGraphBound } from "@/lib/cos/graph";
import { ensureCosBrainBound } from "@/lib/cos/brain";
import { ensureIntakecrmSlaEngineArmed } from "@/lib/intakecrm/sla/intakecrm-sla-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function toSseData(event: SovereignEvent) {
  // SSE format: each message is separated by a blank line.
  // We include `id:` so the client can dedupe if needed.
  return `id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let keepAliveHandle: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // CRX-1: ensure chain lane is active whenever an SSE client connects (purely additive).
      ensureReflexChainsBound();
      // COS-1: orchestration director (purely additive).
      ensureCosBound();
      // COS-2: graph orchestration (purely additive).
      ensureCosGraphBound();
      // COS-3: adaptive brain (purely additive).
      ensureCosBrainBound();
      // intakecrm: SLA engine (purely additive).
      ensureIntakecrmSlaEngineArmed();

      // Initial hello (comment) so clients see immediate activity.
      controller.enqueue(encoder.encode(`: connected ${new Date().toISOString()}\n\n`));

      // Keep-alive ping to avoid idle timeouts at proxies.
      keepAliveHandle = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          // If enqueue fails, the stream is likely closed.
        }
      }, 15000);

      unsubscribe = subscribe((event) => {
        try {
          // CM-1: passive constellation memory (purely additive)
          recordEvent(event);
          recordSovereignHealth(event);

          if (event.type.endsWith(".posture.changed")) {
            const posture = String(event.payload?.to || event.payload?.posture || "");
            if (posture) recordSovereignPosture({ id: String(event.sovereign), posture });
          }

          if (event.tags?.includes("reflex")) {
            const kind = String(event.payload?.kind || "");
            const targetSovereign =
              kind === "broadcast.enqueue" ? "broadcast" :
              kind === "uoi.directive" ? "uoi" :
              kind === "sovereign.sync" ? "sync" :
              event.sovereign;
            recordReflexActivation({
              sourceSovereign: String(event.sovereign),
              targetSovereign: String(targetSovereign),
              type: String(event.type),
            });
          }

          if (event.tags?.includes("ritual")) {
            const ritualId = String(event.payload?.ritualKey || event.payload?.ritual || "unknown");
            const step = String(event.type);
            const sovereign =
              event.payload?.kind === "broadcast.enqueue" ? "broadcast" :
              event.payload?.kind === "uoi.directive" ? "uoi" :
              event.payload?.kind === "sovereign.sync" ? "sync" :
              String(event.sovereign);
            recordRitualStep({ ritualId, step, sovereign });
          }

          // RC-1: cinematic overlays (purely additive). Guard against recursion.
          if (event.type !== "ritual.cinematic" && event.tags?.includes("ritual")) {
            void import("@/lib/rituals/cinematics")
              .then(({ runRitualCinematics }) => runRitualCinematics(event.payload))
              .then((cinematic) => {
                publish({
                  sovereign: "rituals",
                  type: "ritual.cinematic",
                  severity: "info",
                  payload: cinematic,
                  tags: ["ritual", "cinematic"],
                  parentEventId: event.id,
                });
              })
              .catch(() => {});
          }

          controller.enqueue(encoder.encode(toSseData(event)));
        } catch {
          // Ignore: stream closed or backpressure issue.
        }
      });
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (keepAliveHandle) clearInterval(keepAliveHandle);
    },
  });

  // Ensure we cleanup when the client disconnects.
  req.signal.addEventListener(
    "abort",
    () => {
      if (unsubscribe) unsubscribe();
      if (keepAliveHandle) clearInterval(keepAliveHandle);
    },
    { once: true }
  );

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Connection: "keep-alive",
      // Nginx buffering off (harmless if not present)
      "X-Accel-Buffering": "no",
    },
  });
}
