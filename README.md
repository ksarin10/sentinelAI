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

## Roadmap

- Prompt versioning
- Regression benchmarking
- Multi-model comparisons
- Retrieval quality scoring
- Streaming trace support
- OpenTelemetry integration



