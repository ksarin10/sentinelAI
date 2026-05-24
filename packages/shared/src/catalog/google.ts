import { defineCatalogEntry } from "./helpers";

const SOURCE = "https://ai.google.dev/gemini-api/docs/pricing";

export const googleCatalog = [
  defineCatalogEntry({
    provider: "google",
    model: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    inputTokenPricePer1M: 1.25,
    outputTokenPricePer1M: 10,
    contextWindow: 1048576,
    capabilities: ["text", "vision", "tools", "json", "reasoning"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "google",
    model: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    inputTokenPricePer1M: 0.3,
    outputTokenPricePer1M: 2.5,
    contextWindow: 1048576,
    capabilities: ["text", "vision", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "google",
    model: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    inputTokenPricePer1M: 0.1,
    outputTokenPricePer1M: 0.4,
    contextWindow: 1048576,
    capabilities: ["text", "vision", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "google",
    model: "gemini-2.0-flash-lite",
    displayName: "Gemini 2.0 Flash Lite",
    inputTokenPricePer1M: 0.075,
    outputTokenPricePer1M: 0.3,
    contextWindow: 1048576,
    capabilities: ["text", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "google",
    model: "gemini-1.5-pro",
    displayName: "Gemini 1.5 Pro",
    status: "RETIRING",
    replacementProvider: "google",
    replacementModel: "gemini-2.5-pro",
    retirementDate: "2026-07-01",
    inputTokenPricePer1M: 1.25,
    outputTokenPricePer1M: 5,
    contextWindow: 2097152,
    capabilities: ["text", "vision", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "google",
    model: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    status: "RETIRING",
    replacementProvider: "google",
    replacementModel: "gemini-2.5-flash",
    retirementDate: "2026-07-01",
    inputTokenPricePer1M: 0.075,
    outputTokenPricePer1M: 0.3,
    contextWindow: 1048576,
    capabilities: ["text", "vision", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "google",
    model: "text-embedding-004",
    displayName: "Text Embedding 004",
    inputTokenPricePer1M: 0.004,
    outputTokenPricePer1M: 0,
    contextWindow: 2048,
    capabilities: ["embeddings"],
    sourceUrl: SOURCE
  })
];
