import { test } from 'node:test';
import assert from 'node:assert/strict';
import { state, updateState, onStateChange } from '../../core/state.js';
import { PERSONA_PRESETS } from '../../p5-content/personas.js';
import { MellowBridge } from '../engine/integration/mellowBridge';
import { connectMellowDirector } from '../engine/integration/mellowDirector';
import { EmotionEngine } from '../emotionEngine.js';

const store = { state, updateState, onStateChange };
test('actual Mellow state receives arousal conversion and flat avatar signals', () => {
  const bridge = new MellowBridge(store);
  bridge.update({ affect: { arousal: .25 }, blendshapes: { values: { jawOpen: .6 }, headYaw: .3 }, gaze: { x: -.2 } });
  assert.equal(state.affect.arousal, -.5);
  assert.equal(bridge.read().affect.arousal, .25);
  assert.equal(state.blendshapes.jawOpen, .6);
  assert.equal(state.gaze.yaw, .3);
  assert.equal(state.gaze.irisX, -.2);
  bridge.dispose();
});
test('leaf listeners fire only when labels change, preserving P3/P4 behavior', () => {
  const bridge = new MellowBridge(store);
  let events = 0;
  updateState('affect.label', 'calm');
  const off = onStateChange('affect.label', () => events++);
  bridge.update({ affect: { label: 'excited' } });
  bridge.update({ affect: { label: 'excited' } });
  assert.equal(events, 1); off(); bridge.dispose();
});
test('P3 settings are observed without replacing UI or history fields', () => {
  const bridge = new MellowBridge(store);
  const history = state.history;
  updateState('ui.mode', 'Proteus'); updateState('ui.targetMood', 'joyful');
  updateState('ui.audioVolume', .42);
  bridge.update({ ui: { trackingPaused: true } });
  assert.equal(state.ui.mode, 'Proteus'); assert.equal(state.ui.targetMood, 'joyful');
  assert.equal(state.ui.audioVolume, .42); assert.equal(state.history, history);
  assert.equal(bridge.read().ui.mode, 'become'); bridge.dispose();
});
test('director consumes P5 presets and wins after synchronous simulator scene writes', async () => {
  const off = connectMellowDirector(store, PERSONA_PRESETS);
  updateState('ui.mode', 'Mask'); updateState('ui.personaPrompt', 'forest spirit');
  updateState('ui.proteusIntensity', .7);
  updateState('scene.auraColor', '#ffffff');
  await Promise.resolve();
  assert.equal(state.scene.auraColor, PERSONA_PRESETS['forest-spirit'].auraColor);
  assert.equal(state.scene.particleType, 'fireflies');
  assert.equal(state.scene.particleDensity, 245);
  off();
});
test('facade can initialize and dispose without requesting a camera', () => {
  const engine = new EmotionEngine(); engine.init();
  assert.equal(engine.tracker, null);
  engine.applyPersona('oceanic deep');
  assert.equal(state.ui.personaPrompt, 'oceanic deep');
  engine.dispose(); assert.equal(engine.bridge, null);
});
test('switching to Demo stops a paused camera as well as an active one', () => {
  const engine = new EmotionEngine(); engine.init();
  let stopped = 0;
  engine.tracker = { stop() { stopped++; } };
  engine.trackingActive = false;
  updateState('ui.demoMode', true);
  assert.equal(stopped, 1);
  engine.dispose();
});
test('stale local persona responses cannot overwrite a newer request', async () => {
  const engine = new EmotionEngine(); engine.init();
  updateState('ui.personaPrompt', 'first custom persona');
  let deliver;
  engine.localDirector = { cancel() {}, propose() { return new Promise(resolve => { deliver = resolve; }); } };
  const pending = engine.generatePersona();
  // External UI changes while the request is in flight.
  state.ui.personaPrompt = 'new custom persona';
  deliver({ auraColor: '#abcdef' });
  assert.equal(await pending, false);
  assert.equal(Object.hasOwn(engine.presets, 'first-custom-persona'), false);
  engine.dispose();
});
