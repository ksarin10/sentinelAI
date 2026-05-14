const hedgeWords = ["maybe", "possibly", "likely", "unknown", "unclear", "not provided"];
const citationWords = ["according to", "source", "reference", "cited", "based on"];

function tokenize(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}

export function semanticSimilarity(prompt: string, response = "") {
  const promptTokens = tokenize(prompt);
  const responseTokens = tokenize(response);
  if (promptTokens.size === 0 || responseTokens.size === 0) {
    return { score: 0, details: { method: "token_jaccard_fallback" } };
  }
  const overlap = [...promptTokens].filter((token) => responseTokens.has(token)).length;
  const union = new Set([...promptTokens, ...responseTokens]).size;
  return {
    score: Number((overlap / union).toFixed(3)),
    details: { method: "token_jaccard_fallback", overlap, union }
  };
}

export function hallucinationRisk(prompt: string, response = "") {
  const lower = response.toLowerCase();
  const factualClaims = (response.match(/\b(is|are|was|were|will|has|have|had|causes|proves)\b/gi) ?? []).length;
  const numericClaims = (response.match(/\b\d+(\.\d+)?%?\b/g) ?? []).length;
  const hedges = hedgeWords.filter((word) => lower.includes(word)).length;
  const citations = citationWords.filter((word) => lower.includes(word)).length;
  const promptOverlap = semanticSimilarity(prompt, response).score;
  const raw = factualClaims * 0.08 + numericClaims * 0.08 - hedges * 0.05 - citations * 0.12 + (promptOverlap < 0.08 ? 0.25 : 0);
  return {
    score: Number(Math.max(0, Math.min(1, raw)).toFixed(3)),
    details: { factualClaims, numericClaims, hedges, citations, promptOverlap }
  };
}
