export type ShadowReplayMode = "api" | "simulate";

export function getShadowReplayMode(): ShadowReplayMode {
  return process.env.SHADOW_REPLAY_MODE === "simulate" ? "simulate" : "api";
}

export async function replayCandidatePrompt(
  prompt: string,
  provider: string,
  model: string,
  baselineResponse: string
): Promise<string | null> {
  const mode = getShadowReplayMode();

  if (mode === "simulate") {
    return baselineResponse;
  }

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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

  return null;
}
