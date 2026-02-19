import { publish } from "@/lib/sovereigns/event-bus";

export function cosSceneStarted(sceneId: string, instanceId: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.scene.started",
    severity: "info",
    payload: { sceneId, instanceId, at: Date.now() },
    tags: ["cos", "scene"],
  });
}

export function cosSceneStepCompleted(instanceId: string, stepId: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.scene.step.completed",
    severity: "info",
    payload: { instanceId, stepId, at: Date.now() },
    tags: ["cos", "scene"],
  });
}

export function cosSceneCompleted(sceneId: string, instanceId: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.scene.completed",
    severity: "info",
    payload: { sceneId, instanceId, at: Date.now() },
    tags: ["cos", "scene"],
  });
}

export function cosSceneFailed(sceneId: string, instanceId: string, error: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.scene.failed",
    severity: "error",
    payload: { sceneId, instanceId, error, at: Date.now() },
    tags: ["cos", "scene"],
  });
}

export function cosScenePaused(sceneId: string, instanceId: string, reason: string) {
  publish({
    sovereign: "cockpit",
    type: "cos.scene.paused",
    severity: "warning",
    payload: { sceneId, instanceId, reason, at: Date.now() },
    tags: ["cos", "scene"],
  });
}
