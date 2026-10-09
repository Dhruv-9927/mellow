import type { AffectState } from "../bridge/types";

/** Scores are model preferences, not calibrated probabilities of someone's emotions. */
export class ExpressionFilter {
  private scores: Record<string, number> = {};
  reset() { this.scores = {}; }
  update(input: Record<string, number>) {
    const expected = ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"];
    if (Object.keys(input).length !== expected.length || expected.some(key => !Number.isFinite(input[key]) || input[key] < 0 || input[key] > 1)) throw new Error("Invalid classifier score vector");
    if (Math.abs(Object.values(input).reduce((a, b) => a + b, 0) - 1) > .02) throw new Error("Classifier scores must sum to one");
    for (const [key, value] of Object.entries(input)) {
      this.scores[key] = this.scores[key] === undefined ? value : this.scores[key] * 0.65 + value * 0.35;
    }
    const ranked = Object.entries(this.scores).sort((a, b) => b[1] - a[1]);
    const [label, score] = ranked[0];
    const reliable = score >= 0.55 && score - ranked[1][1] >= 0.15;
    const s = this.scores;
    // Aesthetic mapping, not learned valence/arousal measurements.
    const valence = Math.max(-1, Math.min(1, s.happy - 0.7 * s.sad - 0.6 * s.angry - 0.4 * s.disgust - 0.3 * s.fear));
    const arousal = Math.min(1, 0.15 * s.neutral + 0.25 * s.sad + 0.6 * s.happy + 0.8 * s.angry + 0.8 * s.fear + 0.9 * s.surprise + 0.45 * s.disgust);
    const mood: AffectState["label"] = label === "happy" ? "content" : label === "sad" ? "sad" : label === "neutral" ? "calm" : label === "surprise" ? "excited" : "tense";
    return { scores: { ...s }, label: reliable ? label : "uncertain", reliable,
      affect: { valence, arousal, label: mood, confidence: reliable ? score : 0 } satisfies AffectState };
  }
}
