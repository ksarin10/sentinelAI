import assert from "node:assert/strict";
import { deriveSwitchRecommendationStatus, switchStatusLabel } from "../src/switch-recommendation";

assert.equal(
  deriveSwitchRecommendationStatus({
    passedRuns: 9,
    borderlineRuns: 0,
    failedRuns: 0,
    criticalFailures: 0,
    experimentStatus: "PASSED"
  }),
  "SAFE_TO_SWITCH"
);

assert.equal(switchStatusLabel("NEEDS_REVIEW"), "Needs review");
