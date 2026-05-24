# Production checklist (deploy, testing, security)

Companion to [MODEL_OPS_PLAN.md](./MODEL_OPS_PLAN.md).

## Deploy

- [ ] Docker entrypoint: `prisma migrate deploy` before API start
- [ ] Release job: `npm run model-catalog:sync` after migrate
- [ ] `GET /api/health` — DB + Redis connectivity
- [ ] `render.yaml` / Railway: `SHADOW_REPLAY_MODE=api`, judge keys, `JWT_SECRET`, `NEXT_PUBLIC_API_URL`
- [ ] CORS allowlist (web origin only)
- [ ] Do not set `NEXT_PUBLIC_ENABLE_MODEL_CATALOG` in production

## Testing

- [ ] GitHub Actions: install, prisma generate, typecheck, all workspace tests
- [ ] Integration test: register → project → ingest → eval complete
- [ ] Integration test: shadow simulate → recommendation visible
- [ ] Smoke script for staging (`scripts/smoke.sh`)

## Security

- [ ] Rate limit ingest per API key
- [ ] Payload size limits on trace prompt/response
- [ ] Secrets via platform env (not committed)
- [ ] API key rotation / revoke UI (exists — verify)

## Observability

- [ ] Structured JSON logs in API/worker
- [ ] Job failure alerts (shadow, eval, catalog sync)
- [ ] Basic metrics: queue depth, eval latency, shadow pass rate
