import { SentinelAI } from "../../packages/sdk/src";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

type ChatbotResult = {
  response: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  provider: string;
};

const question = process.argv.slice(2).join(" ") || "Where is my refund and what should I do next?";

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}

loadLocalEnv();

const sentinelApiKey = process.env.SENTINELAI_API_KEY;
const sentinelBaseUrl = process.env.SENTINELAI_BASE_URL ?? "http://localhost:4000/api";

if (!sentinelApiKey) {
  throw new Error("Missing SENTINELAI_API_KEY. Generate a project API key in SentinelAI and add it to .env or your shell.");
}

function countTokensApprox(value: string) {
  return Math.max(1, Math.ceil(value.split(/\s+/).filter(Boolean).length * 1.3));
}

async function fakeSupportBot(userQuestion: string): Promise<ChatbotResult> {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const response =
    "I can help with that. I found that refund questions usually need an order lookup first. Please verify the order ID, check the payment status, and escalate to billing if the refund was promised but not issued.";
  return {
    response,
    promptTokens: countTokensApprox(userQuestion),
    completionTokens: countTokensApprox(response),
    model: "demo-support-bot",
    provider: "local-demo"
  };
}

async function openAiSupportBot(userQuestion: string): Promise<ChatbotResult> {
  if (!process.env.OPENAI_API_KEY) {
    return fakeSupportBot(userQuestion);
  }

  const started = Date.now();
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "You are a concise customer support assistant. Give safe, practical next steps and do not invent account facts."
        },
        { role: "user", content: userQuestion }
      ]
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`OpenAI request failed after ${Date.now() - started}ms: ${response.status} ${message}`);
  }

  const data = (await response.json()) as {
    model: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    choices?: Array<{ message?: { content?: string } }>;
  };
  const botResponse = data.choices?.[0]?.message?.content ?? "";
  return {
    response: botResponse,
    promptTokens: data.usage?.prompt_tokens ?? countTokensApprox(userQuestion),
    completionTokens: data.usage?.completion_tokens ?? countTokensApprox(botResponse),
    model: data.model,
    provider: "openai"
  };
}

async function main() {
  const sentinel = new SentinelAI({
    apiKey: sentinelApiKey,
    baseUrl: sentinelBaseUrl
  });

  const started = Date.now();
  const result = await openAiSupportBot(question);
  const latencyMs = Date.now() - started;
  const totalTokens = result.promptTokens + result.completionTokens;

  const trace = await sentinel.trace({
    name: "example.support_bot",
    provider: result.provider,
    model: result.model,
    prompt: question,
    response: result.response,
    latencyMs,
    tokens: {
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens
    },
    costUsd: result.provider === "openai" ? Number((totalTokens * 0.000002).toFixed(6)) : 0,
    metadata: {
      environment: "local",
      source: "examples/chatbot/support-bot.ts",
      sessionId: `example-${Date.now()}`,
      userId: "example-user"
    }
  });

  console.log("Bot response:");
  console.log(result.response);
  console.log("");
  console.log("SentinelAI trace:");
  console.log(trace);
}

void main();
