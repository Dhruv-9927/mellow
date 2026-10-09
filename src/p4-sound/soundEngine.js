import { state, onStateChange } from '../core/state.js';

/**
 * P4 Sound Manager
 * Handles ambient audio loops with smooth crossfading based on state.affect.label.
 * 
 * Synthesizes dynamic Web Audio ambient harmonic pads so it works out-of-the-box
 * even before external MP3 loops are dropped into /assets/audio/.
 */
export class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.currentMood = 'calm';
    this.gainNode = null;
    this.oscNodes = [];
    this.initialized = false;

    // Mood to frequency map for procedural ambient harmonic generator
    this.moodFrequencies = {
      calm: [174, 218, 261, 327],      // Peaceful F major ambient chord
      content: [196, 246, 294, 392],   // Warm G major chord
      excited: [220, 277, 330, 440],   // Vibrant A major
      tense: [138, 146, 185, 277],     // Dissonant minor second / tritone tension
      sad: [146, 174, 220, 261]        // D minor contemplative chord
    };

    // React automatically when state.affect.label updates
    onStateChange('affect.label', (newMood) => {
      this.playMood(newMood);
    });
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
      this.gainNode.connect(this.audioCtx.destination);
      this.initialized = true;
      console.log('[P4 SoundEngine] Audio context unlocked.');
      this.playMood(state.affect.label || 'calm');
    } catch (e) {
      console.warn('[P4 SoundEngine] Web Audio not allowed until user gesture.', e);
    }
  }

  playMood(label) {
    if (!this.initialized || !this.audioCtx) return;
    if (!this.moodFrequencies[label]) return;
    this.currentMood = label;

    console.log(`[P4 SoundEngine] Crossfading to mood: ${label}`);

    // Fade out previous notes over 1.5 seconds
    const now = this.audioCtx.currentTime;
    this.oscNodes.forEach(({ osc, gain }) => {
      gain.gain.linearRampToValueAtTime(0.001, now + 1.5);
      setTimeout(() => osc.stop(), 1600);
    });
    this.oscNodes = [];

    // Spawn new ambient chord
    const freqs = this.moodFrequencies[label];
    freqs.forEach(freq => {
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();

      osc.type = label === 'tense' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now);

      oscGain.gain.setValueAtTime(0.001, now);
      oscGain.gain.linearRampToValueAtTime(0.04, now + 1.5);

      osc.connect(oscGain);
      oscGain.connect(this.gainNode);
      osc.start(now);

      this.oscNodes.push({ osc, gain: oscGain });
    });
  }

  setVolume(vol) {
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime(vol * 0.2, this.audioCtx.currentTime);
    }
  }
}

export const soundEngine = new SoundEngine();
