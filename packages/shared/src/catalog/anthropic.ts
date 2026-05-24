import { defineCatalogEntry } from "./helpers";

const SOURCE = "https://docs.anthropic.com/en/docs/about-claude/models";

export const anthropicCatalog = [
  defineCatalogEntry({
    provider: "anthropic",
    model: "claude-opus-4.6",
    displayName: "Claude Opus 4.6",
    inputTokenPricePer1M: 15,
    outputTokenPricePer1M: 75,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "anthropic",
    model: "claude-opus-4.1",
    displayName: "Claude Opus 4.1",
    inputTokenPricePer1M: 15,
    outputTokenPricePer1M: 75,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "anthropic",
    model: "claude-sonnet-4.6",
    displayName: "Claude Sonnet 4.6",
    inputTokenPricePer1M: 3,
    outputTokenPricePer1M: 15,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "anthropic",
    model: "claude-sonnet-4.5",
    displayName: "Claude Sonnet 4.5",
    status: "RETIRING",
    replacementProvider: "anthropic",
    replacementModel: "claude-sonnet-4.6",
    retirementDate: "2026-09-01",
    inputTokenPricePer1M: 3,
    outputTokenPricePer1M: 15,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    notes: "Lifecycle placeholder used for migration readiness demos.",
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "anthropic",
    model: "claude-haiku-4.5",
    displayName: "Claude Haiku 4.5",
    inputTokenPricePer1M: 0.8,
    outputTokenPricePer1M: 4,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "anthropic",
    model: "claude-3-7-sonnet-latest",
    displayName: "Claude 3.7 Sonnet",
    status: "RETIRING",
    replacementProvider: "anthropic",
    replacementModel: "claude-sonnet-4.6",
    retirementDate: "2026-08-01",
    inputTokenPricePer1M: 3,
    outputTokenPricePer1M: 15,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "anthropic",
    model: "claude-3-5-haiku-latest",
    displayName: "Claude 3.5 Haiku",
    inputTokenPricePer1M: 0.8,
    outputTokenPricePer1M: 4,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "anthropic",
    model: "claude-3-5-sonnet-latest",
    displayName: "Claude 3.5 Sonnet",
    status: "DEPRECATED",
    replacementProvider: "anthropic",
    replacementModel: "claude-sonnet-4.6",
    inputTokenPricePer1M: 3,
    outputTokenPricePer1M: 15,
    contextWindow: 200000,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    sourceUrl: SOURCE,
    confidence: 0.85
  })
];
