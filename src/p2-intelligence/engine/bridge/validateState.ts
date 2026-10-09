import type { AppState } from "./types";

export function validateState(state: AppState): AppState {
  const range = (n: number, min: number, max: number) => {
    if (typeof n !== "number" || !Number.isFinite(n)) throw new TypeError("State numbers must be finite");
    return Math.max(min, Math.min(max, n));
  };
  const choice = (value: string, values: string[]) => {
    if (!values.includes(value)) throw new TypeError("Invalid state value: " + value);
  };
  const moods = ["calm", "content", "excited", "tense", "sad"];
  choice(state.affect.label, moods); choice(state.scene.musicMood, moods);
  choice(state.ui.mode, ["mirror", "become"]); choice(state.ui.target, ["calm", "confident"]);
  choice(state.ui.inputSource, ["demo", "camera"]);
  choice(state.scene.particleType, ["none", "mist", "spark", "soft"]);
  choice(state.expression.status, ["demo", "loading", "ready", "uncertain", "unavailable"]);
  if (typeof state.ui.trackingPaused !== "boolean") throw new TypeError("Invalid pause flag");
  for (const color of [state.scene.auraColor, state.scene.lightColor]) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) throw new TypeError("Invalid scene color");
  }
  state.affect.valence = range(state.affect.valence, -1, 1);
  state.affect.arousal = range(state.affect.arousal, 0, 1);
  state.affect.confidence = range(state.affect.confidence, 0, 1);
  state.gaze.x = range(state.gaze.x, -1, 1); state.gaze.y = range(state.gaze.y, -1, 1);
  state.gaze.confidence = range(state.gaze.confidence, 0, 1);
  state.ui.intensity = range(state.ui.intensity, 0, 1);
  for (const key of ["auraStrength", "lightIntensity", "particleDensity"] as const) state.scene[key] = range(state.scene[key], 0, 1);
  for (const key of ["headYaw", "headPitch", "headRoll"] as const) state.blendshapes[key] = range(state.blendshapes[key], -Math.PI, Math.PI);
  for (const scores of [state.blendshapes.values, state.expression.scores]) {
    for (const key of Object.keys(scores)) scores[key] = range(scores[key], 0, 1);
  }
  state.expression.latencyMs = range(state.expression.latencyMs, 0, 1e9);
  state.expression.updatedAt = range(state.expression.updatedAt, 0, Number.MAX_SAFE_INTEGER);
  return state;
}
