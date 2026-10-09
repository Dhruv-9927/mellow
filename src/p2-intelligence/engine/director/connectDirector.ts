import type { StateBridge } from "../bridge/types";
import { directScene } from "./ruleDirector";

/** Wire any bridge to scene derivation. Returns a cleanup function. */
export function connectDirector(bridge: StateBridge) {
  let lastInput = "";
  return bridge.subscribe(state => {
    const input = JSON.stringify([state.affect, state.ui]);
    if (input === lastInput) return;
    lastInput = input;
    bridge.update({ scene: directScene(state.affect, state.ui) });
  });
}
