# P2 validation report

Run date: 2026-10-09 (client date).
Source: this local P2 package. No claim of validated expression accuracy.

## Automated results

- 20 node regression tests passed.
- TypeScript and Vite production package build passed.
- Prepared model hashes match the manifest; runtime files exist.
- Headless Microsoft Edge loaded the real q8 ONNX classifier using only local requests.
- Three synthetic-image inferences produced seven finite category scores summing to approximately one.
- MediaPipe detected zero faces on a blank image.
- Synthetic-stream lifecycle checks passed for start, pause, resume, stop, late permission resolution, denied permission and opt-in recording.
- Recording produced a nonempty Blob and left source tracks active until normal stop.
- External requests: zero. Uncaught page errors: zero.
- Browser and test server were closed after completion.

## Measured runtime

Latest run in reports/browser-inference.json:
- Classifier load: approximately 2.87 seconds.
- Synthetic-frame inference: approximately 1.95, 0.98 and 0.70 seconds.
- Three samples are a smoke measurement, not a statistically reliable throughput benchmark.
- Face tracking runs independently. Expression inference is serialized; this laptop does not deliver expression predictions at webcam frame rate.
- Real camera capture, other apps and the Three.js renderer can change latency.

An earlier offline run exposed a CDN dependency in the ONNX JavaScript loader. Both the loader and WASM are now served locally and the network-blocked rerun passes.

## Acceptance procedure requiring a person

1. Start the integrated app and allow the camera explicitly.
2. Hold a relaxed expression and call calibrate(); verify stable neutral avatar motion.
3. Smile, open mouth, blink and rotate the head; confirm avatar direction and range.
4. Compare visible expressions to scores without treating labels as ground truth.
5. Repeat under dim light, with glasses and partial occlusion; verify uncertainty/recovery.
6. Add a second face; confirm inference suspends until one remains.
7. Deny permissions or disconnect the webcam; verify fallback and no stale updates.
8. Run for ten minutes with the full scene, watching memory, responsiveness and frame rate.
9. If desired, enable an installed local Ollama model and check a custom persona; stop the service and confirm rule fallback.
10. With explicit consent, record a short backup clip using recordBackup and save it deliberately.

No personal footage or consented expression samples were supplied or recorded. These checks remain open rather than being marked as passed using simulated data.
