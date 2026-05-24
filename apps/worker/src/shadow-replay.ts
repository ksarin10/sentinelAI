export type ShadowReplayMode = "api" | "simulate";

export function getShadowReplayMode(): ShadowReplayMode {
  return process.env.SHADOW_REPLAY_MODE === "simulate" ? "simulate" : "api";
}

async function replayOpenAi(prompt: string, model: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Answer the user request clearly and safely." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return data.choices?.[0]?.message?.content ?? null;
}

async function replayAnthropic(prompt: string, model: string, apiKey: string) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };

  return data.content?.find((block) => block.type === "text")?.text ?? null;
}

export async function replayCandidatePrompt(
  prompt: string,
  provider: string,
  model: string,
  baselineResponse: string,
  apiKey?: string | null
): Promise<string | null> {
  const mode = getShadowReplayMode();

  if (mode === "simulate") {
    return baselineResponse;
  }

  if (!apiKey) {
    return null;
  }

  if (provider === "openai") {
    return replayOpenAi(prompt, model, apiKey);
  }

  if (provider === "anthropic") {
    return replayAnthropic(prompt, model, apiKey);
  }

  return null;
}
