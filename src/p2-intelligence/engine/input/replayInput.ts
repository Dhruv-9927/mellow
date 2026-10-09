import type { StateBridge } from "../bridge/types";
import { DemoInput } from "./demoInput";

/** Clearly synthetic 24-second demo. Contains no captured face or personal data. */
export const backupSequence = [
  { seconds: 0, valence: .1, arousal: .2 },
  { seconds: 6, valence: .85, arousal: .8 },
  { seconds: 12, valence: -.5, arousal: .65 },
  { seconds: 18, valence: .45, arousal: .15 },
  { seconds: 24, valence: .1, arousal: .2 },
];
export function replayAt(seconds: number) {
  const t = Math.max(0, Math.min(24, Number.isFinite(seconds) ? seconds : 0));
  const i = Math.min(3, Math.floor(t / 6));
  const a = backupSequence[i], b = backupSequence[i + 1], mix = (t - a.seconds) / 6;
  return { valence: a.valence + (b.valence - a.valence) * mix, arousal: a.arousal + (b.arousal - a.arousal) * mix };
}
export class ReplayInput {
  private timer?: ReturnType<typeof setInterval>;
  constructor(private bridge: StateBridge) {}
  start() {
    this.stop(); const start = performance.now(); const input = new DemoInput(this.bridge);
    this.bridge.update({ ui: { inputSource: "demo", trackingPaused: false } });
    const tick = () => {
      const elapsed = (performance.now() - start) / 1000;
      const frame = replayAt(elapsed);
      input.setExpression(frame.valence, frame.arousal);
      if (elapsed >= 24) this.stop();
    };
    tick(); this.timer = setInterval(tick, 100);
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
}
