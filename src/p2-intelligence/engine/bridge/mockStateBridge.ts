import type { AppState, DeepPartial, StateBridge, StateListener } from "./types";
import { validateState } from "./validateState";

export const initialState: AppState = {
  expression: { label: "simulated", scores: {}, status: "demo", latencyMs: 0, updatedAt: 0 },
  affect: { valence: 0.12, arousal: 0.24, label: "content", confidence: 0.45 },
  gaze: { x: 0, y: 0, confidence: 0 },
  blendshapes: {
    values: { eyeBlinkLeft: 0.08, eyeBlinkRight: 0.08, jawOpen: 0.04, mouthSmileLeft: 0.12, mouthSmileRight: 0.12 },
    headYaw: 0,
    headPitch: 0,
    headRoll: 0,
  },
  scene: {
    auraColor: "#cf9cff", auraStrength: 0.22, lightColor: "#e7d9ff", lightIntensity: 0.52,
    particleType: "mist", particleDensity: 0.2, musicMood: "content", explanation: "A soft atmosphere is following your expression estimate.",
  },
  ui: { mode: "mirror", target: "calm", intensity: 0.55, trackingPaused: false, inputSource: "demo" },
};

function clone<T>(value: T): T {
  return structuredClone(value);
}

function merge<T extends Record<string, unknown>>(target: T, patch: DeepPartial<T>): T {
  const result = { ...target } as T;
  for (const [key, value] of Object.entries(patch)) {
    if (["__proto__", "constructor", "prototype"].includes(key)) throw new TypeError("Invalid patch key");
    if (value === undefined) continue;
    const current = result[key as keyof T];
    if (value && typeof value === "object" && !Array.isArray(value) && current && typeof current === "object") {
      result[key as keyof T] = merge(current as Record<string, unknown>, value as DeepPartial<Record<string, unknown>>) as T[keyof T];
    } else {
      result[key as keyof T] = value as T[keyof T];
    }
  }
  return result;
}

export class MockStateBridge implements StateBridge {
  private state: AppState;
  private listeners = new Set<StateListener>();

  constructor(seed: AppState = initialState) {
    this.state = validateState(clone(seed));
  }

  read(): Readonly<AppState> {
    return clone(this.state);
  }

  update(patch: DeepPartial<AppState>): void {
    const next = merge(clone(this.state) as unknown as Record<string, unknown>, patch as DeepPartial<Record<string, unknown>>) as unknown as AppState;
    this.state = validateState(next);
    for (const listener of this.listeners) listener(this.read());
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.read());
    return () => this.listeners.delete(listener);
  }
}
