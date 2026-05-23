import assert from "node:assert/strict";
import { ModelCatalog, Prisma } from "@prisma/client";
import { toModelCatalogDto } from "../src/model-catalog/model-catalog.dto";

const entry: ModelCatalog = {
  id: "model_1",
  provider: "openai",
  model: "gpt-4.1-mini",
  displayName: "GPT-4.1 mini",
  status: "ACTIVE",
  replacementProvider: null,
  replacementModel: null,
  retirementDate: null,
  inputTokenPricePer1M: new Prisma.Decimal("0.4"),
  outputTokenPricePer1M: new Prisma.Decimal("1.6"),
  contextWindow: 1047576,
  capabilities: ["text", "json"],
  notes: null,
  catalogUpdatedAt: new Date("2026-05-23T00:00:00.000Z"),
  createdAt: new Date("2026-05-23T00:00:00.000Z"),
  updatedAt: new Date("2026-05-23T00:00:00.000Z")
};

assert.deepEqual(toModelCatalogDto(entry), {
  id: "model_1",
  provider: "openai",
  model: "gpt-4.1-mini",
  displayName: "GPT-4.1 mini",
  status: "ACTIVE",
  replacementProvider: null,
  replacementModel: null,
  retirementDate: null,
  inputTokenPricePer1M: 0.4,
  outputTokenPricePer1M: 1.6,
  contextWindow: 1047576,
  capabilities: ["text", "json"],
  notes: null,
  catalogUpdatedAt: "2026-05-23T00:00:00.000Z"
});
