import type { SceneState } from "../bridge/types";

export const personas = {
  "forest spirit": { color: "#82cfa6", particle: "mist", mood: "calm" },
  "calm monk": { color: "#dfc79f", particle: "soft", mood: "calm" },
  "solar guardian": { color: "#ffc078", particle: "spark", mood: "excited" },
  "ocean dreamer": { color: "#7bcadf", particle: "mist", mood: "calm" },
  "starlight explorer": { color: "#bca5ed", particle: "spark", mood: "content" },
  "joyful dancer": { color: "#eea7bc", particle: "soft", mood: "excited" },
  "focused scholar": { color: "#a7b8d2", particle: "none", mood: "content" },
  "gentle companion": { color: "#e8bfaa", particle: "soft", mood: "content" },
} as const;

/** Deterministic preset lookup; unknown prompts have an explicit fallback. */
export function resolvePersona(prompt: string, intensity = 0.55) {
  const key = prompt.trim().toLowerCase().replace(/\s+/g, " ");
  const matched = Object.hasOwn(personas, key);
  const name = matched ? key as keyof typeof personas : "forest spirit";
  const preset = personas[name];
  const strength = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0.55;
  const scene: SceneState = {
    auraColor: strength ? preset.color : "#b8b0c0", auraStrength: 0.12 + strength * 0.5,
    lightColor: strength ? preset.color : "#ddd8e0", lightIntensity: 0.4 + strength * 0.3,
    particleType: strength ? preset.particle : "none", particleDensity: preset.particle === "none" ? 0 : strength * 0.3,
    musicMood: preset.mood,
    explanation: matched ? `You selected the ${name} preset at ${Math.round(strength * 100)}% strength.` : "Unknown persona: using the forest spirit preset.",
  };
  return { name, matched, scene };
}
