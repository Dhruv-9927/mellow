import { test } from "node:test";
import assert from "node:assert/strict";
import { MockStateBridge } from "../engine/bridge/mockStateBridge";
import { connectDirector } from "../engine/director/connectDirector";
import { ExpressionFilter } from "../engine/affect/expressionFilter";
import { DemoInput } from "../engine/input/demoInput";
import { NeutralCalibration } from "../engine/input/neutralCalibration";
import { resolvePersona, personas } from "../engine/director/personas";

test("invalid updates are atomic and finite inputs are clamped", () => {
  const bridge = new MockStateBridge();
  const before = bridge.read();
  assert.throws(() => bridge.update({ affect: { valence: NaN } }));
  assert.deepEqual(bridge.read(), before);
  bridge.update({ ui: { intensity: 4 } });
  assert.equal(bridge.read().ui.intensity, 1);
  assert.equal(bridge.read().ui.mode, "mirror");
});
test("read snapshots and subscriber arguments cannot mutate internal state", () => {
  const bridge = new MockStateBridge();
  bridge.read().affect.valence = 500;
  bridge.subscribe(state => { state.affect.valence = 500; });
  assert.notEqual(bridge.read().affect.valence, 500);
});
test("director reacts to input updates, does not loop, and can disconnect", () => {
  const bridge = new MockStateBridge();
  const disconnect = connectDirector(bridge);
  new DemoInput(bridge).setExpression(-0.8, 0.9);
  assert.equal(bridge.read().scene.musicMood, "tense");
  const scene = bridge.read().scene;
  disconnect(); new DemoInput(bridge).setExpression(0.8, 0.9);
  assert.deepEqual(bridge.read().scene, scene);
});
test("unknown expressions have neutral scene; Become remains user controlled", () => {
  const bridge = new MockStateBridge(); connectDirector(bridge);
  bridge.update({ affect: { confidence: 0 }, ui: { inputSource: "camera" } });
  assert.equal(bridge.read().scene.particleType, "none");
  bridge.update({ ui: { mode: "become", target: "confident" } });
  assert.equal(bridge.read().scene.auraColor, "#ffc078");
  bridge.update({ ui: { intensity: 0 } });
  assert.equal(bridge.read().scene.particleType, "none");
});
test("ambiguous scores are uncertain; strong scores identify expression", () => {
  const filter = new ExpressionFilter();
  const scores = { angry: .15, disgust: .1, fear: .1, happy: .2, sad: .15, surprise: .1, neutral: .2 };
  assert.equal(filter.update(scores).label, "uncertain");
  filter.reset();
  const result = filter.update({ angry: .01, disgust: .01, fear: .01, happy: .9, sad: .01, surprise: .01, neutral: .05 });
  assert.equal(result.label, "happy"); assert.ok(result.affect.valence > .8);
});

test("calibration needs three seconds of valid samples and removes the motion baseline", () => {
  const calibration = new NeutralCalibration();
  const sample = { values: { jawOpen: .1 }, headYaw: .2, headPitch: .1, headRoll: 0 };
  calibration.begin(0);
  for (let t = 0; t < 3000; t += 100) calibration.observe(sample, t);
  assert.equal(calibration.status, "collecting");
  calibration.observe(sample, 3000);
  assert.equal(calibration.status, "ready");
  assert.ok(Math.abs(calibration.apply(sample).headYaw) < 1e-6);
  assert.ok(calibration.apply(sample).values.jawOpen < 1e-6);
  calibration.reset(); assert.deepEqual(calibration.apply(sample), sample);
});

test("interrupted calibration restarts the collection period", () => {
  const calibration = new NeutralCalibration();
  const sample = { values: {}, headYaw: 0, headPitch: 0, headRoll: 0 };
  calibration.begin(0);
  for (let t = 0; t < 2500; t += 100) calibration.observe(sample, t);
  calibration.interrupt(2500);
  calibration.observe(sample, 3000);
  assert.equal(calibration.status, "collecting");
});

test("all persona presets validate; unknown requests have an explicit fallback", () => {
  const bridge = new MockStateBridge();
  for (const name of Object.keys(personas)) {
    const result = resolvePersona(name, 100);
    assert.equal(result.matched, true);
    bridge.update({ scene: result.scene });
  }
  assert.equal(resolvePersona("  Forest  Spirit ").matched, true);
  assert.equal(resolvePersona("__proto__").matched, false);
  assert.equal(resolvePersona("not a preset").name, "forest spirit");
  assert.equal(resolvePersona("calm monk", 0).scene.particleDensity, 0);
});
