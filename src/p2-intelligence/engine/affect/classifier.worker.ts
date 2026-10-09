import { pipeline, RawImage, env } from "@huggingface/transformers";

// Assets are prepared by npm run prepare:models. Face pixels never leave this worker.
env.allowLocalModels = true;
env.allowRemoteModels = false;
env.localModelPath = "/models/";
if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.wasmPaths = {
    mjs: new URL('/onnx/ort-wasm-simd-threaded.asyncify.mjs', self.location.origin).href,
    wasm: new URL('/onnx/ort-wasm-simd-threaded.asyncify.wasm', self.location.origin).href,
  };
}
const model = "onnx-community/face-emotion-detection-ONNX";
const revision = "905691b2f5f19e65b2dc909b01f0451a2e81d963";
const labels = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"];
let classifier: Awaited<ReturnType<typeof createClassifier>> | undefined;
function createClassifier() {
  return pipeline("image-classification", model, {
    revision, dtype: "q8", device: "wasm",
  });
}
self.onmessage = async (event: MessageEvent) => {
  const { id, pixels, width, height } = event.data;
  try {
    if (!classifier) classifier = await createClassifier();
    if (!pixels) { self.postMessage({ type: "ready" }); return; }
    const start = performance.now();
    const result = await classifier(new RawImage(new Uint8ClampedArray(pixels), width, height, 4), { top_k: null });
    const scores: Record<string, number> = {};
    for (const item of result as Array<{ label: string; score: number }>) {
      const label = labels[Number(item.label.replace("LABEL_", ""))];
      if (!label || !Number.isFinite(item.score)) throw new Error("Unexpected classifier output");
      scores[label] = item.score;
    }
    self.postMessage({ type: "result", id, scores, latencyMs: performance.now() - start });
  } catch (error) {
    self.postMessage({ type: "error", id, message: error instanceof Error ? error.message : "Classifier failed" });
  }
};
