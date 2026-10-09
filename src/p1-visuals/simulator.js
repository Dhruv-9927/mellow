import { state, updateState } from '../core/state.js';

/**
 * P1 Fake Emotion Simulator & Testing Harness
 * Allows all teammates (P2, P3, P4, P5) to test real-time affective loops
 * without waiting for webcam or ML models.
 */
export function initSimulator(container) {
  const panel = document.createElement('div');
  panel.id = 'p1-simulator-panel';
  panel.style.cssText = `
    position: absolute;
    bottom: 20px;
    left: 20px;
    width: 330px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 16px;
    color: #f8fafc;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
    z-index: 1000;
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
      <span style="font-weight:700; font-size:14px; letter-spacing:0.5px; color:#38bdf8;">
        🧪 P1 Emotion Simulator
      </span>
      <span id="sim-status" style="font-size:11px; background:#0284c7; padding:2px 8px; border-radius:999px;">
        Active Demo
      </span>
    </div>

    <!-- Valence Slider -->
    <div style="margin-bottom: 12px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <label>Valence (Pleasure):</label>
        <span id="valence-val" style="font-family:monospace; font-weight:bold; color:#4ade80;">0.00</span>
      </div>
      <input type="range" id="sim-valence" min="-1.0" max="1.0" step="0.05" value="0.0" style="width:100%; accent-color:#4ade80; cursor:pointer;" />
      <div style="display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; margin-top:2px;">
        <span>Unhappy (-1)</span>
        <span>Neutral (0)</span>
        <span>Happy (+1)</span>
      </div>
    </div>

    <!-- Arousal Slider -->
    <div style="margin-bottom: 14px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
        <label>Arousal (Energy):</label>
        <span id="arousal-val" style="font-family:monospace; font-weight:bold; color:#f59e0b;">0.00</span>
      </div>
      <input type="range" id="sim-arousal" min="-1.0" max="1.0" step="0.05" value="0.0" style="width:100%; accent-color:#f59e0b; cursor:pointer;" />
      <div style="display:flex; justify-content:space-between; font-size:10px; color:#94a3b8; margin-top:2px;">
        <span>Sleepy (-1)</span>
        <span>Neutral (0)</span>
        <span>Intense (+1)</span>
      </div>
    </div>

    <!-- Quick Preset Buttons -->
    <div style="margin-bottom: 12px;">
      <div style="font-size:11px; color:#94a3b8; margin-bottom:6px;">Quick Emotion Presets:</div>
      <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
        <button class="preset-btn" data-v="0.8" data-a="-0.3" data-label="calm" style="background:#1e293b; border:1px solid #334155; color:#e2e8f0; padding:4px; border-radius:6px; cursor:pointer; font-size:11px;">🧘 Calm</button>
        <button class="preset-btn" data-v="0.9" data-a="0.8" data-label="excited" style="background:#1e293b; border:1px solid #334155; color:#e2e8f0; padding:4px; border-radius:6px; cursor:pointer; font-size:11px;">⚡ Excited</button>
        <button class="preset-btn" data-v="0.7" data-a="0.1" data-label="content" style="background:#1e293b; border:1px solid #334155; color:#e2e8f0; padding:4px; border-radius:6px; cursor:pointer; font-size:11px;">😊 Content</button>
        <button class="preset-btn" data-v="-0.8" data-a="0.7" data-label="tense" style="background:#1e293b; border:1px solid #334155; color:#e2e8f0; padding:4px; border-radius:6px; cursor:pointer; font-size:11px;">😬 Tense</button>
        <button class="preset-btn" data-v="-0.8" data-a="-0.5" data-label="sad" style="background:#1e293b; border:1px solid #334155; color:#e2e8f0; padding:4px; border-radius:6px; cursor:pointer; font-size:11px;">🌧️ Sad</button>
        <button class="preset-btn" data-v="0.6" data-a="0.4" data-label="confident" style="background:#1e293b; border:1px solid #334155; color:#e2e8f0; padding:4px; border-radius:6px; cursor:pointer; font-size:11px;">🦁 Confident</button>
      </div>
    </div>

    <!-- Procedural Face Motion Sliders -->
    <details style="font-size:11px; color:#cbd5e1; cursor:pointer;">
      <summary style="outline:none; color:#38bdf8;">Toggle Expression & Head Sliders</summary>
      <div style="margin-top:8px; display:flex; flex-direction:column; gap:6px;">
        <div>
          <span>Smile Factor: </span>
          <input type="range" id="sim-smile" min="0" max="1" step="0.05" value="0" style="width:100%;" />
        </div>
        <div>
          <span>Jaw Open: </span>
          <input type="range" id="sim-jaw" min="0" max="1" step="0.05" value="0" style="width:100%;" />
        </div>
        <div>
          <span>Blink: </span>
          <input type="range" id="sim-blink" min="0" max="1" step="0.05" value="0" style="width:100%;" />
        </div>
        <div>
          <span>Head Yaw (Turn): </span>
          <input type="range" id="sim-yaw" min="-0.6" max="0.6" step="0.02" value="0" style="width:100%;" />
        </div>
      </div>
    </details>
  `;

  container.appendChild(panel);

  const valenceInput = panel.querySelector('#sim-valence');
  const arousalInput = panel.querySelector('#sim-arousal');
  const valenceDisplay = panel.querySelector('#valence-val');
  const arousalDisplay = panel.querySelector('#arousal-val');

  function calculateEmotionLabel(v, a) {
    if (v >= 0.2 && a <= 0.2) return 'calm';
    if (v >= 0.3 && a > 0.2) return 'excited';
    if (v >= 0.0 && a <= 0.0) return 'content';
    if (v < 0.0 && a > 0.1) return 'tense';
    return 'sad';
  }

  function applyAffect() {
    const v = parseFloat(valenceInput.value);
    const a = parseFloat(arousalInput.value);
    valenceDisplay.textContent = v.toFixed(2);
    arousalDisplay.textContent = a.toFixed(2);

    const label = calculateEmotionLabel(v, a);

    updateState('affect.valence', v);
    updateState('affect.arousal', a);
    updateState('affect.label', label);

    // Rule-based fallback scene mapping (matches P2 contract)
    updateSceneAtmosphere(v, a, label);
  }

  function updateSceneAtmosphere(v, a, label) {
    // Dynamic aura color: Green/Cyan for calm/content, Gold/Magenta for excited, Red/Purple for tense, Deep Blue for sad
    let auraColor = '#38bdf8';
    let lightColor = '#60a5fa';
    let particleType = 'fireflies';

    if (label === 'calm') {
      auraColor = '#4ade80';
      lightColor = '#86efac';
      particleType = 'fireflies';
    } else if (label === 'excited') {
      auraColor = '#f59e0b';
      lightColor = '#fbbf24';
      particleType = 'sparks';
    } else if (label === 'content') {
      auraColor = '#06b6d4';
      lightColor = '#38bdf8';
      particleType = 'fireflies';
    } else if (label === 'tense') {
      auraColor = '#ef4444';
      lightColor = '#f87171';
      particleType = 'sparks';
    } else if (label === 'sad') {
      auraColor = '#6366f1';
      lightColor = '#4338ca';
      particleType = 'rain';
    }

    const auraIntensity = THREE_lerp(0.3, 1.8, (a + 1.0) / 2.0);

    updateState('scene.auraColor', auraColor);
    updateState('scene.auraIntensity', auraIntensity);
    updateState('scene.lightColor', lightColor);
    updateState('scene.particleType', particleType);
    updateState('scene.explainReason', `Atmosphere shifts toward ${label.toUpperCase()} based on Valence (${v.toFixed(2)}) & Arousal (${a.toFixed(2)})`);
  }

  function THREE_lerp(x, y, t) {
    return x * (1 - t) + y * t;
  }

  valenceInput.addEventListener('input', applyAffect);
  arousalInput.addEventListener('input', applyAffect);

  // Preset buttons
  panel.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const v = parseFloat(btn.dataset.v);
      const a = parseFloat(btn.dataset.a);
      valenceInput.value = v;
      arousalInput.value = a;
      applyAffect();

      // Also set facial expression for preset
      if (v > 0.5) {
        updateState('blendshapes.mouthSmileLeft', 0.7);
        updateState('blendshapes.mouthSmileRight', 0.7);
      } else if (v < -0.3) {
        updateState('blendshapes.mouthFrownLeft', 0.6);
        updateState('blendshapes.mouthFrownRight', 0.6);
      } else {
        updateState('blendshapes.mouthSmileLeft', 0.0);
        updateState('blendshapes.mouthSmileRight', 0.0);
      }
    });
  });

  // Expression sliders
  panel.querySelector('#sim-smile').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    updateState('blendshapes.mouthSmileLeft', val);
    updateState('blendshapes.mouthSmileRight', val);
  });

  panel.querySelector('#sim-jaw').addEventListener('input', (e) => {
    updateState('blendshapes.jawOpen', parseFloat(e.target.value));
  });

  panel.querySelector('#sim-blink').addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    updateState('blendshapes.eyeBlinkLeft', val);
    updateState('blendshapes.eyeBlinkRight', val);
  });

  panel.querySelector('#sim-yaw').addEventListener('input', (e) => {
    updateState('gaze.yaw', parseFloat(e.target.value));
  });

  // Initial trigger
  applyAffect();
}
