import type { BlendshapeState } from "../bridge/types";

/** Optional motion baseline. Does not change classifier pixels or scores. */
export class NeutralCalibration {
  private startTime = 0;
  private samples: BlendshapeState[] = [];
  private baseline?: BlendshapeState;
  status: "idle" | "collecting" | "ready" = "idle";
  begin(now: number) { this.startTime = now; this.samples = []; this.status = "collecting"; }
  interrupt(now: number) { if (this.status === "collecting") this.begin(now); }
  reset() { this.status = "idle"; this.samples = []; this.baseline = undefined; }
  observe(sample: BlendshapeState, now: number) {
    if (this.status !== "collecting") return;
    this.samples.push(structuredClone(sample));
    if (now - this.startTime < 3000 || this.samples.length < 20) return;
    const mean = (get: (s: BlendshapeState) => number) => this.samples.reduce((sum, s) => sum + get(s), 0) / this.samples.length;
    this.baseline = {
      values: Object.fromEntries(Object.keys(sample.values).map(key => [key, mean(s => s.values[key] ?? 0)])),
      headYaw: mean(s => s.headYaw), headPitch: mean(s => s.headPitch), headRoll: mean(s => s.headRoll),
    };
    this.status = "ready"; this.samples = [];
  }
  apply(sample: BlendshapeState): BlendshapeState {
    const baseline = this.baseline;
    if (!baseline) return sample;
    return {
      values: Object.fromEntries(Object.entries(sample.values).map(([key, value]) => [key, Math.max(0, Math.min(1, value - (baseline.values[key] ?? 0)))])),
      headYaw: sample.headYaw - baseline.headYaw,
      headPitch: sample.headPitch - baseline.headPitch,
      headRoll: sample.headRoll - baseline.headRoll,
    };
  }
}
