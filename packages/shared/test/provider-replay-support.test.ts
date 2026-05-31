import assert from "node:assert/strict";
import {
  buildProviderCapabilityMatrix,
  isCrossProviderRecommendation
} from "../src/shadow/provider-replay-support";

assert.equal(isCrossProviderRecommendation("openai", "openai"), false);
assert.equal(isCrossProviderRecommendation("openai", "groq"), true);

const matrix = buildProviderCapabilityMatrix(new Set(["openai", "groq"]), "api");
const groq = matrix.find((entry) => entry.provider === "groq");
assert.equal(groq?.canVerifyCrossProvider, true);

const simulateMatrix = buildProviderCapabilityMatrix(new Set(["groq"]), "simulate");
assert.equal(simulateMatrix.find((entry) => entry.provider === "groq")?.canVerifyCrossProvider, false);
