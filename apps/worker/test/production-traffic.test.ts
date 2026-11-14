import assert from "node:assert/strict";
import { summarizeProductionTraffic } from "../src/production-traffic";

const hiddenCriticalFailure = summarizeProductionTraffic(
  [
    { semantic: 0.9, hallucination: 0.05 },
    { semantic: 0.9, hallucination: 0.05 },
    { semantic: 0.9, hallucination: 0.05 },
    { semantic: 0.9, hallucination: 0.05 },
    { semantic: 0.4, hallucination: 0.05 },
  ],
  0.8,
);

assert.equal(hiddenCriticalFailure.averageSemantic, 0.8);
assert.equal(hiddenCriticalFailure.passedRuns, 4);
assert.equal(hiddenCriticalFailure.failedRuns, 1);
assert.equal(hiddenCriticalFailure.criticalFailures, 1);
assert.equal(hiddenCriticalFailure.completion.switchStatus, "NEEDS_REVIEW");

const safeSample = summarizeProductionTraffic(
  Array.from({ length: 5 }, () => ({ semantic: 0.9, hallucination: 0.05 })),
  0.8,
);

assert.equal(safeSample.passedRuns, 5);
assert.equal(safeSample.failedRuns, 0);
assert.equal(safeSample.criticalFailures, 0);
assert.equal(safeSample.completion.switchStatus, "SAFE_TO_SWITCH");
