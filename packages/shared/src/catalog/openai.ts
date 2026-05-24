import { defineCatalogEntry } from "./helpers";

const SOURCE = "https://openai.com/api/pricing";

export const openAiCatalog = [
  defineCatalogEntry({
    provider: "openai",
    model: "gpt-4.1",
    displayName: "GPT-4.1",
    inputTokenPricePer1M: 2,
    outputTokenPricePer1M: 8,
    contextWindow: 1047576,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "openai",
    model: "gpt-4.1-mini",
    displayName: "GPT-4.1 mini",
    inputTokenPricePer1M: 0.4,
    outputTokenPricePer1M: 1.6,
    contextWindow: 1047576,
    capabilities: ["text", "vision", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "openai",
    model: "gpt-4.1-nano",
    displayName: "GPT-4.1 nano",
    inputTokenPricePer1M: 0.1,
    outputTokenPricePer1M: 0.4,
    contextWindow: 1047576,
    capabilities: ["text", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "openai",
    model: "gpt-4o",
    displayName: "GPT-4o",
    inputTokenPricePer1M: 2.5,
    outputTokenPricePer1M: 10,
    contextWindow: 128000,
    capabilities: ["text", "vision", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "openai",
    model: "gpt-4o-mini",
    displayName: "GPT-4o mini",
    inputTokenPricePer1M: 0.15,
    outputTokenPricePer1M: 0.6,
    contextWindow: 128000,
    capabilities: ["text", "vision", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "openai",
    model: "o1",
    displayName: "OpenAI o1",
    inputTokenPricePer1M: 15,
    outputTokenPricePer1M: 60,
    contextWindow: 200000,
    capabilities: ["text", "reasoning", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "openai",
    model: "o1-mini",
    displayName: "OpenAI o1 mini",
    inputTokenPricePer1M: 1.1,
    outputTokenPricePer1M: 4.4,
    contextWindow: 128000,
    capabilities: ["text", "reasoning", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "openai",
    model: "o3-mini",
    displayName: "OpenAI o3 mini",
    inputTokenPricePer1M: 1.1,
    outputTokenPricePer1M: 4.4,
    contextWindow: 200000,
    capabilities: ["text", "reasoning", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "openai",
    model: "gpt-4-turbo",
    displayName: "GPT-4 Turbo",
    status: "DEPRECATED",
    replacementProvider: "openai",
    replacementModel: "gpt-4.1",
    inputTokenPricePer1M: 10,
    outputTokenPricePer1M: 30,
    contextWindow: 128000,
    capabilities: ["text", "vision", "tools", "json"],
    notes: "Legacy high-cost model kept for migration reporting.",
    sourceUrl: SOURCE,
    confidence: 0.85
  }),
  defineCatalogEntry({
    provider: "openai",
    model: "text-embedding-3-small",
    displayName: "Text Embedding 3 Small",
    inputTokenPricePer1M: 0.02,
    outputTokenPricePer1M: 0,
    contextWindow: 8191,
    capabilities: ["embeddings"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "openai",
    model: "text-embedding-3-large",
    displayName: "Text Embedding 3 Large",
    inputTokenPricePer1M: 0.13,
    outputTokenPricePer1M: 0,
    contextWindow: 8191,
    capabilities: ["embeddings"],
    sourceUrl: SOURCE
  })
];
