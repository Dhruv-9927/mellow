import * as THREE from 'three';
import { state, updateState, onStateChange } from './core/state.js';
import { AvatarManager } from './p1-visuals/avatar.js';
import { EnvironmentManager } from './p1-visuals/environment.js';
import { initSimulator } from './p1-visuals/simulator.js';
import { ProteusGraph } from './p1-visuals/proteusGraph.js';
import { mountControlPanel } from './p3-control-panel/controlPanel.js';
import { soundEngine } from './p4-sound/soundEngine.js';

class ProteusApp {
  constructor() {
    this.container = document.getElementById('app');
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.avatarManager = null;
    this.envManager = null;
    this.proteusGraph = null;
    this.clock = new THREE.Clock();

    this.initThree();
    this.initComponents();
    this.setupUIBindings();
    this.animate();
  }

  initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913);
    this.scene.fog = new THREE.FogExp2(0x060913, 0.08);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, 3.5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.xr.enabled = true; // WebXR ready
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Gentle camera orbit or interaction
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };
    window.addEventListener('mousedown', (e) => {
      if (e.target.tagName !== 'CANVAS') return;
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => isDragging = false);
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMousePos.x;
      const dy = e.clientY - prevMousePos.y;
      prevMousePos = { x: e.clientX, y: e.clientY };

      this.avatarManager.avatarGroup.rotation.y += dx * 0.008;
      this.avatarManager.avatarGroup.rotation.x += dy * 0.008;
    });
  }

  initComponents() {
    // 1. Avatar with emotional shaders & blendshapes
    this.avatarManager = new AvatarManager(this.scene);

    // 2. Room lighting and reactive particle system
    this.envManager = new EnvironmentManager(this.scene);

    // 3. P1 Fake Emotion Simulator (Allows everyone to test without camera)
    initSimulator(this.container);

    // 4. Live Proteus Telemetry Graph
    this.proteusGraph = new ProteusGraph(this.container);

    // 5. Mount P3 Control Panel (modularly isolated)
    mountControlPanel(this.container);

    // Unlock Web Audio on first user interaction
    window.addEventListener('click', () => soundEngine.init(), { once: true });
  }

  setupUIBindings() {
    // Connect WebXR AR Session button if available
    const xrBtn = document.getElementById('xr-button');
    if (xrBtn && navigator.xr) {
      navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        if (supported) {
          xrBtn.style.display = 'block';
          xrBtn.addEventListener('click', async () => {
            const session = await navigator.xr.requestSession('immersive-ar');
            this.renderer.xr.setSession(session);
          });
        }
      });
    }

    // Connect top banner info update
    const whyChangeText = document.getElementById('why-change-text');
    onStateChange('scene.explainReason', (reason) => {
      if (whyChangeText) whyChangeText.textContent = reason;
    });
  }

  animate() {
    this.renderer.setAnimationLoop(() => {
      const delta = this.clock.getDelta();
      const elapsedTime = this.clock.getElapsedTime();

      // Update avatar blendshapes & gaze
      this.avatarManager.update(delta, elapsedTime);

      // Update room lighting & particle systems
      this.envManager.update(delta, elapsedTime);

      // Update Proteus graph telemetry periodically
      if (Math.floor(elapsedTime * 15) % 3 === 0) {
        this.proteusGraph.update();
      }

      this.renderer.render(this.scene, this.camera);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ProteusApp();
});
