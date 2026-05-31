import assert from "node:assert/strict";
import { getShadowReplayMode, replayCandidatePrompt } from "../src/shadow-replay";

async function main() {
  const originalMode = process.env.SHADOW_REPLAY_MODE;
  process.env.SHADOW_REPLAY_MODE = "simulate";
  assert.equal(getShadowReplayMode(), "simulate");

  const simulated = await replayCandidatePrompt("Help this customer", "openai", "gpt-4.1-mini", "Here is the answer.", null, {
    allowSimulate: true
  });
  assert.equal(simulated, "Here is the answer.");

  const blockedCrossSimulate = await replayCandidatePrompt(
    "Help this customer",
    "groq",
    "llama-3.3-70b-versatile",
    "Here is the answer.",
    null,
    { allowSimulate: false }
  );
  assert.equal(blockedCrossSimulate, null);

  process.env.SHADOW_REPLAY_MODE = originalMode;
}

void main();
