import { defineCatalogEntry } from "./helpers";

const SOURCE = "https://docs.mistral.ai/getting-started/models/models_overview/";

export const mistralCatalog = [
  defineCatalogEntry({
    provider: "mistral",
    model: "mistral-large-latest",
    displayName: "Mistral Large",
    inputTokenPricePer1M: 2,
    outputTokenPricePer1M: 6,
    contextWindow: 128000,
    capabilities: ["text", "tools", "json", "reasoning"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "mistral",
    model: "mistral-small-latest",
    displayName: "Mistral Small",
    inputTokenPricePer1M: 0.2,
    outputTokenPricePer1M: 0.6,
    contextWindow: 128000,
    capabilities: ["text", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "mistral",
    model: "codestral-latest",
    displayName: "Codestral",
    inputTokenPricePer1M: 0.3,
    outputTokenPricePer1M: 0.9,
    contextWindow: 256000,
    capabilities: ["text", "json", "reasoning"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "mistral",
    model: "open-mistral-nemo",
    displayName: "Mistral Nemo",
    inputTokenPricePer1M: 0.15,
    outputTokenPricePer1M: 0.15,
    contextWindow: 128000,
    capabilities: ["text", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "mistral",
    model: "mistral-embed",
    displayName: "Mistral Embed",
    inputTokenPricePer1M: 0.1,
    outputTokenPricePer1M: 0,
    contextWindow: 8192,
    capabilities: ["embeddings"],
    sourceUrl: SOURCE
  })
];
