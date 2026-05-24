import { defineCatalogEntry } from "./helpers";

const SOURCE = "https://docs.cohere.com/docs/models";

export const cohereCatalog = [
  defineCatalogEntry({
    provider: "cohere",
    model: "command-r-plus",
    displayName: "Command R+",
    inputTokenPricePer1M: 2.5,
    outputTokenPricePer1M: 10,
    contextWindow: 128000,
    capabilities: ["text", "tools", "json", "reasoning"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "cohere",
    model: "command-r",
    displayName: "Command R",
    inputTokenPricePer1M: 0.15,
    outputTokenPricePer1M: 0.6,
    contextWindow: 128000,
    capabilities: ["text", "tools", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "cohere",
    model: "command-light",
    displayName: "Command Light",
    inputTokenPricePer1M: 0.1,
    outputTokenPricePer1M: 0.1,
    contextWindow: 4096,
    capabilities: ["text", "json"],
    sourceUrl: SOURCE
  }),
  defineCatalogEntry({
    provider: "cohere",
    model: "embed-english-v3.0",
    displayName: "Embed English v3",
    inputTokenPricePer1M: 0.1,
    outputTokenPricePer1M: 0,
    contextWindow: 512,
    capabilities: ["embeddings"],
    sourceUrl: SOURCE
  })
];
