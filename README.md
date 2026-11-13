# SentinelAI

[![CI](https://github.com/ksarin10/sentinelAI/actions/workflows/ci.yml/badge.svg)](https://github.com/ksarin10/sentinelAI/actions/workflows/ci.yml)

Verified model switching for LLM applications. SentinelAI ingests production traces, identifies same-provider downgrade candidates per task, replays sampled prompts against the candidate model, and returns a switch recommendation with estimated savings and per-replay evidence.

Switch outcomes:

- **Safe to switch** — pass rate ≥ 90% and zero critical failures
- **Needs review** — pass rate ≥ 75%
- **Do not switch** — pass rate &lt; 75%

Pass rate is `passed / (passed + borderline + failed)`. Borderline replays count against the rate but are not classified as failures.

## Capabilities

- Trace ingestion via REST API or TypeScript SDK
- Crash-safe asynchronous ingestion through a Go gateway
- Task-level cost and quality analytics
- Same-provider model recommendations from catalog pricing
- Background shadow verification (simulate or live provider replay)
- Per-replay verdicts: pass, borderline, or fail, with reasons and risk categories
- Dashboard for overview, tasks, verification evidence, traces, and project settings

## Engineering highlights

- Go ingestion gateway with an AES-GCM-encrypted, fsync-backed spool, per-key capacity isolation, retry backoff, and dead letters
- TypeScript monorepo with separate API, worker, web, SDK, and shared-domain packages
- Asynchronous evaluation and replay jobs backed by Redis and BullMQ
- PostgreSQL persistence with Prisma migrations
- Encrypted per-project provider credentials
- Deterministic simulation mode for local development without provider API calls
- Unit, smoke, and end-to-end test paths enforced by GitHub Actions
- Docker Compose setup for the application and its dependencies

## Architecture

```mermaid
flowchart LR
  subgraph ingest [Ingest]
    SDK[Applications / TypeScript SDK]
    GATEWAY[Go durable gateway]
    SPOOL[(Disk spool)]
    API[apps/api NestJS]
    PG[(PostgreSQL)]
    SDK --> GATEWAY
    GATEWAY --> SPOOL
    GATEWAY --> API --> PG
  end
  subgraph verify [Verify]
    W[apps/worker BullMQ]
    R[Shadow replay OpenAI]
    API --> W
    W --> R
    W --> PG
  end
  subgraph ui [Dashboard]
    WEB[apps/web Next.js]
    WEB --> API
  end
  SHARED[packages/shared verdict + economics]
  API --- SHARED
  W --- SHARED
```

| Package | Role |
| --- | --- |
| `apps/api` | Auth, projects, ingestion, analytics, recommendations, verifications |
| `apps/worker` | BullMQ evaluations and shadow experiments |
| `apps/web` | Dashboard (Overview, Tasks, Verification, Traces, Settings) |
| `services/ingest-gateway` | Durable Go intake, bounded queue, retry workers, metrics, pprof |
| `packages/shared` | Replay verdicts, switch rules, shadow economics |
| `packages/sdk` | Client library for trace ingestion |
| `prisma/` | Schema and migrations |

## Verification workflow

1. Ingest production traces for a project.
2. Configure task profiles (quality threshold, optimization goal) in Settings.
3. Request recommendations; the API queues shadow experiments for verifiable same-provider candidates.
4. The worker samples up to `SHADOW_MAX_REPLAYS_PER_EXPERIMENT` traces (default 8), replays prompts, and scores responses.
5. Review results on the Verification page: aggregate summary, savings estimate, sample confidence, and replay evidence rows.

## Tech stack

TypeScript monorepo (npm workspaces): NestJS, Next.js, PostgreSQL, Prisma, Redis, BullMQ, Docker Compose.

## Getting started

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

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api`
- Durable ingestion: `http://localhost:4100/v1/traces`
- Ingestion metrics and pprof: `http://localhost:4101` (loopback only in Docker Compose)

Copy `NEXT_PUBLIC_*` from `.env` into `apps/web/.env.local` when running the web app outside Docker.

### Docker

```bash
docker compose up -d --build api ingest worker web
```

Recreate containers after changing `.env` (rebuild `web` when `NEXT_PUBLIC_*` changes).

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis for BullMQ |
| `JWT_SECRET` | JWT signing; fallback for provider credential encryption |
| `SHADOW_REPLAY_MODE` | `simulate` (reuse stored evaluation scores) or `api` (live replay) |
| `SHADOW_MAX_REPLAYS_PER_EXPERIMENT` | Max replays per experiment (default `8`) |
| `SHADOW_MIN_SAVINGS_USD` | Minimum estimated savings to queue shadow work |
| `OPENAI_API_KEY` | Live replay and optional LLM judge (Settings or env) |
| `PROVIDER_CREDENTIALS_SECRET` | Encrypts per-project provider keys (defaults to `JWT_SECRET`) |
| `INGEST_MAX_PENDING` | Hard limit for queued and in-flight traces (default `100000`) |
| `INGEST_MAX_PENDING_PER_KEY` | Per-API-key limit that prevents one client from filling the shared queue (default `10000`) |
| `INGEST_WORKERS` | Concurrent upstream delivery workers (default `8`) |
| `INGEST_MAX_ATTEMPTS` | Retry budget before a trace enters the dead-letter directory (default `12`) |
| `INGEST_SPOOL_SECRET` | Secret of at least 32 characters used to encrypt queued payloads and credentials |

## Durable ingestion

Point the SDK at the gateway when the application should not wait for PostgreSQL and evaluation queue work:

```ts
const sentinel = new SentinelAI({
  apiKey: process.env.SENTINELAI_API_KEY!,
  durableIngestionUrl: "http://localhost:4100",
  sourceApp: "checkout-api"
});
```

The gateway requires an idempotency key, encrypts the trace with AES-GCM, writes it to an fsync-backed spool, and only then returns `202 Accepted`. Delivery to the NestJS API is at least once. A project-scoped database constraint makes the sink idempotent, including concurrent retries. When the whole spool reaches its configured limit, the gateway returns `503`; when one API key reaches its share, it returns `429`. Both include `Retry-After: 1` and neither accepts then discards the trace.

Transient network errors, `408`, `429`, and `5xx` responses retry with capped exponential backoff and jitter. Permanent `4xx` responses and exhausted retries are retained as encrypted dead letters. On startup, work found under `processing/` returns to the ready queue unless a durable receipt proves it already completed.

See [the reliability and benchmark report](docs/ingestion-reliability.md) for the failure matrix, reproducible load test, p50/p95/p99 results, and CPU-profile-driven optimization.

## Demo data

In Settings, **Load demo traffic** seeds a project with `support.answer` traces on `gpt-4.1` and a task profile for cost reduction. Run verification from Overview to shadow-test `gpt-4.1-mini`.

```bash
PROJECT_ID=<project-id> npm run demo:seed
npm run smoke
./scripts/e2e-recommendations.sh   # requires API and worker
```

Use `SHADOW_REPLAY_MODE=simulate` for local verification without provider API keys.

## Application routes

| Route | Description |
| --- | --- |
| `/dashboard` | Spend, savings opportunity, latest verification, run verification |
| `/tasks` | Per-task models, candidates, verification status |
| `/verification` | Verification summary and replay evidence |
| `/traces` | Trace list and detail |
| `/settings` | OpenAI credentials, task thresholds, ingestion keys, demo seed |

Redirects: `/projects` → `/settings`, `/catalog` → `/dashboard`.

## Development

```bash
npm run build -w @sentinelai/shared
npm run test
npm run build --workspace=@sentinelai/web
npm run build --workspace=@sentinelai/api
```

## Roadmap

Not in the current release: billing, multi-tenant RBAC, multi-provider marketplace UI, and broad observability dashboards. Cross-provider shadow replay exists in the worker but is not exposed in the primary UI.
