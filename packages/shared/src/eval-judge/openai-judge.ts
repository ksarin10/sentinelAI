import { buildJudgeSystemPrompt, DEFAULT_JUDGE_METRICS, DEFAULT_JUDGE_RUBRIC_VERSION } from "./default-rubric";
import type { JudgeMetric, JudgeRequest, JudgeResult, JudgeScores } from "./types";

export type OpenAiJudgeConfig = {
  apiKey: string;
  model?: string;
  rubricVersion?: string;
  maxPromptChars?: number;
  maxResponseChars?: number;
};

function clampScore(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.max(0, Math.min(1, Number(numeric.toFixed(3))));
}

function truncate(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return text;
  }
  return `${text.slice(0, maxChars)}\n...[truncated]`;
}

export function parseJudgeResponse(raw: string, metrics: JudgeMetric[]): JudgeScores | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }

  const scores = {} as Record<string, number>;
  for (const metric of metrics) {
    const value = clampScore(parsed[metric]);
    if (value === null) {
      return null;
    }
    scores[metric] = value;
  }

  const rationale = typeof parsed.rationale === "string" ? parsed.rationale.trim() : "";
  if (!rationale) {
    return null;
  }

  return { ...scores, rationale } as JudgeScores;
}

export async function runOpenAiJudge(request: JudgeRequest, config: OpenAiJudgeConfig): Promise<JudgeResult> {
  const metrics = request.metrics ?? DEFAULT_JUDGE_METRICS;
  const model = config.model ?? "gpt-4.1-mini";
  const maxPromptChars = config.maxPromptChars ?? 6000;
  const maxResponseChars = config.maxResponseChars ?? 6000;

  const userContent = [
    request.context ? `Context:\n${truncate(request.context, maxPromptChars)}` : null,
    `User prompt:\n${truncate(request.prompt, maxPromptChars)}`,
    `Model response:\n${truncate(request.response, maxResponseChars)}`
  ]
    .filter(Boolean)
    .join("\n\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildJudgeSystemPrompt(metrics) },
        { role: "user", content: userContent }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Judge request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Judge response was empty");
  }

  const scores = parseJudgeResponse(content, metrics);
  if (!scores) {
    throw new Error("Judge response could not be parsed");
  }

  return {
    method: "llm_judge_v1",
    model,
    rubricVersion: config.rubricVersion ?? DEFAULT_JUDGE_RUBRIC_VERSION,
    scores
  };
}
