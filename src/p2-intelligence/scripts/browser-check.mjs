import { chromium } from 'playwright';
import { createServer } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const server = await createServer({ configFile: false, root, publicDir: fileURLToPath(new URL('../../../public', import.meta.url)),
  optimizeDeps: { noDiscovery: true, include: ['@mediapipe/tasks-vision', '@huggingface/transformers'] },
  server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [], externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1' && url.protocol !== 'data:' && url.protocol !== 'blob:') { externalRequests.push(url.origin); return route.abort(); }
    return route.continue();
  });
  await page.goto(`http://127.0.0.1:${address.port}/tests/browser.html`);
  await page.waitForFunction(() => typeof window.runInferenceCheck === 'function');
  let result;
  try { result = await page.evaluate(() => window.runInferenceCheck()); }
  catch (error) {
    if (!error.message.includes('Execution context was destroyed')) throw error;
    await page.waitForFunction(() => typeof window.runInferenceCheck === 'function');
    result = await page.evaluate(() => window.runInferenceCheck());
  }
  assert.equal(result.noFaceCount, 0);
  for (const sample of result.results) {
    assert.equal(Object.keys(sample.scores).length, 7);
    assert.ok(Object.values(sample.scores).every(n => Number.isFinite(n) && n >= 0 && n <= 1));
    assert.ok(Math.abs(Object.values(sample.scores).reduce((a,b) => a+b, 0) - 1) < .01);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  const lifecycle = await page.evaluate(() => window.runLifecycleCheck());
  for (const key of ['started', 'paused', 'resumed', 'stopped', 'cancelled', 'denied', 'recordingKeptSourceAlive']) assert.equal(lifecycle[key], true, key);
  assert.ok(lifecycle.recordingBytes > 0);
  assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
  const report = { timestamp: new Date().toISOString(), input: 'Synthetic gray pixels; no real face or webcam. This measures runtime only, not classification accuracy.',
    externalNetworkBlocked: true, lifecycle, ...result };
  await mkdir(new URL('../reports/', import.meta.url), { recursive: true });
  await writeFile(new URL('../reports/browser-inference.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ loadMs: result.loadMs, inferenceMs: result.results.map(r => r.latencyMs), noFaceCount: result.noFaceCount, externalRequests, errors }, null, 2));
} finally { await browser?.close(); await server.close(); }
