import type { IntentSignal, OperatorIntent } from "./types";

type Bucket = { score: number; lastAt: number };

const DECAY_MS = 18_000;
const MIN_CONFIDENCE = 0.35;

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function decayFactor(ageMs: number) {
  if (ageMs <= 0) return 1;
  return Math.exp(-ageMs / DECAY_MS);
}

export function inferIntent(input: {
  now: number;
  history: IntentSignal[];
}): { intent: OperatorIntent; confidence: number; scores: Record<OperatorIntent, number> } {
  const buckets: Record<OperatorIntent, Bucket> = {
    build: { score: 0, lastAt: 0 },
    debug: { score: 0, lastAt: 0 },
    demo: { score: 0, lastAt: 0 },
    gtm: { score: 0, lastAt: 0 },
    ritual: { score: 0, lastAt: 0 },
    analysis: { score: 0, lastAt: 0 },
    navigation: { score: 0, lastAt: 0 },
    idle: { score: 0, lastAt: 0 },
  };

  for (const sig of input.history) {
    const at = typeof sig.at === "number" ? sig.at : input.now;
    const age = input.now - at;
    const w = Math.max(0, sig.weight || 0) * decayFactor(age);
    const b = buckets[sig.type];
    b.score += w;
    if (at > b.lastAt) b.lastAt = at;
  }

  // Idle heuristic: if we haven't seen any signals recently, bias to idle.
  const mostRecent = Math.max(...Object.values(buckets).map((b) => b.lastAt));
  if (input.now - mostRecent > 8000) {
    buckets.idle.score += 2;
  }

  const scores = Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.score])) as Record<OperatorIntent, number>;
  const sorted = (Object.keys(scores) as OperatorIntent[])
    .map((k) => ({ k, v: scores[k] }))
    .sort((a, b) => b.v - a.v);

  const top = sorted[0] || { k: "idle" as OperatorIntent, v: 0 };
  const total = sorted.reduce((acc, x) => acc + x.v, 0) || 1;
  const confidence = clamp01(top.v / total);

  return {
    intent: confidence >= MIN_CONFIDENCE ? top.k : "navigation",
    confidence,
    scores,
  };
}
