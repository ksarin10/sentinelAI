import { isShadowReplayProvider, type ShadowReplayProvider } from "@sentinelai/shared";

export type ShadowReplayMode = "api" | "simulate";

export function getShadowReplayMode(): ShadowReplayMode {
  return process.env.SHADOW_REPLAY_MODE === "simulate" ? "simulate" : "api";
}

async function replayOpenAiCompatible(
  url: string,
  apiKey: string,
  model: string,
  prompt: string,
  extraHeaders: Record<string, string> = {}
) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      ...extraHeaders
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

async function replayGoogle(prompt: string, model: string, apiKey: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

async function replayCohere(prompt: string, model: string, apiKey: string) {
  const response = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }]
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    message?: { content?: Array<{ text?: string }> };
  };

  const textBlock = data.message?.content?.find((block) => typeof block.text === "string");
  return textBlock?.text ?? null;
}

async function replayWithProvider(
  provider: ShadowReplayProvider,
  prompt: string,
  model: string,
  apiKey: string
) {
  switch (provider) {
    case "openai":
      return replayOpenAiCompatible("https://api.openai.com/v1/chat/completions", apiKey, model, prompt);
    case "groq":
      return replayOpenAiCompatible("https://api.groq.com/openai/v1/chat/completions", apiKey, model, prompt);
    case "mistral":
      return replayOpenAiCompatible("https://api.mistral.ai/v1/chat/completions", apiKey, model, prompt);
    case "anthropic":
      return replayAnthropic(prompt, model, apiKey);
    case "google":
      return replayGoogle(prompt, model, apiKey);
    case "cohere":
      return replayCohere(prompt, model, apiKey);
    default:
      return null;
  }
}

export async function replayCandidatePrompt(
  prompt: string,
  provider: string,
  model: string,
  baselineResponse: string,
  apiKey?: string | null,
  options: { allowSimulate?: boolean } = {}
) {
  const normalized = provider.toLowerCase();
  const allowSimulate = options.allowSimulate ?? true;

  if (allowSimulate && getShadowReplayMode() === "simulate") {
    return baselineResponse;
  }

  if (!apiKey || !isShadowReplayProvider(normalized)) {
    return null;
  }

  return replayWithProvider(normalized, prompt, model, apiKey);
}
