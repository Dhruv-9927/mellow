// Headless public API. UI/framework independent; camera creation requires a browser.
export { CameraTracker } from "./input/cameraTracker";
export { NeutralCalibration } from "./input/neutralCalibration";
export { DemoInput } from "./input/demoInput";
export { MockStateBridge, initialState } from "./bridge/mockStateBridge";
export { connectDirector } from "./director/connectDirector";
export { directScene } from "./director/ruleDirector";
export { resolvePersona, personas } from "./director/personas";
export type * from "./bridge/types";
export { LocalPersonaDirector, validateProposal } from "./director/localPersona";
export { ReplayInput, replayAt, backupSequence } from "./input/replayInput";
export { recordBackup } from "./input/recordBackup";
