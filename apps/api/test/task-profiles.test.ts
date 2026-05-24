import assert from "node:assert/strict";
import { toTaskProfileResponse } from "../src/task-profiles/task-profile.dto";

const profile = toTaskProfileResponse({
  id: "tp_1",
  projectId: "proj_1",
  taskName: "support.answer",
  riskLevel: "MEDIUM",
  qualityThreshold: 0.85,
  optimizationGoal: "REDUCE_COST",
  notes: "Support replies",
  createdAt: new Date("2026-05-24T00:00:00.000Z"),
  updatedAt: new Date("2026-05-24T00:00:00.000Z")
});

assert.equal(profile.taskName, "support.answer");
assert.equal(profile.qualityThreshold, 0.85);
assert.equal(profile.optimizationGoal, "REDUCE_COST");
