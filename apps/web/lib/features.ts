/**
 * Model catalog browse UI: on in local dev, off in production builds unless explicitly enabled.
 * Set NEXT_PUBLIC_ENABLE_MODEL_CATALOG=false to hide during `next dev`.
 */
export const modelCatalogUiEnabled =
  process.env.NEXT_PUBLIC_ENABLE_MODEL_CATALOG === "true" ||
  (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_ENABLE_MODEL_CATALOG !== "false");
