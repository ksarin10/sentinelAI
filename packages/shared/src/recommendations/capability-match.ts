import type { ModelCapability } from "../model-catalog";

export const DEFAULT_REQUIRED_CAPABILITIES: ModelCapability[] = ["text"];

export type CatalogCapabilities = {
  capabilities: string[];
  contextWindow?: number | null;
};

export function inferRequiredCapabilities(_taskName: string, current?: CatalogCapabilities): ModelCapability[] {
  const required: ModelCapability[] = [...DEFAULT_REQUIRED_CAPABILITIES];
  if (current?.capabilities.includes("tools")) {
    required.push("tools");
  }
  return required;
}

export function catalogSupportsCapabilities(entry: CatalogCapabilities, required: ModelCapability[]) {
  const available = new Set(entry.capabilities);
  return required.every((capability) => available.has(capability));
}
