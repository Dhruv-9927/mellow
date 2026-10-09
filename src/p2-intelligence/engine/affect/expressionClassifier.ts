import type { StateBridge } from "../bridge/types";
import { ExpressionFilter } from "./expressionFilter";

export class ExpressionClassifier {
  private worker?: Worker;
  private ready = false;
  private busy = false;
  private generation = 0;
  private lastFrame = 0;
  private timeout?: ReturnType<typeof setTimeout>;
  private filter = new ExpressionFilter();
  private canvas = document.createElement("canvas");
  constructor(private bridge: StateBridge, private status: (message: string) => void) {
    this.canvas.width = this.canvas.height = 224;
  }
  start() {
    this.stop();
    this.bridge.update({ expression: { status: "loading", label: "loading" }, affect: { confidence: 0 } });
    this.status("Loading expression model from this app… first load may take a minute");
    const worker = this.worker = new Worker(new URL("./classifier.worker.ts", import.meta.url), { type: "module" });
    this.timeout = setTimeout(() => this.fail("Model load timed out. Try camera again or use Demo."), 180_000);
    worker.onmessage = ({ data }) => {
      if (worker !== this.worker) return;
      if (data.type === "ready") {
        clearTimeout(this.timeout); this.ready = true;
        this.status("Expression model ready · local inference"); return;
      }
      if (data.type === "error") { this.fail("Expression model unavailable · avatar tracking remains active"); return; }
      if (data.type !== "result") return;
      clearTimeout(this.timeout); this.busy = false;
      if (data.id !== this.generation || this.bridge.read().ui.trackingPaused) return;
      let result;
      try { result = this.filter.update(data.scores); }
      catch { this.fail("Invalid expression output · avatar tracking remains active"); return; }
      this.bridge.update({ affect: result.affect, expression: {
        scores: result.scores, label: result.label, status: result.reliable ? "ready" : "uncertain",
        latencyMs: data.latencyMs, updatedAt: Date.now(),
      } });
    };
    worker.onerror = () => this.fail("Expression worker failed · use Demo or restart camera");
    worker.postMessage({});
  }
  invalidate() {
    this.generation++; this.filter.reset();
    const expression = this.bridge.read().expression;
    this.bridge.update({ affect: { confidence: 0 }, expression: {
      label: expression.status === "loading" || expression.status === "unavailable" ? expression.status : "uncertain",
      status: expression.status === "loading" || expression.status === "unavailable" ? expression.status : "uncertain",
      scores: Object.fromEntries(Object.keys(expression.scores).map(key => [key, 0])), updatedAt: 0,
    } });
  }
  sample(video: HTMLVideoElement, points: Array<{ x: number; y: number }>) {
    if (!this.ready || this.busy || performance.now() - this.lastFrame < 400) return;
    const xs = points.map(p => p.x * video.videoWidth), ys = points.map(p => p.y * video.videoHeight);
    const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
    const size = Math.min(video.videoWidth, video.videoHeight, Math.max(right - left, bottom - top) * 1.2);
    if (size < 64) { this.invalidate(); return; }
    const x = Math.max(0, Math.min(video.videoWidth - size, (left + right - size) / 2));
    const y = Math.max(0, Math.min(video.videoHeight - size, (top + bottom - size) / 2));
    const context = this.canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(video, x, y, size, size, 0, 0, 224, 224);
    const pixels = context.getImageData(0, 0, 224, 224).data;
    this.busy = true; this.lastFrame = performance.now();
    this.timeout = setTimeout(() => this.fail("Expression inference timed out · restart camera or use Demo"), 15000);
    this.worker!.postMessage({ id: this.generation, pixels: pixels.buffer, width: 224, height: 224 }, [pixels.buffer]);
  }
  stop() {
    clearTimeout(this.timeout); this.worker?.terminate(); this.worker = undefined;
    this.ready = false; this.busy = false; this.generation++; this.filter.reset();
    this.canvas.getContext("2d")?.clearRect(0, 0, 224, 224);
  }
  private fail(message: string) {
    this.stop(); this.bridge.update({ affect: { confidence: 0 }, expression: { status: "unavailable", label: "unavailable" } });
    this.status(message);
  }
}
