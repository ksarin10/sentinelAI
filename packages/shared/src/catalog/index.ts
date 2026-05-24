import { anthropicCatalog } from "./anthropic";
import { cohereCatalog } from "./cohere";
import { googleCatalog } from "./google";
import { groqCatalog } from "./groq";
import { CATALOG_VERSION } from "./helpers";
import { mistralCatalog } from "./mistral";
import { openAiCatalog } from "./openai";

export { CATALOG_VERSION };

export const modelCatalog = [
  ...openAiCatalog,
  ...anthropicCatalog,
  ...googleCatalog,
  ...mistralCatalog,
  ...groqCatalog,
  ...cohereCatalog
];

/** @deprecated Use modelCatalog */
export const initialModelCatalog = modelCatalog;

export const catalogProviders = [...new Set(modelCatalog.map((entry) => entry.provider))].sort();
