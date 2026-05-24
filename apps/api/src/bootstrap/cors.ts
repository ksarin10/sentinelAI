export function parseCorsOrigins(raw: string | undefined) {
  if (!raw?.trim()) {
    return ["http://localhost:3000"];
  }

  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
