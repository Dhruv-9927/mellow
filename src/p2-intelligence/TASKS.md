# P2 acceptance status

The authoritative source is team-integration/src/p2-intelligence on local branch p2/integration.
The original frontend remains a mock. No GitHub push or persistent server was started.

## Implemented and checked
- [x] Classifier worker with pinned local model and explicit label order
- [x] Smoothed scores, invalid-output rejection and uncertainty handling
- [x] Local ONNX loader AND WASM; no runtime CDN dependency in inference checks
- [x] MediaPipe face signals, optional three-second motion calibration, multi-face suspension
- [x] Camera permission failure, cancellation, pause/resume and resource cleanup
- [x] Team state adapter with signed arousal, flat blendshapes and leaf events
- [x] Deterministic director consuming P3 controls and P5 presets
- [x] Optional local Ollama persona director with schema validation, timeout and fallback
- [x] Labeled synthetic backup replay and explicit-consent recording API
- [x] Model asset checksum verification
- [x] 20 automated checks
- [x] Production package build
- [x] Actual browser model inference with external requests blocked
- [x] Browser lifecycle/recording checks using synthetic streams
- [x] Performance smoke report and team handoff instructions

## Manual acceptance still required
- [ ] Real-face expression behavior across users, glasses, lighting and occlusion
- [ ] Real-world multi-face detection and neutral calibration quality
- [ ] Final avatar head-axis and gaze alignment (P1 asset required)
- [ ] Actual consented 15-second backup recording using provided API
- [ ] Sustained performance while rendering the complete Three.js scene
- [ ] Optional Ollama integration with an installed local model

## Team changes deferred
- [ ] P1 initializes P2, wires explicit camera Start and guards simulator inputs
- [ ] P4 routes Become/Mask music targets if desired
- [ ] Shared root ignores generated model assets and installs nested P2 dependencies in CI
- [ ] Combined final acceptance and demo freeze
