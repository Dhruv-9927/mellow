/** Explicit opt-in helper only. Caller receives a Blob; nothing is saved or uploaded. */
export function recordBackup(video: HTMLVideoElement, options: { consent: true; durationMs?: number; signal?: AbortSignal }): Promise<Blob> {
  if (options.consent !== true || !(video.srcObject instanceof MediaStream)) return Promise.reject(new Error("Consent and an active video stream are required"));
  if (!Number.isFinite(options.durationMs ?? 15000)) return Promise.reject(new Error("Invalid recording duration"));
  if (options.signal?.aborted) return Promise.reject(new Error("Recording cancelled"));
  const stream = new MediaStream(video.srcObject.getVideoTracks().map(track => track.clone()));
  const mimeType = ["video/webm;codecs=vp8", "video/webm", "video/mp4"].find(type => MediaRecorder.isTypeSupported(type));
  return new Promise((resolve, reject) => {
    let recorder: MediaRecorder;
    try { recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); }
    catch (error) { stream.getTracks().forEach(track => track.stop()); reject(error); return; }
    const chunks: Blob[] = [];
    const cleanup = () => { clearTimeout(timer); stream.getTracks().forEach(track => track.stop()); options.signal?.removeEventListener("abort", abort); };
    const abort = () => { if (recorder.state !== "inactive") recorder.stop(); cleanup(); reject(new Error("Recording cancelled")); };
    const timer = setTimeout(() => { if (recorder.state !== "inactive") recorder.stop(); }, Math.max(1000, Math.min(60000, options.durationMs ?? 15000)));
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    recorder.onstop = () => { cleanup(); resolve(new Blob(chunks, { type: recorder.mimeType })); };
    recorder.onerror = () => { cleanup(); reject(new Error("Recording failed")); };
    options.signal?.addEventListener("abort", abort, { once: true });
    try { recorder.start(); } catch (error) { cleanup(); reject(error); }
  });
}
