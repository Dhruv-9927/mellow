# P2 Intelligence: Mellow integration

Based on Mellow main commit 757c9a1ea807f24da4f6c8e48f03876bd15c3457.
All tracked P2 changes stay in src/p2-intelligence. The separate prototype UI is not included.

## Install and verify (from repository root)

    npm install
    npm --prefix src/p2-intelligence ci
    npm --prefix src/p2-intelligence test
    npm --prefix src/p2-intelligence run build
    npm --prefix src/p2-intelligence run prepare:models
    npm run build

P2 has its own package/lockfile to avoid collisions in the shared root package.json.
Vite resolves imports from P2's nested node_modules. CI/deployment must run both installs.
prepare:models writes downloaded assets to the repository's public/models, public/mediapipe and public/onnx directories. Do not commit model binaries; P1 should add those directories to the root .gitignore. Initial download is roughly 90 MB plus WASM. Both dev and production must be hosted at the origin root for the current absolute asset paths.

## P1 integration: initialize once

The upstream src/main.js does not import P2 yet. Add:

    import { emotionEngine } from './p2-intelligence/emotionEngine.js';

Call emotionEngine.init() after initSimulator() and mountControlPanel().
This enables the director without starting a camera.

Call await emotionEngine.startCamera(videoElement) only in an explicit Start click handler.
videoElement is optional: P2 creates a detached muted inline video if omitted.
Show errors from the rejected promise. Use emotionEngine.lastStatus and modelStatus for diagnostics.

On teardown call emotionEngine.dispose(). Vite HMR can use:

    if (import.meta.hot) import.meta.hot.dispose(() => emotionEngine.dispose());

The existing P1 simulator directly writes affect, blendshapes and scene. To prevent it from competing with a live camera, guard its slider/preset/expression handlers with:

    if (!state.ui.demoMode) return;

Alternatively call emotionEngine.stopCamera() explicitly before accepting a simulator input.
Do not automatically request camera permission when demoMode changes.

The director coalesces affect/UI writes into a microtask, so simulator scene updates made synchronously in the same event are superseded by the selected mode's scene. P1 remains responsible for the simulator input guard.

## P3 controls

Existing ui.mode, targetMood, proteusIntensity, personaPrompt and trackingPaused writes are consumed directly.

- Mirror follows expression estimates, with a neutral fallback at zero confidence.
- Proteus and Become follow targetMood.
- Mask uses the selected P5 persona, or the selected target if no recognized persona exists.
- Calm, confident, joyful and focused target options are accepted.
- Call emotionEngine.applyPersona(text), or keep writing ui.personaPrompt.
- Persona strings accept P5 keys or space-separated names, e.g. forest spirit.
- Unknown persona strings fall back explicitly to the selected target preset.
- pauseCamera(), resumeCamera(), stopCamera(), calibrate() are available.
- isCalibrated reports whether the optional neutral motion baseline is ready.
- Calibration changes avatar motion only; it does not recalibrate classifier scores.

The current P3 button writes a temporary "Generating..." explanation after the persona prompt; the microtask director replaces that with the actual deterministic explanation.

## Contract mapping

| P2 internal field | Mellow shared field |
| --- | --- |
| affect.arousal in 0..1 | affect.arousal in -1..1: 2*a - 1 |
| blendshapes.values[name] | blendshapes[name] |
| headYaw/headPitch/headRoll | gaze.yaw/pitch/roll, radians |
| gaze.x/y | gaze.irisX/irisY |
| ui.inputSource | inverse of ui.demoMode |
| ui.intensity | ui.proteusIntensity |
| auraStrength in 0..1 | auraIntensity in 0..2 |
| particleDensity fraction | particleDensity count |
| explanation | scene.explainReason |

The native director uses Mellow's fireflies/rain/sparks/dust enum and P5's PERSONA_PRESETS.
Mellow rawValence/rawArousal currently mirror the smoothed aesthetic estimates; they are not unsmoothed model predictions. Model category scores live in emotionEngine.bridge.read().expression and do not add fields to shared state.

All output uses leaf updateState calls. This is necessary: replacing the affect object does not notify the existing affect.label subscriptions in P3 and P4. Unchanged labels are not emitted again, avoiding repeated sound crossfades. Audio settings, history and unrelated UI values are preserved.

P4 currently responds only to affect.label. Become/Mask music-target routing requires P4 coordination; this implementation does not overwrite observed affect labels to force a soundtrack.

## Validation and limitations

Tests exercise the real ../core/state.js and ../p5-content/personas.js, including unit conversion, leaf events, UI preservation, simulator/director ordering and facade lifecycle. The package build includes the dynamic camera chunk and classifier worker.

Live camera accuracy, avatar head-axis signs and sustained device performance remain manual acceptance checks. Browser inference with external networking blocked has passed. An optional local Ollama persona director is implemented and disabled by default.
Model attribution and source links are in MODEL.md.

## Optional local persona generation

    emotionEngine.configureLocalDirector({
      model: 'YOUR_ALREADY_INSTALLED_OLLAMA_MODEL',
      endpoint: 'http://localhost:11434/api/chat',
      timeoutMs: 6000
    });
    emotionEngine.applyPersona('bioluminescent forest spirit');

No model or Ollama service is installed automatically. Use an installed instruction model that supports structured JSON output. The local Ollama server must allow the app's origin. Only localhost/127.0.0.1/IPv6 loopback HTTP endpoints are accepted. Only the typed persona preference is sent, never face pixels, landmarks, scores or inferred affect.

Responses are checked against allowed fields/categories, numerical values are clamped, old requests are cancelled, and stale responses are discarded. Timeout, service failure or invalid output leave the deterministic director active. Generated scenes enter the same preset path and strength controls as P5 presets. The feature has mocked API tests; an actual installed Ollama model still needs a live check. Disable future generation with configureLocalDirector(null).
API references: https://docs.ollama.com/api/chat and https://docs.ollama.com/capabilities/structured-outputs

## Backup and recording APIs

    emotionEngine.startReplay(); // 24-second explicitly simulated sequence
    emotionEngine.stopReplay();

The replay is deterministic synthetic data, not prerecorded human tracking and not a model-accuracy test.

    import { recordBackup } from './p2-intelligence/engine/input/recordBackup';
    const blob = await recordBackup(videoElement, {
      consent: true, durationMs: 15000, signal: abortController.signal
    });

This optional helper is never invoked automatically. The caller must present a clear recording action and obtain consent. It records video only, returns an in-memory Blob and neither stores nor uploads it. The caller may explicitly offer a download. Recording clones tracks and releases only the clones; normal camera tracking continues. When exposing recording, update privacy copy to explain optional recording rather than promising video can never be recorded. No real person was recorded during development.

## Reproducible verification

    npm --prefix src/p2-intelligence run verify:assets
    npm --prefix src/p2-intelligence test
    npm --prefix src/p2-intelligence run build
    npm --prefix src/p2-intelligence run check:browser

The browser check uses installed Microsoft Edge via Playwright. It starts and closes its own temporary local server, blocks external requests, runs three actual classifier inferences on synthetic gray pixels, verifies MediaPipe returns no face for blank input, and exercises camera/recording lifecycle using canvas streams. It does not request your webcam. Results are in reports/browser-inference.json and reports/ACCEPTANCE.md.
