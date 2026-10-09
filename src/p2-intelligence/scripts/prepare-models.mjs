import { mkdir, writeFile, cp, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// npm run prepare:models defaults to the team app's public directory.
const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)), 'public');
const model = 'onnx-community/face-emotion-detection-ONNX';
const revision = '905691b2f5f19e65b2dc909b01f0451a2e81d963';
const records = [];
async function download(url, destination) {
  const response = await fetch(url, { signal: AbortSignal.timeout(240000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const data = Buffer.from(await response.arrayBuffer());
  await mkdir(resolve(destination, '..'), { recursive: true });
  await writeFile(destination + '.partial', data);
  await rename(destination + '.partial', destination);
  records.push({ path: destination.slice(root.length + 1), bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), url });
  console.log(`Saved ${destination} (${Math.round(data.length / 1024)} KB)`);
}
for (const file of ['config.json', 'preprocessor_config.json', 'onnx/model_quantized.onnx', 'README.md']) {
  await download(`https://huggingface.co/${model}/resolve/${revision}/${file}`, resolve(root, 'models', model, file));
}
await download('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', resolve(root, 'models/face_landmarker.task'));
await cp(fileURLToPath(new URL('../node_modules/@mediapipe/tasks-vision/wasm', import.meta.url)), resolve(root, 'mediapipe/wasm'), { recursive: true });
await mkdir(resolve(root, 'onnx'), { recursive: true });
for (const file of ['ort-wasm-simd-threaded.asyncify.mjs', 'ort-wasm-simd-threaded.asyncify.wasm']) {
  await cp(fileURLToPath(new URL('../node_modules/onnxruntime-web/dist/' + file, import.meta.url)), resolve(root, 'onnx', file));
}
await writeFile(resolve(root, 'models/manifest.json'), JSON.stringify({ model, revision, downloadedAt: new Date().toISOString(), files: records }, null, 2));
console.log('Local model assets prepared. Run npm run build to include them in dist.');
