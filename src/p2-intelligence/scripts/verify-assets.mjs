import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../../public/', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'models/manifest.json'), 'utf8'));
for (const file of manifest.files) {
  const data = await readFile(resolve(root, file.path));
  if (data.length !== file.bytes || createHash('sha256').update(data).digest('hex') !== file.sha256) throw new Error('Asset integrity mismatch: ' + file.path);
}
for (const file of ['onnx/ort-wasm-simd-threaded.asyncify.mjs', 'onnx/ort-wasm-simd-threaded.asyncify.wasm', 'mediapipe/wasm/vision_wasm_internal.wasm', 'mediapipe/wasm/vision_wasm_internal.js']) {
  if (!(await stat(resolve(root, file))).size) throw new Error('Missing runtime: ' + file);
}
console.log('Pinned model checksums and local runtime files verified.');
