import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { state, onStateChange, updateState } from '../core/state.js';

/**
 * Procedural Avatar Mesh with full Facial Action Units / Blendshapes
 * Also supports loading external GLB / VRM files delivered by P5.
 */
export class AvatarManager {
  constructor(scene) {
    this.scene = scene;
    this.avatarGroup = new THREE.Group();
    this.avatarGroup.position.set(0, 0, 0);
    this.scene.add(this.avatarGroup);

    this.loader = new GLTFLoader();
    this.loadedModel = null;
    this.morphMeshes = [];

    this.headMesh = null;
    this.eyesMesh = [];
    this.mouthMesh = null;
    this.auraMesh = null;
    this.customUniforms = null;

    // Smoothed target values to prevent jumpy transitions
    this.currentGaze = { pitch: 0, yaw: 0, roll: 0 };
    this.currentBlendshapes = {
      jawOpen: 0,
      mouthSmileLeft: 0,
      mouthSmileRight: 0,
      eyeBlinkLeft: 0,
      eyeBlinkRight: 0
    };

    this.buildProceduralAvatar();
  }

  buildProceduralAvatar() {
    // 1. Head Core
    const headGeo = new THREE.SphereGeometry(1.0, 64, 64);
    
    // Emotion-reactive Shader Material with Fresnel Aura and dynamic hue
    this.customUniforms = {
      uTime: { value: 0 },
      uAuraColor: { value: new THREE.Color(state.scene.auraColor) },
      uAuraIntensity: { value: state.scene.auraIntensity },
      uValence: { value: state.affect.valence },
      uArousal: { value: state.affect.arousal },
      uBaseColor: { value: new THREE.Color('#38bdf8') }
    };

    const avatarVertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;
      
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vPosition = position;
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const avatarFragmentShader = `
      uniform float uTime;
      uniform vec3 uAuraColor;
      uniform float uAuraIntensity;
      uniform float uValence;
      uniform float uArousal;
      uniform vec3 uBaseColor;
      
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vViewPosition;

      void main() {
        // Fresnel calculation: 1.0 at outer grazing angles, 0.0 at center
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
        fresnel = pow(fresnel, 2.5);

        // Dynamic pulsing aura based on arousal
        float pulse = 1.0 + 0.3 * sin(uTime * (2.0 + uArousal * 3.0));
        vec3 aura = uAuraColor * fresnel * uAuraIntensity * pulse * 2.2;

        // Base metallic futuristic skin with soft lighting
        vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0));
        float diff = max(dot(normal, lightDir), 0.0) * 0.7 + 0.3;
        vec3 skinTone = mix(uBaseColor, uAuraColor, 0.25 * (uValence * 0.5 + 0.5));

        vec3 finalColor = skinTone * diff + aura;
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const headMat = new THREE.ShaderMaterial({
      vertexShader: avatarVertexShader,
      fragmentShader: avatarFragmentShader,
      uniforms: this.customUniforms,
      roughness: 0.3,
      metalness: 0.8
    });

    this.headMesh = new THREE.Mesh(headGeo, headMat);
    this.avatarGroup.add(this.headMesh);

    // 2. Eyes (Left and Right)
    const eyeGeo = new THREE.SphereGeometry(0.18, 32, 32);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.4
    });

    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.position.set(-0.35, 0.2, 0.88);
    this.headMesh.add(this.leftEye);

    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat.clone());
    this.rightEye.position.set(0.35, 0.2, 0.88);
    this.headMesh.add(this.rightEye);

    // Irises / Pupils that track gaze
    const irisGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const irisMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.leftIris = new THREE.Mesh(irisGeo, irisMat);
    this.leftIris.position.set(0, 0, 0.12);
    this.leftEye.add(this.leftIris);

    this.rightIris = new THREE.Mesh(irisGeo, irisMat.clone());
    this.rightIris.position.set(0, 0, 0.12);
    this.rightEye.add(this.rightIris);

    // 3. Mouth with morphable blendshapes
    const mouthGeo = new THREE.TorusGeometry(0.25, 0.04, 16, 32, Math.PI);
    const mouthMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.3,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.5
    });
    this.mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
    this.mouthMesh.position.set(0, -0.35, 0.92);
    this.mouthMesh.rotation.z = Math.PI; // default curve
    this.headMesh.add(this.mouthMesh);

    // 4. Subtle Outer Energy Halo / Aura Bubble
    const haloGeo = new THREE.SphereGeometry(1.25, 32, 32);
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uAuraColor;
        uniform float uAuraIntensity;
        varying vec3 vNormal;
        void main() {
          float edge = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          gl_FragColor = vec4(uAuraColor, edge * uAuraIntensity * 0.4);
        }
      `,
      uniforms: {
        uAuraColor: this.customUniforms.uAuraColor,
        uAuraIntensity: this.customUniforms.uAuraIntensity
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.haloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.headMesh.add(this.haloMesh);
  }

  update(delta, elapsedTime) {
    if (!this.headMesh) return;

    // Smooth head movement towards state.gaze
    const targetPitch = state.gaze.pitch;
    const targetYaw = state.gaze.yaw;
    const targetRoll = state.gaze.roll;

    this.currentGaze.pitch += (targetPitch - this.currentGaze.pitch) * 0.12;
    this.currentGaze.yaw += (targetYaw - this.currentGaze.yaw) * 0.12;
    this.currentGaze.roll += (targetRoll - this.currentGaze.roll) * 0.12;

    this.headMesh.rotation.x = this.currentGaze.pitch;
    this.headMesh.rotation.y = this.currentGaze.yaw;
    this.headMesh.rotation.z = this.currentGaze.roll;

    // Iris gaze shift
    const irisTargetX = (state.gaze.irisX || 0) * 0.05;
    const irisTargetY = (state.gaze.irisY || 0) * 0.05;
    this.leftIris.position.x = irisTargetX;
    this.leftIris.position.y = irisTargetY;
    this.rightIris.position.x = irisTargetX;
    this.rightIris.position.y = irisTargetY;

    // Smooth blendshape animations (jawOpen, smile, blink)
    const blend = state.blendshapes;
    this.currentBlendshapes.jawOpen += (blend.jawOpen - this.currentBlendshapes.jawOpen) * 0.2;
    this.currentBlendshapes.mouthSmileLeft += (blend.mouthSmileLeft - this.currentBlendshapes.mouthSmileLeft) * 0.15;
    this.currentBlendshapes.eyeBlinkLeft += (blend.eyeBlinkLeft - this.currentBlendshapes.eyeBlinkLeft) * 0.3;
    this.currentBlendshapes.eyeBlinkRight += (blend.eyeBlinkRight - this.currentBlendshapes.eyeBlinkRight) * 0.3;

    // Jaw opening modifies mouth Y position and scale
    this.mouthMesh.position.y = -0.35 - this.currentBlendshapes.jawOpen * 0.22;
    
    // Smile modifies mouth rotation and curve:
    // Smile (high) curves upwards; frown (low) curves downwards
    const smileAvg = (blend.mouthSmileLeft + blend.mouthSmileRight) * 0.5;
    const frownAvg = (blend.mouthFrownLeft + blend.mouthFrownRight) * 0.5;
    const smileFactor = smileAvg - frownAvg; // -1 to 1
    this.mouthMesh.rotation.z = Math.PI - smileFactor * 0.6;
    this.mouthMesh.scale.x = 1.0 + smileAvg * 0.4;

    // Eye blinking
    const leftScaleY = Math.max(0.08, 1.0 - this.currentBlendshapes.eyeBlinkLeft);
    const rightScaleY = Math.max(0.08, 1.0 - this.currentBlendshapes.eyeBlinkRight);
    this.leftEye.scale.y = leftScaleY;
    this.rightEye.scale.y = rightScaleY;

    // Update shader uniforms
    if (this.customUniforms) {
      this.customUniforms.uTime.value = elapsedTime;
      this.customUniforms.uValence.value = state.affect.valence;
      this.customUniforms.uArousal.value = state.affect.arousal;
      this.customUniforms.uAuraIntensity.value = state.scene.auraIntensity;
      this.customUniforms.uAuraColor.value.set(state.scene.auraColor);
    }

    // Apply morph targets if an external GLB is loaded
    if (this.morphMeshes.length > 0) {
      for (const mesh of this.morphMeshes) {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) continue;
        const dict = mesh.morphTargetDictionary;
        const influences = mesh.morphTargetInfluences;

        // Map state.blendshapes to standard morph target keys
        for (const [key, val] of Object.entries(state.blendshapes)) {
          if (dict[key] !== undefined) {
            influences[dict[key]] = val;
          }
        }
      }
    }
  }

  /**
   * Load external GLB/GLTF delivered by P5
   */
  loadModel(url) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          if (this.loadedModel) {
            this.avatarGroup.remove(this.loadedModel);
          }
          if (this.headMesh) {
            this.headMesh.visible = false;
          }

          this.loadedModel = gltf.scene;
          this.avatarGroup.add(this.loadedModel);

          this.morphMeshes = [];
          this.loadedModel.traverse((child) => {
            if (child.isMesh && child.morphTargetInfluences) {
              this.morphMeshes.push(child);
            }
          });

          console.log(`[P1 Avatar] Loaded model from ${url}. Found ${this.morphMeshes.length} morph targets.`);
          resolve(this.loadedModel);
        },
        undefined,
        (err) => {
          console.error(`[P1 Avatar] Failed to load model from ${url}:`, err);
          reject(err);
        }
      );
    });
  }
}
