import type { AppState, DeepPartial, StateBridge, StateListener } from "../bridge/types";
import { MockStateBridge } from "../bridge/mockStateBridge";

export interface MellowState {
  affect: { valence: number; arousal: number; label: string; confidence: number; rawValence: number; rawArousal: number };
  blendshapes: Record<string, number>;
  gaze: { pitch: number; yaw: number; roll: number; irisX: number; irisY: number };
  scene: Record<string, string | number>;
  ui: { mode: string; targetMood: string; proteusIntensity: number; personaPrompt: string; trackingPaused: boolean; demoMode: boolean };
}
export interface MellowStore {
  state: MellowState;
  updateState(path: string, value: unknown): void;
  onStateChange(path: string, callback: (...args: unknown[]) => void): () => void;
}
const moods = ["calm", "content", "excited", "tense", "sad"];
const unit = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

/** Translating boundary: external Mellow units never leak into inference code. */
export class MellowBridge implements StateBridge {
  private local = new MockStateBridge();
  private listeners = new Set<StateListener>();
  private writing = false;
  private unsubscribe: () => void;
  constructor(private store: MellowStore) {
    this.unsubscribe = store.onStateChange("*", () => { if (!this.writing) this.emit(); });
  }
  read(): Readonly<AppState> {
    const result = this.local.read() as AppState;
    const s = this.store.state;
    result.affect = { valence: Math.max(-1, Math.min(1, s.affect.valence)), arousal: unit((s.affect.arousal + 1) / 2),
      label: (moods.includes(s.affect.label) ? s.affect.label : "content") as AppState["affect"]["label"], confidence: unit(s.affect.confidence) };
    result.blendshapes = { values: { ...s.blendshapes }, headYaw: s.gaze.yaw, headPitch: s.gaze.pitch, headRoll: s.gaze.roll };
    result.gaze = { x: s.gaze.irisX, y: s.gaze.irisY, confidence: result.gaze.confidence };
    result.ui = { mode: s.ui.mode === "Mirror" ? "mirror" : "become", target: ["confident", "joyful"].includes(s.ui.targetMood) ? "confident" : "calm",
      intensity: unit(s.ui.proteusIntensity), trackingPaused: s.ui.trackingPaused, inputSource: s.ui.demoMode ? "demo" : "camera" };
    result.scene = {
      auraColor: String(s.scene.auraColor), auraStrength: unit(Number(s.scene.auraIntensity) / 2),
      lightColor: String(s.scene.lightColor), lightIntensity: unit(Number(s.scene.lightIntensity) / 2),
      particleType: Number(s.scene.particleDensity) === 0 ? "none" : s.scene.particleType === "sparks" ? "spark" : s.scene.particleType === "fireflies" ? "mist" : "soft",
      particleDensity: unit(Number(s.scene.particleDensity) / 500), musicMood: result.affect.label,
      explanation: String(s.scene.explainReason),
    };
    return result;
  }
  update(patch: DeepPartial<AppState>) {
    // Seed from external UI/telemetry so a partial patch cannot resurrect stale local fields.
    const candidate = new MockStateBridge(this.read() as AppState);
    candidate.update(patch);
    const next = candidate.read();
    this.local = candidate;
    const write = (path: string, value: unknown) => {
      const [group, key] = path.split('.');
      const current = (this.store.state as unknown as Record<string, Record<string, unknown>>)[group]?.[key];
      if (current !== value) this.store.updateState(path, value);
    };
    this.writing = true;
    try {
      if (patch.affect) for (const key of Object.keys(patch.affect) as Array<keyof AppState["affect"]>) {
        write(`affect.${key}`, key === "arousal" ? next.affect.arousal * 2 - 1 : next.affect[key]);
      }
      if (patch.affect?.valence !== undefined) write("affect.rawValence", next.affect.valence);
      if (patch.affect?.arousal !== undefined) write("affect.rawArousal", next.affect.arousal * 2 - 1);
      if (patch.blendshapes?.values) for (const key of Object.keys(patch.blendshapes.values)) write(`blendshapes.${key}`, next.blendshapes.values[key]);
      for (const [source, target] of [["headYaw", "yaw"], ["headPitch", "pitch"], ["headRoll", "roll"]] as const) {
        if (patch.blendshapes?.[source] !== undefined) write(`gaze.${target}`, next.blendshapes[source]);
      }
      if (patch.gaze?.x !== undefined) write("gaze.irisX", next.gaze.x);
      if (patch.gaze?.y !== undefined) write("gaze.irisY", next.gaze.y);
      if (patch.ui?.inputSource !== undefined) write("ui.demoMode", next.ui.inputSource === "demo");
      if (patch.ui?.trackingPaused !== undefined) write("ui.trackingPaused", next.ui.trackingPaused);
      if (patch.ui?.intensity !== undefined) write("ui.proteusIntensity", next.ui.intensity);
      if (patch.ui?.mode !== undefined) write("ui.mode", next.ui.mode === "mirror" ? "Mirror" : "Become");
      if (patch.ui?.target !== undefined) write("ui.targetMood", next.ui.target);
      if (patch.scene) {
        const s = next.scene;
        const scene = { auraColor: s.auraColor, auraIntensity: s.auraStrength * 2, lightColor: s.lightColor,
          lightIntensity: s.lightIntensity * 2, particleType: { none: "dust", mist: "fireflies", spark: "sparks", soft: "dust" }[s.particleType],
          particleDensity: s.particleType === "none" ? 0 : Math.round(s.particleDensity * 500), explainReason: s.explanation };
        for (const [key, value] of Object.entries(scene)) write(`scene.${key}`, value);
      }
    } finally { this.writing = false; }
    this.emit();
  }
  subscribe(listener: StateListener) { this.listeners.add(listener); listener(this.read()); return () => { this.listeners.delete(listener); }; }
  dispose() { this.unsubscribe(); this.listeners.clear(); }
  private emit() { for (const listener of this.listeners) listener(this.read()); }
}
