import { state, onStateChange } from '../core/state.js';

export class ProteusGraph {
  constructor(container) {
    this.container = container;
    this.history = []; // { time, valence, arousal }
    this.maxPoints = 40;

    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      width: 240px;
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      padding: 12px;
      color: #f8fafc;
      font-family: system-ui, sans-serif;
      font-size: 11px;
      z-index: 900;
    `;

    this.wrapper.innerHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="font-weight:600; color:#38bdf8;">📈 Live Proteus Telemetry</span>
        <span id="graph-mood-badge" style="color:#4ade80; text-transform:uppercase; font-size:10px; font-weight:bold;">CALM</span>
      </div>
      <canvas id="proteus-canvas" width="220" height="90" style="background:#090d16; border-radius:6px; display:block;"></canvas>
      <div style="display:flex; justify-content:space-between; margin-top:6px; color:#94a3b8; font-size:10px;">
        <span style="color:#4ade80;">● Valence (Mood)</span>
        <span style="color:#f59e0b;">● Arousal (Energy)</span>
      </div>
    `;

    this.container.appendChild(this.wrapper);
    this.canvas = this.wrapper.querySelector('#proteus-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.badge = this.wrapper.querySelector('#graph-mood-badge');

    onStateChange('affect.label', (label) => {
      this.badge.textContent = label;
    });
  }

  update() {
    this.history.push({
      valence: state.affect.valence,
      arousal: state.affect.arousal
    });

    if (this.history.length > this.maxPoints) {
      this.history.shift();
    }

    this.render();
  }

  render() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, w, h);

    // Center baseline
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    if (this.history.length < 2) return;

    const step = w / (this.maxPoints - 1);

    // Draw Valence Line (Green)
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.history.forEach((pt, i) => {
      const x = i * step;
      const y = h / 2 - pt.valence * (h / 2.3);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Arousal Line (Amber)
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    this.history.forEach((pt, i) => {
      const x = i * step;
      const y = h / 2 - pt.arousal * (h / 2.3);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}
