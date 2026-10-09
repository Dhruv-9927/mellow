import type { StateBridge } from "../bridge/types";

export class DemoInput {
  constructor(private bridge: StateBridge) {}

  setExpression(valence: number, arousal: number): void {
    const values = {
      mouthSmileLeft: Math.max(0, valence) * 0.7,
      mouthSmileRight: Math.max(0, valence) * 0.7,
      mouthFrownLeft: Math.max(0, -valence) * 0.55,
      mouthFrownRight: Math.max(0, -valence) * 0.55,
      browDownLeft: arousal > 0.6 ? (arousal - 0.6) * 0.7 : 0.05,
      browDownRight: arousal > 0.6 ? (arousal - 0.6) * 0.7 : 0.05,
      jawOpen: Math.max(0, (arousal - 0.35) * 0.55),
      eyeBlinkLeft: 0.06,
      eyeBlinkRight: 0.06,
    };
    this.bridge.update({
      expression: { label: "simulated", status: "demo", updatedAt: Date.now() },
      ui: { inputSource: "demo" },
      blendshapes: { values },
      affect: {
        valence,
        arousal,
        label: labelFor(valence, arousal),
        confidence: 0.62,
      },
    });
  }
}

function labelFor(valence: number, arousal: number): "calm" | "content" | "excited" | "tense" | "sad" {
  if (arousal > 0.66 && valence < -0.12) return "tense";
  if (arousal > 0.68 && valence > 0.18) return "excited";
  if (valence < -0.24) return "sad";
  if (arousal < 0.28 && valence < 0.16) return "calm";
  return "content";
}
