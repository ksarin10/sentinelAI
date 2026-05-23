import assert from "node:assert/strict";
import { assertEvaluationJobData } from "../src/evaluation-job";

assert.deepEqual(assertEvaluationJobData({ traceId: "trace_1", evaluationId: "eval_1" }), {
  traceId: "trace_1",
  evaluationId: "eval_1"
});

assert.throws(() => assertEvaluationJobData({ evaluationId: "eval_1" }), /missing traceId/);
assert.throws(() => assertEvaluationJobData({ traceId: "trace_1" }), /missing evaluationId/);
