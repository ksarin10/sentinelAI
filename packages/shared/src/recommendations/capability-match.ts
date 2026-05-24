import type { ModelCapability } from "../model-catalog";

export const DEFAULT_REQUIRED_CAPABILITIES: ModelCapability[] = ["text"];

export type CatalogCapabilities = {
  capabilities: string[];
  contextWindow?: number | null;
};

export function inferRequiredCapabilities(_taskName: string): ModelCapability[] {
  return [...DEFAULT_REQUIRED_CAPABILITIES];
}

export function catalogSupportsCapabilities(entry: CatalogCapabilities, required: ModelCapability[]) {
  const available = new Set(entry.capabilities);
  return required.every((capability) => available.has(capability));
}
