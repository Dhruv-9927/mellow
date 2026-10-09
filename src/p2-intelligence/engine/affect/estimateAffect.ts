import type { AffectLabel, AffectState, BlendshapeState } from "../bridge/types";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function estimateAffect(blendshapes: BlendshapeState, previous: AffectState, alpha = 0.18): AffectState {
  const shape = blendshapes.values;
  const smile = ((shape.mouthSmileLeft ?? 0) + (shape.mouthSmileRight ?? 0)) / 2;
  const frown = ((shape.mouthFrownLeft ?? 0) + (shape.mouthFrownRight ?? 0)) / 2;
  const browDown = ((shape.browDownLeft ?? 0) + (shape.browDownRight ?? 0)) / 2;
  const jaw = shape.jawOpen ?? 0;
  const valence = clamp(smile * 1.5 - frown * 1.25 - browDown * 0.35, -1, 1);
  const arousal = clamp(0.12 + jaw * 0.7 + browDown * 0.4 + smile * 0.18, 0, 1);
  const smoothValence = previous.valence + alpha * (valence - previous.valence);
  const smoothArousal = previous.arousal + alpha * (arousal - previous.arousal);
  const label = labelFor(smoothValence, smoothArousal);
  const confidence = clamp(0.25 + Math.min(smile + frown + browDown + jaw, 1) * 0.55, 0.2, 0.8);
  return { valence: smoothValence, arousal: smoothArousal, label, confidence };
}

function labelFor(valence: number, arousal: number): AffectLabel {
  if (arousal > 0.62 && valence < -0.12) return "tense";
  if (arousal > 0.68 && valence > 0.18) return "excited";
  if (valence < -0.24) return "sad";
  if (arousal < 0.28 && valence < 0.16) return "calm";
  return "content";
}
