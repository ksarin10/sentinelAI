import assert from "node:assert/strict";
import { evaluationJobOptions } from "../src/evaluations/evaluation-jobs";

assert.equal(evaluationJobOptions.attempts, 3);
assert.deepEqual(evaluationJobOptions.backoff, { type: "exponential", delay: 5000 });
