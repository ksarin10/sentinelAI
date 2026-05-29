# SentinelAI

Production-style AI observability and evaluation platform for monitoring LLM applications.

SentinelAI captures model traces, tracks latency and token spend, runs async evaluation pipelines, and provides real-time analytics dashboards for AI systems.
A trace represents a single LLM interaction, including prompts, responses, latency, token usage, and evaluation metadata.

## Key Features

- Real-time LLM trace ingestion
- Async evaluation pipelines with BullMQ workers
- Latency, token, and cost analytics
- Trace explorer for prompt/response inspection
- Modular NestJS backend architecture
- TypeScript SDK for external integrations
- Dockerized local development environment

## Why SentinelAI?

Modern AI systems are probabilistic and difficult to debug. SentinelAI provides observability tooling for monitoring LLM applications, evaluating response quality, and analyzing production behavior across prompts, models, and deployments.

## Technical Highlights

- Modular monorepo architecture
- Async job processing with BullMQ + Redis
- RESTful ingestion APIs
- PostgreSQL + Prisma data modeling
- Shared TypeScript contracts across services
- Dockerized multi-service development workflow
- Real-time analytics dashboard with Recharts

## Architecture

- `apps/api`: NestJS REST API with modular auth, projects, ingestion, traces, analytics, and evaluations.
- `apps/web`: Next.js dashboard with TailwindCSS, shadcn-style primitives, lucide icons, and Recharts.
- `apps/worker`: BullMQ worker for async evaluation jobs.
- `packages/shared`: Shared TypeScript contracts.
- `packages/sdk`: TypeScript SDK for sending traces.
- `prisma/schema.prisma`: PostgreSQL database schema.

## Architecture Diagram
<img width="1121" height="559" alt="image" src="https://github.com/user-attachments/assets/500c6b3a-70bc-4ac8-875d-d587efcad94b" />

## Tech Stack


- NestJS
- Next.js
- PostgreSQL
- Redis/BullMQ
- Docker
- TypeScript

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

### Environment variables

Copy `.env.example` to `.env` at the repo root. For the Next.js dashboard, also copy the `NEXT_PUBLIC_*` values into `apps/web/.env.local`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for BullMQ workers |
| `JWT_SECRET` | Auth token signing secret |
| `NEXT_PUBLIC_API_URL` | Web app API base (default `http://localhost:4000`) |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API (default `http://localhost:3000`) |
| `RUN_CATALOG_SYNC_ON_START` | When `true`, Docker API entrypoint syncs the model catalog after migrations |
| `EVAL_JUDGE_ENABLED` | Set `true` to score traces and shadow replays with the OpenAI judge |
| `EVAL_JUDGE_MODEL` | Judge model id (default `gpt-4.1-mini`) |
| `OPENAI_API_KEY` | Required when judge is enabled |
| `SHADOW_REPLAY_MODE` | `simulate` locally or `api` for live provider replay |
| `SHADOW_MIN_SAVINGS_USD` | Skip shadow jobs below this estimated savings (default `1`) |
| `SHADOW_EARLY_STOP_FAILURES` | Stop replay after this many failures with zero passes (default `5`) |
| `PROVIDER_CREDENTIALS_SECRET` | Encrypts per-project LLM provider keys |

### Docker API startup

The API container runs `prisma migrate deploy`, optionally `npm run model-catalog:sync`, then starts NestJS. Compose example:

```bash
docker compose up -d postgres redis
docker compose up --build api worker web
```

Set `CORS_ORIGINS=http://localhost:3000` on the API service when using the bundled web container.

Compose loads the repo root `.env` into **api** and **worker** via `env_file`. After changing `.env`, recreate containers (rebuild **web** if you changed `NEXT_PUBLIC_*`):

```bash
docker compose up -d --build --force-recreate api worker web
```

### Smoke test

With the API running locally:

```bash
npm run smoke
```

Override `API_URL`, `SMOKE_EMAIL`, or `SMOKE_PASSWORD` as needed.

## Roadmap

- Prompt versioning
- Regression benchmarking
- Multi-model comparisons
- Retrieval quality scoring
- Streaming trace support
- OpenTelemetry integration



