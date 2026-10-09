import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { StateBridge } from "../bridge/types";
import { ExpressionClassifier } from "../affect/expressionClassifier";
import { NeutralCalibration } from "./neutralCalibration";

const WASM_ROOT = "/mediapipe/wasm";
const MODEL_URL = "/models/face_landmarker.task";

export class CameraTracker {
  readonly calibration = new NeutralCalibration();
  calibrate() {
    if (!this.stream || this.bridge.read().ui.trackingPaused) throw new Error("Start and resume camera before calibration");
    this.calibration.begin(performance.now());
  }
  private landmarker?: FaceLandmarker;
  private stream?: MediaStream;
  private frameId = 0;
  private lastVideoTime = -1;
  private lastTick = 0;
  private video?: HTMLVideoElement;
  private generation = 0;
  private classifier: ExpressionClassifier;
  constructor(private bridge: StateBridge, private onStatus: (message: string) => void = () => {},
    modelStatus: (message: string) => void = () => {}) {
    this.classifier = new ExpressionClassifier(bridge, modelStatus);
  }
  async start(video: HTMLVideoElement): Promise<void> {
    this.stop();
    const generation = this.generation;
    this.onStatus("Requesting camera access…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 }, audio: false });
      if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return; }
      this.stream = stream; this.video = video; video.srcObject = stream;
      stream.getVideoTracks()[0].onended = () => { this.stop(); this.onStatus("Camera disconnected · choose Demo or restart"); };
      await video.play();
      const vision = await FilesetResolver.forVisionTasks(WASM_ROOT);
      if (generation !== this.generation) return;
      const create = (delegate: "GPU" | "CPU") => FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate }, runningMode: "VIDEO", numFaces: 2,
        outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
      });
      let landmarker: FaceLandmarker;
      try { landmarker = await create("GPU"); }
      catch { if (generation !== this.generation) return; landmarker = await create("CPU"); }
      if (generation !== this.generation) { landmarker.close(); return; }
      this.landmarker = landmarker;
      this.bridge.update({ ui: { inputSource: "camera", trackingPaused: false }, affect: { confidence: 0 } });
      this.classifier.start();
      this.onStatus("Camera ready · keep one face in view");
      this.tick();
    } catch (error) {
      if (generation === this.generation) { this.stop(); throw error; }
    }
  }
  pause(paused: boolean): void {
    this.calibration.interrupt(performance.now());
    this.bridge.update({ ui: { trackingPaused: paused } });
    this.classifier.invalidate();
    this.onStatus(paused ? "Tracking paused · camera remains on until Demo is selected" : "Tracking resumed");
  }
  stop(): void {
    this.calibration.reset();
    this.generation++;
    cancelAnimationFrame(this.frameId);
    this.classifier.stop();
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    this.stream = undefined;
    this.landmarker?.close(); this.landmarker = undefined;
    if (this.video) this.video.srcObject = null;
    this.video = undefined; this.lastVideoTime = -1;
    this.bridge.update({ ui: { inputSource: "demo", trackingPaused: false }, affect: { confidence: 0 },
      expression: { label: "simulated", status: "demo" } });
  }
  private tick = (): void => {
    const video = this.video, landmarker = this.landmarker;
    if (!video || !landmarker) return;
    try {
      const now = performance.now();
      if (!this.bridge.read().ui.trackingPaused && now - this.lastTick > 65 &&
          video.readyState >= 2 && video.currentTime !== this.lastVideoTime) {
        this.lastTick = now; this.lastVideoTime = video.currentTime;
        const result = landmarker.detectForVideo(video, now);
        const categories = result.faceBlendshapes?.[0]?.categories;
        const points = result.faceLandmarks?.[0];
        const matrix = result.facialTransformationMatrixes?.[0]?.data;
        if (result.faceLandmarks.length === 1 && categories?.length && points) {
          const values = Object.fromEntries(categories.map(c => [c.categoryName, c.score]));
          const raw = { values, ...(matrix ? matrixToEuler(matrix) : { headYaw: 0, headPitch: 0, headRoll: 0 }) };
          this.calibration.observe(raw, now);
          this.bridge.update({ blendshapes: this.calibration.apply(raw),
            gaze: estimateGaze(points) });
          this.classifier.sample(video, points);
          this.onStatus(this.calibration.status === "collecting" ? "Calibration: hold a relaxed face for three seconds" : "Face tracked · expression classification runs separately");
        } else {
          this.calibration.interrupt(now);
          this.classifier.invalidate();
          this.bridge.update({ gaze: { x: 0, y: 0, confidence: 0 },
            blendshapes: { values: Object.fromEntries(Object.keys(this.bridge.read().blendshapes.values).map(k => [k, 0])), headYaw: 0, headPitch: 0, headRoll: 0 } });
          this.onStatus(result.faceLandmarks.length > 1 ? "Multiple faces detected · inference paused until one face remains" : "No face found · move into view or choose Demo");
        }
      }
      this.frameId = requestAnimationFrame(this.tick);
    } catch {
      this.stop(); this.onStatus("Face tracking failed · restart camera or choose Demo");
    }
  };
}
function matrixToEuler(m: number[]): { headYaw: number; headPitch: number; headRoll: number } {
  // MediaPipe's column-major facial transform. Angles are radians for easy Three.js integration.
  const yaw = Math.atan2(m[8], m[10]);
  const pitch = Math.atan2(-m[9], Math.hypot(m[8], m[10]));
  const roll = Math.atan2(m[4], m[0]);
  return { headYaw: yaw, headPitch: pitch, headRoll: roll };
}

function estimateGaze(landmarks?: Array<{ x: number; y: number }>) {
  if (!landmarks || landmarks.length < 478) return { x: 0, y: 0, confidence: 0 };
  const eye = (iris: number[], inner: number, outer: number, top: number, bottom: number) => {
    const center = iris.map((i) => landmarks[i]).reduce((p, c) => ({ x: p.x + c.x / iris.length, y: p.y + c.y / iris.length }), { x: 0, y: 0 });
    const horizontal = (landmarks[inner].x + landmarks[outer].x) / 2;
    const vertical = (landmarks[top].y + landmarks[bottom].y) / 2;
    return { x: (center.x - horizontal) * 7, y: (center.y - vertical) * 7 };
  };
  const left = eye([468, 469, 470, 471, 472], 33, 133, 159, 145);
  const right = eye([473, 474, 475, 476, 477], 362, 263, 386, 374);
  return { x: clamp((left.x + right.x) / 2, -1, 1), y: clamp((left.y + right.y) / 2, -1, 1), confidence: 0.45 };
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)); }
