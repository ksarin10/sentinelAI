import assert from "node:assert/strict";
import { scoreShadowReplayRun } from "../src/shadow-scoring";

async function main() {
  const originalMode = process.env.SHADOW_REPLAY_MODE;
  process.env.SHADOW_REPLAY_MODE = "simulate";

  const trace = {
    prompt: "Summarize the customer complaint and recommend the next support action.",
    response: "The customer reports a delayed delivery.",
    metadata: null,
    evaluations: [
      {
        status: "COMPLETED",
        scores: [
          { metric: "semantic_similarity", score: 0.86 },
          { metric: "hallucination_risk", score: 0.08 }
        ]
      }
    ]
  };

  const scores = await scoreShadowReplayRun(trace, trace.response!, trace.response!, {
    isCrossProvider: false,
    usedSimulate: true
  });
  assert.equal(scores.semantic, 0.86);
  assert.equal(scores.hallucination, 0.08);

  process.env.SHADOW_REPLAY_MODE = originalMode;
}

void main();
