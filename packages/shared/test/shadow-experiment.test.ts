import assert from "node:assert/strict";
import { evaluateShadowExperimentCompletion, evaluateShadowRun } from "../src/shadow-experiment";

const passingRun = evaluateShadowRun(0.86, 0.08, 0.8, "MEDIUM");
assert.equal(passingRun.passed, true);
assert.equal(passingRun.verdict, "pass");

const borderlineRun = evaluateShadowRun(0.78, 0.1, 0.8, "MEDIUM");
assert.equal(borderlineRun.verdict, "borderline");

const completion = evaluateShadowExperimentCompletion(8, 0, 0, 0, 8);
assert.equal(completion.complete, true);
assert.equal(completion.experimentPassed, true);
assert.equal(completion.switchStatus, "SAFE_TO_SWITCH");

const reviewCompletion = evaluateShadowExperimentCompletion(7, 1, 0, 0, 8);
assert.equal(reviewCompletion.switchStatus, "NEEDS_REVIEW");

const failedCompletion = evaluateShadowExperimentCompletion(2, 1, 5, 2, 10);
assert.equal(failedCompletion.experimentPassed, false);
