/**
 * Proteus Mixed Reality Avatar Engine - Central Reactive Shared State
 * 
 * Every subsystem (P1 3D scene, P2 affective engine, P3 UI panel, P4 sound, P5 presets)
 * reads from and writes to this central state object.
 */

export const state = {
  // P2 Affective & Emotional Telemetry (or P1 Fake Emotion Simulator)
  affect: {
    valence: 0.0,       // -1.0 (unpleasant / sad / tense) to +1.0 (pleasant / joyful / calm)
    arousal: 0.0,       // -1.0 (low energy / sleepy / calm) to +1.0 (high energy / excited / agitated)
    label: 'calm',      // 'calm' | 'content' | 'excited' | 'tense' | 'sad'
    confidence: 1.0,    // 0.0 to 1.0 tracking confidence
    rawValence: 0.0,
    rawArousal: 0.0
  },

  // P2 FaceLandmarker Blendshapes & Facial Action Units (normalized 0.0 - 1.0)
  blendshapes: {
    eyeBlinkLeft: 0.0,
    eyeBlinkRight: 0.0,
    jawOpen: 0.0,
    mouthSmileLeft: 0.0,
    mouthSmileRight: 0.0,
    mouthFrownLeft: 0.0,
    mouthFrownRight: 0.0,
    browInnerUp: 0.0,
    browDownLeft: 0.0,
    browDownRight: 0.0,
    eyeSquintLeft: 0.0,
    eyeSquintRight: 0.0
  },

  // Head pose and gaze tracking
  gaze: {
    pitch: 0.0,         // Head pitch (nodding)
    yaw: 0.0,           // Head yaw (turning left/right)
    roll: 0.0,          // Head roll (tilting)
    irisX: 0.0,         // Normalized iris gaze X (-1 to 1)
    irisY: 0.0          // Normalized iris gaze Y (-1 to 1)
  },

  // P1 3D Scene Dynamics & Environmental Shader Parameters
  scene: {
    // Aura / Fresnel edge glow
    auraColor: '#4ade80',     // Dynamic hex color driven by valence
    auraIntensity: 0.6,       // Strength driven by arousal (0.0 to 2.0)
    pulseRate: 1.2,           // Hz breathing / pulsation rate

    // Ambient & directional room lighting
    lightColor: '#60a5fa',    // Environmental lighting hue
    lightWarmth: 0.5,         // Color temperature factor (0.0 cold -> 1.0 warm)
    lightIntensity: 1.2,      // Light brightness

    // Environmental particle dynamics
    particleType: 'fireflies',// 'fireflies' | 'rain' | 'sparks' | 'crystals' | 'dust'
    particleDensity: 250,     // Total active particle count
    particleSpeed: 1.0,       // Movement delta speed multiplier
    particleColor: '#a78bfa', // Particle tint color

    // Avatar presentation
    avatarScale: 1.0,
    targetMood: 'calm',       // 'calm' | 'confident' | 'joyful' | 'focused'
    explainReason: 'Aura is soft green reflecting relaxed baseline state.'
  },

  // P3 Control Panel UI & Mode settings
  ui: {
    mode: 'Mirror',           // 'Mirror' (reflect user) | 'Proteus' (nudge mood) | 'Become' | 'Mask'
    targetMood: 'calm',       // 'calm' | 'confident' | 'joyful' | 'focused'
    proteusIntensity: 0.7,    // Transformation strength 0.0 - 1.0
    personaPrompt: '',        // e.g. "forest spirit", "cyberpunk neon monk"
    trackingPaused: false,    // Privacy toggle
    demoMode: true,           // If true, using P1 emotion slider simulator
    audioMuted: false,
    audioVolume: 0.8,
    activeAvatarId: 'avatar1'
  },

  // Proteus feedback history for live graph and telemetry
  history: []
};

// --- Reactive Listener System ---
const listeners = new Map();

/**
 * Subscribe to changes on a specific state path (e.g. 'affect.label', 'scene.auraColor', or '*' for all)
 */
export function onStateChange(path, callback) {
  if (!listeners.has(path)) {
    listeners.set(path, new Set());
  }
  listeners.get(path).add(callback);
  return () => offStateChange(path, callback);
}

export function offStateChange(path, callback) {
  const set = listeners.get(path);
  if (set) {
    set.delete(callback);
  }
}

/**
 * Safely update nested state and notify listeners
 * Example: updateState('affect.valence', 0.8) or updateState('scene.auraIntensity', 1.5)
 */
export function updateState(path, value) {
  const keys = path.split('.');
  let current = state;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  const lastKey = keys[keys.length - 1];
  const oldVal = current[lastKey];
  current[lastKey] = value;

  // Trigger path-specific listeners
  if (listeners.has(path)) {
    listeners.get(path).forEach(fn => fn(value, oldVal, path, state));
  }

  // Trigger parent namespace listeners (e.g. 'affect')
  if (keys.length > 1) {
    const parentPath = keys[0];
    if (listeners.has(parentPath)) {
      listeners.get(parentPath).forEach(fn => fn(current, path, state));
    }
  }

  // Trigger wildcard listeners
  if (listeners.has('*')) {
    listeners.get('*').forEach(fn => fn(path, value, state));
  }
}

// Add state to global window object for easy debugging in developer console
if (typeof window !== 'undefined') {
  window.__PROTEUS_STATE__ = state;
  window.__updateState__ = updateState;
  window.__onStateChange__ = onStateChange;
}
