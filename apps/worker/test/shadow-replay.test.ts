import assert from "node:assert/strict";
import { getShadowReplayMode, replayCandidatePrompt } from "../src/shadow-replay";

async function main() {
  const originalMode = process.env.SHADOW_REPLAY_MODE;
  process.env.SHADOW_REPLAY_MODE = "simulate";
  assert.equal(getShadowReplayMode(), "simulate");

  const simulated = await replayCandidatePrompt("Help this customer", "openai", "gpt-4.1-mini", "Here is the answer.");
  assert.equal(simulated, "Here is the answer.");

  process.env.SHADOW_REPLAY_MODE = originalMode;
}

void main();
