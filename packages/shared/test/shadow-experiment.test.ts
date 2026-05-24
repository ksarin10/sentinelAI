import assert from "node:assert/strict";
import { evaluateShadowExperimentCompletion, evaluateShadowRun } from "../src/shadow-experiment";

const passingRun = evaluateShadowRun(0.86, 0.08, 0.8, "MEDIUM");
assert.equal(passingRun.passed, true);

const failingRun = evaluateShadowRun(0.72, 0.08, 0.8, "MEDIUM");
assert.equal(failingRun.passed, false);

const completion = evaluateShadowExperimentCompletion(8, 1, 10);
assert.equal(completion.complete, true);
assert.equal(completion.passed, true);

const failedCompletion = evaluateShadowExperimentCompletion(2, 3, 10);
assert.equal(failedCompletion.passed, false);
