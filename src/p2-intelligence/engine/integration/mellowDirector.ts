import type { MellowStore } from "./mellowBridge";

type Preset = { auraColor: string; lightColor: string; lightWarmth: number; particleType: string; particleDensity: number; musicMood: string; explainReason: string };
/** Uses P5's catalog and Mellow's native units. Coalesces the simulator's individual writes. */
export function connectMellowDirector(store: MellowStore, presets: Record<string, Preset>) {
  let active = true, pending = false;
  function apply() {
    pending = false;
    if (!active) return;
    const { affect, ui } = store.state;
    const strength = Math.max(0, Math.min(1, ui.proteusIntensity));
    const target = ui.targetMood;
    const mode = ui.mode;
    const targetPreset = target === "confident" || target === "joyful" ? "solar-deity" : target === "focused" ? "zen-garden" : "calm-monk";
    const key = ui.personaPrompt.trim().toLowerCase().replace(/\s+/g, "-");
    const requested = Object.hasOwn(presets, key) ? presets[key] : undefined;
    const preset = requested ?? presets[targetPreset];
    const reflecting = mode === "Mirror";
    const usable = affect.confidence > 0 && !ui.trackingPaused;
    const energy = Math.max(0, Math.min(1, (affect.arousal + 1) / 2));
    const neutral = strength === 0 || (reflecting && !usable);
    const colors: Record<string, string> = { calm: "#4ade80", content: "#06b6d4", excited: "#f59e0b", tense: "#ef4444", sad: "#6366f1" };
    const color = neutral ? "#b8b0c0" : reflecting ? colors[affect.label] ?? "#b8b0c0" : preset.auraColor;
    const reason = neutral ? "Neutral atmosphere: no usable expression or strength is zero." : reflecting ?
      `${ui.demoMode ? "Simulated input" : "Expression estimate"}: ${affect.label}; strength ${Math.round(strength * 100)}%.` :
      `${mode}: ${requested ? preset.explainReason : `Selected ${target} target.`}${key && !requested ? " Unknown persona; using target preset." : ""}`;
    const output = {
      auraColor: color, auraIntensity: neutral ? .2 : .2 + strength * (reflecting ? energy * 1.5 : 1.2),
      lightColor: neutral ? "#ddd8e0" : reflecting ? color : preset.lightColor,
      lightWarmth: neutral ? .5 : reflecting ? .5 : preset.lightWarmth,
      lightIntensity: neutral ? .8 : .8 + strength * .8,
      particleType: neutral ? "dust" : reflecting ? affect.label === "sad" ? "rain" : energy > .65 ? "sparks" : "fireflies" : preset.particleType,
      particleDensity: neutral ? 0 : Math.round(strength * (reflecting ? 350 : preset.particleDensity)),
      particleSpeed: neutral ? .3 : .3 + strength * .9, particleColor: color,
      pulseRate: neutral ? .6 : .6 + strength * (reflecting ? energy : .5), targetMood: target, explainReason: reason,
    };
    for (const [key, value] of Object.entries(output)) if (store.state.scene[key] !== value) store.updateState(`scene.${key}`, value);
  }
  function schedule() { if (!pending && active) { pending = true; queueMicrotask(apply); } }
  const off = store.onStateChange("*", (...args) => {
    const path = String(args[0]);
    if (path === "affect" || path.startsWith("affect.") || path === "ui" || path.startsWith("ui.")) schedule();
  });
  schedule();
  return () => { active = false; off(); };
}
