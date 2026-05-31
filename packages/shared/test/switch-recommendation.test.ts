import assert from "node:assert/strict";
import { deriveSwitchRecommendationStatus, switchStatusLabel } from "../src/switch-recommendation";

assert.equal(
  deriveSwitchRecommendationStatus({ passedRuns: 9, failedRuns: 0, experimentStatus: "PASSED" }),
  "SAFE_TO_SWITCH"
);
assert.equal(
  deriveSwitchRecommendationStatus({ passedRuns: 8, failedRuns: 2, experimentStatus: "PASSED" }),
  "NEEDS_REVIEW"
);
assert.equal(
  deriveSwitchRecommendationStatus({ passedRuns: 5, failedRuns: 5, experimentStatus: "PASSED" }),
  "DO_NOT_SWITCH"
);
assert.equal(
  deriveSwitchRecommendationStatus({ passedRuns: 0, failedRuns: 0, experimentStatus: "RUNNING" }),
  "VERIFYING"
);
assert.equal(switchStatusLabel("SAFE_TO_SWITCH"), "Safe to switch");
