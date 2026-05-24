import assert from "node:assert/strict";
import { parseJudgeResponse } from "../src/eval-judge/openai-judge";
import { DEFAULT_JUDGE_METRICS } from "../src/eval-judge/default-rubric";

const parsed = parseJudgeResponse(
  JSON.stringify({
    semantic_similarity: 0.91,
    hallucination_risk: 0.12,
    instruction_following: 0.88,
    politeness: 0.95,
    conciseness: 0.8,
    coherence: 0.9,
    tone_match: 0.85,
    clarity: 0.87,
    rationale: "Response addresses the request with minor verbosity."
  }),
  DEFAULT_JUDGE_METRICS
);

assert.ok(parsed);
assert.equal(parsed.semantic_similarity, 0.91);
assert.equal(parsed.hallucination_risk, 0.12);
assert.match(parsed.rationale, /addresses the request/i);

assert.equal(parseJudgeResponse("{ invalid", DEFAULT_JUDGE_METRICS), null);
