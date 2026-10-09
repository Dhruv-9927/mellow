export type AffectLabel = "calm" | "content" | "excited" | "tense" | "sad";
export type TargetMood = "calm" | "confident";
export type ExperienceMode = "mirror" | "become";
export type ParticleType = "none" | "mist" | "spark" | "soft";

export interface AffectState {
  /** Expression-derived estimate, normalized to -1..1. */
  valence: number;
  /** Expression-derived estimate, normalized to 0..1. */
  arousal: number;
  label: AffectLabel;
  confidence: number;
}

export interface GazeState {
  x: number;
  y: number;
  confidence: number;
}

export interface BlendshapeState {
  /** MediaPipe category name -> normalized 0..1 score. */
  values: Record<string, number>;
  headYaw: number;
  headPitch: number;
  headRoll: number;
}

export interface SceneState {
  auraColor: string;
  auraStrength: number;
  lightColor: string;
  lightIntensity: number;
  particleType: ParticleType;
  particleDensity: number;
  musicMood: AffectLabel;
  explanation: string;
}

export interface UIState {
  mode: ExperienceMode;
  target: TargetMood;
  intensity: number;
  trackingPaused: boolean;
  inputSource: "demo" | "camera";
}

export interface AppState {
  expression: {
    label: string;
    scores: Record<string, number>;
    status: "demo" | "loading" | "ready" | "uncertain" | "unavailable";
    latencyMs: number;
    updatedAt: number;
  };
  affect: AffectState;
  gaze: GazeState;
  blendshapes: BlendshapeState;
  scene: SceneState;
  ui: UIState;
}

export type StateListener = (state: Readonly<AppState>) => void;

/** Stable seam for replacing the local mock with the app's shared state later. */
export interface StateBridge {
  read(): Readonly<AppState>;
  update(patch: DeepPartial<AppState>): void;
  subscribe(listener: StateListener): () => void;
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
