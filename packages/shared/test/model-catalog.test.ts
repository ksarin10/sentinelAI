import assert from "node:assert/strict";
import { catalogProviders, initialModelCatalog, modelCatalog } from "../src/model-catalog";

const keys = new Set<string>();

for (const entry of modelCatalog) {
  const key = `${entry.provider}:${entry.model}`;
  assert.equal(keys.has(key), false, `Duplicate model catalog entry: ${key}`);
  keys.add(key);

  assert.ok(entry.displayName.length > 0, `${key} needs a display name`);
  assert.ok(entry.inputTokenPricePer1M >= 0, `${key} needs a valid input token price`);
  assert.ok(entry.outputTokenPricePer1M >= 0, `${key} needs a valid output token price`);
  assert.ok(entry.capabilities.length > 0, `${key} needs at least one capability`);
  assert.ok(entry.source, `${key} needs a catalog source`);
  assert.ok(entry.sourceUrl, `${key} needs a source URL`);

  if (entry.status === "RETIRING" || entry.status === "DEPRECATED") {
    assert.ok(entry.replacementModel, `${key} needs a replacement model`);
  }
}

assert.ok(modelCatalog.length >= 30, "Expected an extensive curated catalog");
assert.equal(initialModelCatalog.length, modelCatalog.length);
assert.deepEqual(catalogProviders, ["anthropic", "cohere", "google", "groq", "mistral", "openai"]);
