import type { AffectState, SceneState, UIState } from "../bridge/types";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function directScene(affect: AffectState, ui: UIState): SceneState {
  const strength = clamp(ui.intensity, 0, 1);
  const neutral: SceneState = { auraColor: "#b8b0c0", auraStrength: 0.12, lightColor: "#ddd8e0", lightIntensity: 0.4,
    particleType: "none", particleDensity: 0, musicMood: "calm", explanation: "Neutral atmosphere: transformation strength is zero." };
  if (strength === 0) return neutral;
  if (ui.mode === "mirror" && (affect.confidence === 0 || ui.trackingPaused)) {
    return { ...neutral, explanation: "Mirror is waiting for a usable expression estimate. You can select Become or Demo." };
  }
  if (ui.mode === "become") {
    if (ui.target === "calm") {
      return {
        auraColor: "#8edbd0", auraStrength: 0.14 + strength * 0.48,
        lightColor: "#c9f0e8", lightIntensity: 0.34 + strength * 0.34,
        particleType: "mist", particleDensity: strength * 0.32,
        musicMood: "calm", explanation: `Become is set to Calm at ${Math.round(strength * 100)}% strength, so the room softens into cool light and slow mist.`,
      };
    }
    return {
      auraColor: "#ffc078", auraStrength: 0.18 + strength * 0.58,
      lightColor: "#ffe0ad", lightIntensity: 0.42 + strength * 0.38,
      particleType: "spark", particleDensity: strength * 0.38,
      musicMood: "excited", explanation: `Become is set to Confident at ${Math.round(strength * 100)}% strength, bringing warmer light and a brighter aura.`,
    };
  }

  const warm = clamp((affect.valence + 1) / 2, 0, 1);
  const color = mixHex("#88a8ff", "#ffc078", warm);
  const labelText = affect.confidence < 0.3 ? "subtle expression cues" : `a ${affect.label} expression estimate`;
  const particles = affect.arousal > 0.66 ? "spark" : affect.arousal < 0.32 ? "mist" : "soft";
  return {
    auraColor: color,
    auraStrength: clamp(0.12 + affect.arousal * 0.58 * strength, 0, 0.8),
    lightColor: mixHex("#b9c8ff", "#ffe2bd", warm),
    lightIntensity: clamp(0.35 + affect.arousal * 0.35, 0.25, 0.8),
    particleType: particles,
    particleDensity: clamp(affect.arousal * 0.48, 0.05, 0.55),
    musicMood: affect.label,
    explanation: `Mirror is responding to ${labelText}; intensity controls how visible the atmosphere shift feels.`,
  };
}

function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const left = parse(a); const right = parse(b);
  return `#${left.map((v, i) => Math.round(v + (right[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}
