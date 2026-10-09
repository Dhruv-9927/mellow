import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LocalPersonaDirector, validateProposal } from '../engine/director/localPersona';
import { replayAt } from '../engine/input/replayInput';
import { ExpressionFilter } from '../engine/affect/expressionFilter';
const proposal = { auraColor: '#abcdef', lightColor: '#123456', lightWarmth: .6, particleType: 'fireflies', particleDensity: 200, musicMood: 'calm' };
test('local scene schema clamps numeric values and rejects unexpected keys', () => {
  assert.equal(validateProposal({ ...proposal, particleDensity: 10000 }).particleDensity, 500);
  assert.throws(() => validateProposal({ ...proposal, lightWarmth: NaN }));
  assert.throws(() => validateProposal({ ...proposal, command: 'run this' }));
  assert.throws(() => validateProposal({ ...proposal, particleType: 'explosion' }));
});
test('local director validates output and returns null for malformed or unreachable service', async () => {
  const good = new LocalPersonaDirector({ model: 'test' }, async () => new Response(JSON.stringify({ message: { content: JSON.stringify(proposal) } })));
  assert.equal((await good.propose('forest'))?.auraColor, '#abcdef');
  const bad = new LocalPersonaDirector({ model: 'test' }, async () => new Response(JSON.stringify({ message: { content: 'not JSON' } })));
  assert.equal(await bad.propose('forest'), null);
  const down = new LocalPersonaDirector({ model: 'test' }, async () => { throw new Error('offline'); });
  assert.equal(await down.propose('forest'), null);
  assert.throws(() => new LocalPersonaDirector({ model: 'test', endpoint: 'https://example.com/api/chat' }));
});
test('local director timeout aborts pending inference and falls back', async () => {
  const slow = new LocalPersonaDirector({ model: 'test', timeoutMs: 10 }, (_url, options) => new Promise((_resolve, reject) => {
    options!.signal!.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  assert.equal(await slow.propose('forest'), null);
});
test('synthetic replay is deterministic and bounded', () => {
  assert.ok(Math.abs(replayAt(0).valence - replayAt(24).valence) < 1e-10);
  assert.ok(Math.abs(replayAt(0).arousal - replayAt(24).arousal) < 1e-10);
  for (let t = -1; t <= 25; t += .1) {
    const value = replayAt(t); assert.ok(value.valence >= -1 && value.valence <= 1); assert.ok(value.arousal >= 0 && value.arousal <= 1);
  }
});
test('invalid classifier output fails before affecting state', () => {
  const filter = new ExpressionFilter();
  assert.throws(() => filter.update({ happy: 1 }));
  assert.throws(() => filter.update({ angry: 0, disgust: 0, fear: 0, happy: NaN, sad: 0, surprise: 0, neutral: 0 }));
});
