import assert from "node:assert/strict";
import { initialModelCatalog } from "../src/model-catalog";

const keys = new Set<string>();

for (const entry of initialModelCatalog) {
  const key = `${entry.provider}:${entry.model}`;
  assert.equal(keys.has(key), false, `Duplicate model catalog entry: ${key}`);
  keys.add(key);

  assert.ok(entry.displayName.length > 0, `${key} needs a display name`);
  assert.ok(entry.inputTokenPricePer1M >= 0, `${key} needs a valid input token price`);
  assert.ok(entry.outputTokenPricePer1M >= 0, `${key} needs a valid output token price`);
  assert.ok(entry.capabilities.length > 0, `${key} needs at least one capability`);

  if (entry.status === "RETIRING" || entry.status === "DEPRECATED") {
    assert.ok(entry.replacementModel, `${key} needs a replacement model`);
  }
}

assert.ok(initialModelCatalog.length >= 3, "Expected enough models to compare optimization candidates");
