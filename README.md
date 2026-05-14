# SentinelAI

SentinelAI is an enterprise AI observability and evaluation platform for capturing model traces, monitoring latency and token spend, and running async quality evaluations.

## Architecture

- `apps/api`: NestJS REST API with modular auth, projects, ingestion, traces, analytics, and evaluations.
- `apps/web`: Next.js dashboard with TailwindCSS, shadcn-style primitives, lucide icons, and Recharts.
- `apps/worker`: BullMQ worker for async evaluation jobs.
- `packages/shared`: Shared TypeScript contracts.
- `packages/sdk`: TypeScript SDK for sending traces.
- `prisma/schema.prisma`: PostgreSQL database schema.

## Core Routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/projects`
- `POST /api/projects`
- `POST /api/projects/:id/api-keys`
- `POST /api/ingest/traces`
- `GET /api/projects/:projectId/traces`
- `GET /api/projects/:projectId/traces/:traceId`
- `GET /api/projects/:projectId/analytics/summary`
- `GET /api/projects/:projectId/analytics/timeseries`
- `POST /api/projects/:projectId/traces/:traceId/evaluations`

## Local Development

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis
npm run prisma:generate
npm run prisma:migrate
npm run dev:api
npm run dev:worker
npm run dev:web
```

The web app runs on `http://localhost:3000`; the API runs on `http://localhost:4000/api`.

## Environment Variables

Create a local `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Use `.env` for local secrets and machine-specific configuration. Do not commit `.env`.

- `DATABASE_URL`: PostgreSQL connection string used by Prisma, the API, and the worker. The Docker Compose setup exposes Postgres on host port `5433` to avoid conflicts with a local Postgres install.
- `REDIS_URL`: Redis connection string used by BullMQ.
- `JWT_SECRET`: Secret used to sign dashboard login tokens. Change this before deploying.
- `NEXT_PUBLIC_API_URL`: Browser-visible API base URL for the Next.js dashboard.
- `API_PORT`: Port for the NestJS API.
- `OPENAI_API_KEY`: Reserved for a future real embeddings scorer. The current worker uses local fallback scoring, so this can stay empty.
- `SENTINELAI_API_KEY`: Optional local variable for scripts or external apps using the SDK. This should be a project API key generated inside SentinelAI.

For deployment, set the same variables in Railway, Render, or your hosting provider's environment variable UI.

## Try the Full Loop

1. Start Postgres and Redis with Docker.
2. Run the API, worker, and web app.
3. Register at `http://localhost:3000/login`.
4. Create a project at `http://localhost:3000/projects`.
5. Click `Send test trace`.
6. Open the dashboard and trace detail pages to see live data and queued evaluation results.

The `Send test trace` button writes a real trace through the backend and queues a BullMQ evaluation job. It is meant for local demos and onboarding.

## SDK Example

```ts
import { SentinelAI } from "@sentinelai/sdk";

const sentinel = new SentinelAI({
  apiKey: process.env.SENTINELAI_API_KEY!,
  baseUrl: "http://localhost:4000/api"
});

await sentinel.trace({
  name: "support.answer",
  provider: "openai",
  model: "gpt-4.1-mini",
  prompt: "Summarize this customer issue",
  response: "The customer reports a delayed shipment.",
  latencyMs: 642,
  tokens: { promptTokens: 120, completionTokens: 80, totalTokens: 200 },
  costUsd: 0.0032,
  metadata: { environment: "production", tags: ["support"] }
});
```

## Test With an Example Chatbot

Use the example chatbot script to prove SentinelAI can connect to a real AI application.

First, create a project in the SentinelAI UI and create an API key. Put that key in `.env`:

```bash
SENTINELAI_API_KEY="sai_your_generated_project_key"
```

Make sure the API and worker are running:

```bash
npm run dev:api
npm run dev:worker
```

Then run:

```bash
npm run example:chatbot -- "A customer says their refund has not arrived. What should the bot say?"
```

By default this uses a local fake support-bot response, then sends the prompt and response to SentinelAI through the SDK source package. If `OPENAI_API_KEY` is set, the same script will call OpenAI first, then send the real model response to SentinelAI.

After it runs, refresh the dashboard. You should see a new trace named `example.support_bot`.

## Deployment Notes

The included Dockerfiles and `docker-compose.yml` can be used locally or adapted for Railway and Render. Configure `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and `NEXT_PUBLIC_API_URL` in the target platform.
