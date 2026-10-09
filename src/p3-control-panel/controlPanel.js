import { state, updateState, onStateChange } from '../core/state.js';

/**
 * P3 Control Panel Component
 * Mounts interactive overlay with Mode buttons, Intensity slider, Target Mood, and Persona generation.
 */
export function mountControlPanel(container) {
  const panel = document.createElement('div');
  panel.id = 'p3-control-panel';
  panel.style.cssText = `
    position: absolute;
    top: 80px;
    right: 20px;
    width: 290px;
    background: rgba(15, 23, 42, 0.88);
    backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 12px;
    padding: 18px;
    color: #f8fafc;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 13px;
    box-shadow: 0 16px 30px rgba(0,0,0,0.4);
    z-index: 1000;
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:8px;">
      <span style="font-weight:700; font-size:14px; color:#38bdf8;">🎛️ Control Panel</span>
      <span id="panel-mood-display" style="font-size:11px; font-weight:600; text-transform:uppercase; background:#0284c7; padding:2px 8px; border-radius:999px;">CALM</span>
    </div>

    <!-- Mode Selector -->
    <div style="margin-bottom:14px;">
      <div style="font-size:11px; color:#94a3b8; margin-bottom:6px;">MODE</div>
      <div style="display:flex; gap:6px;">
        <button class="mode-btn active" data-mode="Mirror" style="flex:1; padding:6px; font-size:12px; background:#0284c7; border:none; color:white; border-radius:6px; cursor:pointer;">Mirror</button>
        <button class="mode-btn" data-mode="Proteus" style="flex:1; padding:6px; font-size:12px; background:#1e293b; border:1px solid #334155; color:#e2e8f0; border-radius:6px; cursor:pointer;">Proteus</button>
        <button class="mode-btn" data-mode="Mask" style="flex:1; padding:6px; font-size:12px; background:#1e293b; border:1px solid #334155; color:#e2e8f0; border-radius:6px; cursor:pointer;">Mask</button>
      </div>
    </div>

    <!-- Target Emotion Dropdown -->
    <div style="margin-bottom:14px;">
      <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">TARGET EMOTION</label>
      <select id="target-mood-select" style="width:100%; background:#1e293b; border:1px solid #334155; color:#f8fafc; padding:6px 10px; border-radius:6px; font-size:12px; outline:none;">
        <option value="calm">🧘 Calm</option>
        <option value="confident">🦁 Confident</option>
        <option value="joyful">✨ Joyful</option>
        <option value="focused">🎯 Focused</option>
      </select>
    </div>

    <!-- Transformation Intensity Slider -->
    <div style="margin-bottom:14px;">
      <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px;">
        <span style="color:#94a3b8;">TRANSFORMATION STRENGTH</span>
        <span id="intensity-val" style="font-weight:600; color:#38bdf8;">70%</span>
      </div>
      <input type="range" id="intensity-slider" min="0" max="100" value="70" style="width:100%; accent-color:#38bdf8; cursor:pointer;" />
    </div>

    <!-- Persona Generator -->
    <div style="margin-bottom:14px;">
      <label style="font-size:11px; color:#94a3b8; display:block; margin-bottom:4px;">AI PERSONA GENERATOR</label>
      <div style="display:flex; gap:6px;">
        <input type="text" id="persona-input" placeholder="e.g. Forest spirit, Cyberpunk" style="flex:1; background:#1e293b; border:1px solid #334155; color:#f8fafc; padding:6px 8px; border-radius:6px; font-size:12px;" />
        <button id="persona-generate-btn" style="background:#0284c7; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:12px; cursor:pointer;">Apply</button>
      </div>
    </div>

    <!-- Privacy section -->
    <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
      <span style="font-size:10px; color:#64748b;">🔒 On-device only</span>
      <button id="toggle-tracking-btn" style="background:transparent; border:1px solid #475569; color:#94a3b8; font-size:10px; padding:3px 8px; border-radius:4px; cursor:pointer;">Pause Cam</button>
    </div>
  `;

  container.appendChild(panel);

  // Wire events to state.ui
  const modeBtns = panel.querySelectorAll('.mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => {
        b.style.background = '#1e293b';
        b.style.border = '1px solid #334155';
        b.style.color = '#e2e8f0';
      });
      btn.style.background = '#0284c7';
      btn.style.border = 'none';
      btn.style.color = 'white';
      updateState('ui.mode', btn.dataset.mode);
      console.log(`[P3 UI] Mode set to: ${btn.dataset.mode}`);
    });
  });

  const moodSelect = panel.querySelector('#target-mood-select');
  moodSelect.addEventListener('change', (e) => {
    updateState('ui.targetMood', e.target.value);
    console.log(`[P3 UI] Target mood set to: ${e.target.value}`);
  });

  const slider = panel.querySelector('#intensity-slider');
  const sliderVal = panel.querySelector('#intensity-val');
  slider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    sliderVal.textContent = `${val}%`;
    updateState('ui.proteusIntensity', val / 100);
  });

  const personaBtn = panel.querySelector('#persona-generate-btn');
  const personaInput = panel.querySelector('#persona-input');
  personaBtn.addEventListener('click', () => {
    const text = personaInput.value.trim();
    if (text) {
      updateState('ui.personaPrompt', text);
      console.log(`[P3 UI] Persona requested: ${text}`);
      updateState('scene.explainReason', `Generating aesthetic persona: "${text}"`);
    }
  });

  const trackBtn = panel.querySelector('#toggle-tracking-btn');
  let paused = false;
  trackBtn.addEventListener('click', () => {
    paused = !paused;
    trackBtn.textContent = paused ? 'Resume Cam' : 'Pause Cam';
    trackBtn.style.color = paused ? '#f87171' : '#94a3b8';
    updateState('ui.trackingPaused', paused);
  });

  // Keep mood badge in sync with state.affect.label
  const moodDisplay = panel.querySelector('#panel-mood-display');
  onStateChange('affect.label', (label) => {
    if (moodDisplay) moodDisplay.textContent = label;
  });
}
