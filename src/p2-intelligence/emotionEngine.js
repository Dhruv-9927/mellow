import { state, updateState, onStateChange } from '../core/state.js';
import { PERSONA_PRESETS } from '../p5-content/personas.js';
import { MellowBridge } from './engine/integration/mellowBridge';
import { connectMellowDirector } from './engine/integration/mellowDirector';
import { LocalPersonaDirector } from './engine/director/localPersona';
import { ReplayInput } from './engine/input/replayInput';

/**
 * P2 facade preserving the repo's existing EmotionEngine API.
 * init() wires state only; camera permission requires explicit startCamera().
 */
export class EmotionEngine {
  constructor() {
    this.bridge = null;
    this.tracker = null;
    this.trackingActive = false;
    this.disposed = false;
    this.generation = 0;
    this.cleanups = [];
    this.lastStatus = 'Camera off';
    this.modelStatus = 'Not loaded';
    this.presets = { ...PERSONA_PRESETS };
    this.personaGeneration = 0;
  }
  get isCalibrated() { return this.tracker?.calibration.status === 'ready'; }
  init() {
    if (this.bridge) return this;
    this.disposed = false;
    const store = { state, updateState, onStateChange };
    this.bridge = new MellowBridge(store);
    this.cleanups.push(connectMellowDirector(store, this.presets));
    this.cleanups.push(onStateChange('ui.personaPrompt', () => { void this.generatePersona(); }));
    this.cleanups.push(onStateChange('ui.trackingPaused', paused => {
      if (this.tracker && this.paused !== paused) {
        this.paused = paused; this.tracker.pause(paused);
        this.trackingActive = !paused && !state.ui.demoMode;
      }
    }));
    this.cleanups.push(onStateChange('ui.demoMode', demo => {
      if (demo && this.tracker && !this.starting && !this.stopping) this.stopCamera();
    }));
    return this;
  }
  async startCamera(videoElement) {
    this.init();
    this.replay?.stop();
    const generation = ++this.generation;
    const { CameraTracker } = await import('./engine/input/cameraTracker');
    if (generation !== this.generation || this.disposed) return;
    if (!this.tracker) this.tracker = new CameraTracker(this.bridge,
      message => {
        this.lastStatus = message;
        this.trackingActive = !state.ui.demoMode && !state.ui.trackingPaused;
      },
      message => { this.modelStatus = message; });
    this.video = videoElement ?? this.video ?? document.createElement('video');
    this.video.muted = true; this.video.playsInline = true;
    this.trackingActive = false;
    this.starting = true;
    const pending = this.tracker.start(this.video);
    this.starting = false;
    try { await pending; }
    finally { this.trackingActive = !state.ui.demoMode && !state.ui.trackingPaused; }
  }
  pauseCamera() { this.init(); updateState('ui.trackingPaused', true); }
  resumeCamera() { this.init(); updateState('ui.trackingPaused', false); }
  calibrate() { if (!this.tracker) throw new Error('Start camera first'); this.tracker.calibrate(); }
  applyPersona(prompt) { this.init(); updateState('ui.personaPrompt', String(prompt).slice(0, 200)); }
  configureLocalDirector(options) {
    this.localDirector?.cancel(); this.personaGeneration++;
    this.localDirector = options ? new LocalPersonaDirector(options) : null;
  }
  async generatePersona() {
    const generation = ++this.personaGeneration;
    const prompt = state.ui.personaPrompt.trim();
    this.localDirector?.cancel();
    if (!this.localDirector || !prompt) return false;
    const proposal = await this.localDirector.propose(prompt);
    if (!proposal || generation !== this.personaGeneration || this.disposed || prompt !== state.ui.personaPrompt.trim()) return false;
    const key = prompt.toLowerCase().replace(/\s+/g, '-');
    if (['__proto__', 'constructor', 'prototype'].includes(key)) return false;
    this.presets[key] = proposal;
    // Refresh scene selection without retriggering text generation.
    updateState('ui.proteusIntensity', state.ui.proteusIntensity);
    return true;
  }
  startReplay() {
    this.init(); this.stopCamera(); this.replay?.stop();
    this.replay = new ReplayInput(this.bridge); this.replay.start();
  }
  stopReplay() { this.replay?.stop(); }
  stopCamera() {
    this.replay?.stop();
    this.generation++;
    if (this.stopping) return;
    this.stopping = true;
    try { this.tracker?.stop(); this.trackingActive = false; }
    finally { this.stopping = false; }
  }
  dispose() {
    this.replay?.stop(); this.localDirector?.cancel(); this.personaGeneration++;
    this.stopCamera();
    this.cleanups.splice(0).forEach(off => off());
    this.bridge?.dispose(); this.bridge = null; this.tracker = null;
    this.video = null; this.disposed = true;
  }
}
export const emotionEngine = new EmotionEngine();
