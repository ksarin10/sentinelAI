import assert from "node:assert/strict";
import {
  aggregateReplayRuns,
  buildSampleConfidence,
  classifyReplayRun,
  deriveSwitchRecommendationStatus
} from "../src/replay-verdict";

const pass = classifyReplayRun({ semanticScore: 0.86, hallucinationScore: 0.08, qualityThreshold: 0.8 });
assert.equal(pass.verdict, "pass");

const borderline = classifyReplayRun({ semanticScore: 0.78, hallucinationScore: 0.1, qualityThreshold: 0.8 });
assert.equal(borderline.verdict, "borderline");

const fail = classifyReplayRun({ semanticScore: 0.5, hallucinationScore: 0.08, qualityThreshold: 0.8 });
assert.equal(fail.verdict, "fail");
assert.equal(fail.critical, true);

assert.equal(
  deriveSwitchRecommendationStatus({
    passedRuns: 8,
    borderlineRuns: 0,
    failedRuns: 0,
    criticalFailures: 0,
    experimentStatus: "PASSED"
  }),
  "SAFE_TO_SWITCH"
);

assert.equal(
  deriveSwitchRecommendationStatus({
    passedRuns: 7,
    borderlineRuns: 1,
    failedRuns: 0,
    criticalFailures: 0,
    experimentStatus: "PASSED"
  }),
  "NEEDS_REVIEW"
);

assert.equal(
  deriveSwitchRecommendationStatus({
    passedRuns: 5,
    borderlineRuns: 1,
    failedRuns: 2,
    criticalFailures: 1,
    experimentStatus: "PASSED"
  }),
  "DO_NOT_SWITCH"
);

const aggregate = aggregateReplayRuns([
  { explanation: pass },
  { explanation: borderline },
  { explanation: fail }
]);
assert.equal(aggregate.passedRuns, 1);
assert.equal(aggregate.borderlineRuns, 1);
assert.equal(aggregate.failedRuns, 1);

assert.equal(buildSampleConfidence(8).label, "Limited sample");
assert.match(buildSampleConfidence(8).detail, /20\+ traces/);
assert.equal(buildSampleConfidence(24).label, "Strong sample");
