import assert from "node:assert/strict";
import { scoreTraceEvaluation } from "../src/run-evaluation";

async function main() {
  const originalJudgeFlag = process.env.EVAL_JUDGE_ENABLED;
  const originalApiKey = process.env.OPENAI_API_KEY;

  process.env.EVAL_JUDGE_ENABLED = "false";
  delete process.env.OPENAI_API_KEY;

  const heuristicScores = await scoreTraceEvaluation(
    "Summarize the refund policy",
    "Customers can request a refund within 30 days.",
    null
  );

  assert.equal(heuristicScores.length, 2);
  assert.equal(heuristicScores[0].details.method, "heuristic");

  process.env.EVAL_JUDGE_ENABLED = originalJudgeFlag;
  if (originalApiKey) {
    process.env.OPENAI_API_KEY = originalApiKey;
  }
}

void main();
