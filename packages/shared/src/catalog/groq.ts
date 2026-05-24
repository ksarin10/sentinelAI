import { defineCatalogEntry } from "./helpers";

const SOURCE = "https://groq.com/pricing";

export const groqCatalog = [
  defineCatalogEntry({
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    displayName: "Llama 3.3 70B",
    inputTokenPricePer1M: 0.59,
    outputTokenPricePer1M: 0.79,
    contextWindow: 128000,
    capabilities: ["text", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "groq",
    model: "llama-3.1-8b-instant",
    displayName: "Llama 3.1 8B Instant",
    inputTokenPricePer1M: 0.05,
    outputTokenPricePer1M: 0.08,
    contextWindow: 131072,
    capabilities: ["text", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "groq",
    model: "mixtral-8x7b-32768",
    displayName: "Mixtral 8x7B",
    inputTokenPricePer1M: 0.24,
    outputTokenPricePer1M: 0.24,
    contextWindow: 32768,
    capabilities: ["text", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "groq",
    model: "gemma2-9b-it",
    displayName: "Gemma 2 9B",
    inputTokenPricePer1M: 0.2,
    outputTokenPricePer1M: 0.2,
    contextWindow: 8192,
    capabilities: ["text", "json"],
    sourceUrl: SOURCE
  })
];
