import * as THREE from 'three';
import { state } from '../core/state.js';

export class EnvironmentManager {
  constructor(scene) {
    this.scene = scene;
    this.particleCount = 500;
    this.particles = null;
    this.particlePositions = null;
    this.particleVelocities = [];

    // Lighting setup
    this.ambientLight = null;
    this.pointLight = null;
    this.rimLight = null;

    this.setupLighting();
    this.setupParticles();
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0x0f172a, 1.2);
    this.scene.add(this.ambientLight);

    this.pointLight = new THREE.PointLight(0x60a5fa, 2.0, 20);
    this.pointLight.position.set(2, 3, 3);
    this.scene.add(this.pointLight);

    this.rimLight = new THREE.DirectionalLight(0xa855f7, 1.5);
    this.rimLight.position.set(-3, 2, -3);
    this.scene.add(this.rimLight);
  }

  setupParticles() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 12;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12;

      this.particleVelocities.push({
        x: (Math.random() - 0.5) * 0.015,
        y: Math.random() * 0.02 + 0.005,
        z: (Math.random() - 0.5) * 0.015
      });

      colors[i * 3 + 0] = 0.4;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle sprite texture (procedural soft circular glow)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(167, 139, 250, 0.8)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particles = new THREE.Points(geo, mat);
    this.scene.add(this.particles);
  }

  update(delta, elapsedTime) {
    // 1. Smoothly update light color & warmth from state.scene
    const targetLightColor = new THREE.Color(state.scene.lightColor);
    this.pointLight.color.lerp(targetLightColor, 0.05);
    this.ambientLight.intensity = THREE.MathUtils.lerp(
      this.ambientLight.intensity,
      state.scene.lightIntensity,
      0.05
    );

    // Rim light follows aura color
    const auraColor = new THREE.Color(state.scene.auraColor);
    this.rimLight.color.lerp(auraColor, 0.08);

    // 2. Dynamic Particle Updates (Speed & Particle Behavior based on arousal/affect)
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      const speedMultiplier = (state.affect.arousal + 1.2) * 0.8; // High arousal = faster particles
      const pType = state.scene.particleType;

      for (let i = 0; i < this.particleCount; i++) {
        const vel = this.particleVelocities[i];

        if (pType === 'rain') {
          // Falling rain effect
          positions[i * 3 + 1] -= (vel.y * 2.5 + 0.03) * speedMultiplier;
          if (positions[i * 3 + 1] < -4) {
            positions[i * 3 + 1] = 4;
          }
        } else if (pType === 'sparks') {
          // Energetic outward burst
          positions[i * 3 + 0] += vel.x * speedMultiplier * 3.0;
          positions[i * 3 + 1] += vel.y * speedMultiplier * 3.0;
          positions[i * 3 + 2] += vel.z * speedMultiplier * 3.0;
          if (positions[i * 3 + 1] > 4 || Math.abs(positions[i * 3 + 0]) > 6) {
            positions[i * 3 + 0] = (Math.random() - 0.5) * 1.5;
            positions[i * 3 + 1] = -1;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
          }
        } else {
          // Default: Fireflies floating gently
          positions[i * 3 + 0] += Math.sin(elapsedTime * 0.8 + i) * 0.005 * speedMultiplier;
          positions[i * 3 + 1] += Math.cos(elapsedTime * 0.5 + i) * 0.005 * speedMultiplier;
          positions[i * 3 + 2] += Math.sin(elapsedTime * 0.6 + i * 2) * 0.005 * speedMultiplier;
        }
      }

      this.particles.geometry.attributes.position.needsUpdate = true;
      this.particles.material.color.lerp(auraColor, 0.05);
    }
  }
}
