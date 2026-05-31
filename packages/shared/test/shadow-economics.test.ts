import assert from "node:assert/strict";
import { planShadowVerification, readShadowEconomicsConfig } from "../src/shadow/shadow-economics";

const config = readShadowEconomicsConfig({
  SHADOW_MAX_REPLAYS_PER_EXPERIMENT: "6",
  SHADOW_MAX_EXPERIMENTS_PER_PROJECT_PER_DAY: "10",
  SHADOW_MIN_SAVINGS_USD: "0",
  SHADOW_EARLY_STOP_FAILURES: "3"
} as NodeJS.ProcessEnv);

assert.equal(config.maxReplaysPerExperiment, 6);
assert.equal(config.maxExperimentsPerProjectPerDay, 10);

const crossBlocked = planShadowVerification({
  baselineProvider: "openai",
  candidateProvider: "groq",
  candidateProviderHasKey: false,
  shadowReplayMode: "simulate"
});
assert.equal(crossBlocked.canRun, false);

const crossOk = planShadowVerification({
  baselineProvider: "openai",
  candidateProvider: "groq",
  candidateProviderHasKey: true,
  shadowReplayMode: "api"
});
assert.equal(crossOk.canRun, true);
