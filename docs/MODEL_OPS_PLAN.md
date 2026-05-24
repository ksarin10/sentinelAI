# SentinelAI Model Ops — Production Plan

This document defines **methodology, architecture, and phased implementation** for the five core model-ops capabilities. It is the source of truth before refactors land.

**Principles**

1. **No recommendation without evidence** — shadow verification or sufficient production traffic on the candidate.
2. **Pluggable evaluators** — heuristic baseline today; LLM judge as default in prod; human labels override everything.
3. **Catalog is operational data** — versioned, sourced, periodically refreshed; never silently stale.
4. **Task-aware** — every decision is scoped to `taskName` + `TaskProfile` (risk, quality bar, optimization goal).
5. **Observable pipelines** — every async step (eval, shadow, catalog sync) is idempotent, logged, and testable.

---

## 1. Evaluations — LLM-as-judge

### Current state

- Worker runs **token Jaccard** (semantic similarity) and a **rule-based hallucination score** on ingest.
- Fast and cheap; not aligned with human judgment or task-specific rubrics.

### Target state

- **Primary path**: configurable **LLM judge** per project/task (or global default).
- **Fallback path**: heuristics when judge disabled, budget exceeded, or provider error.
- **Optional**: human labels stored on traces/evaluations and used as ground truth for calibration.

### Methodology

#### 1.1 Evaluation contract

Each evaluation produces **normalized scores** in `[0, 1]` with provenance:

| Metric | Meaning | Judge output |
|--------|---------|----------------|
| `semantic_similarity` | Response addresses the user/task intent | 0–1 + rationale |
| `hallucination_risk` | Unsupported or contradictory claims vs prompt/context | 0–1 + rationale |
| `task_success` (optional) | Task-specific rubric (support tone, policy adherence) | pass/fail or 0–1 |

Store in `EvaluationScore`:

```json
{
  "method": "llm_judge_v1",
  "model": "gpt-4.1-mini",
  "rubricVersion": "support.answer/v2",
  "rationale": "...",
  "promptHash": "..."
}
```

#### 1.2 Judge pipeline (worker)

```
Trace ingested → Evaluation QUEUED
  → resolve EvalConfig(projectId, taskName)
  → if judge enabled and within budget:
       build judge prompt (system rubric + user prompt + response + optional retrieval context from metadata)
       call JudgeProvider (OpenAI / Anthropic / etc.)
       parse structured JSON scores
     else:
       run heuristic fallback
  → upsert EvaluationScore rows → COMPLETED
```

**Structured output** — require JSON schema from judge; retry once on parse failure; fail evaluation with reason if still invalid.

#### 1.3 Rubric design

- **Global default rubric** in repo (`packages/shared/src/eval-rubrics/default.ts`).
- **Task overrides** via `TaskProfile.evalRubricId` or inline rubric text in DB (later).
- Rubrics must specify: what “good” means, what counts as hallucination, and whether to use only `prompt` or also `metadata.context` / RAG chunks.

Example judge system prompt (sketch):

> You are an evaluator. Score semantic_similarity and hallucination_risk from 0 to 1. Base hallucination only on the provided prompt and context, not world knowledge. Return JSON: `{ "semantic_similarity": number, "hallucination_risk": number, "rationale": string }`.

#### 1.4 Cost & safety controls

- `EVAL_JUDGE_MODEL` env + per-project cap (max judge calls/day).
- Truncate prompt/response to token budget before judge call.
- **PII**: optional redaction pass before sending to external judge.
- **Idempotency**: same `evaluationId` → same job; re-run creates new evaluation version or no-op if COMPLETED.

#### 1.5 Human labels (phase 2)

- UI on trace detail: thumbs up/down + optional correction text.
- Write `EvaluationScore` with `method: "human"` — takes precedence in analytics and shadow baselines.
- Use labeled set to **regression-test** judge prompts (offline benchmark job).

### Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **E1** | `EvalConfig` table + env; `JudgeProvider` interface; OpenAI implementation |
| **E2** | Wire worker: judge primary, heuristic fallback; structured parsing |
| **E3** | Task-level rubric resolution from `TaskProfile` |
| **E4** | Budget caps, failure metrics, admin toggle per project |
| **E5** | Human labels API + UI; benchmark script |

### Success metrics

- Judge vs heuristic agreement rate on sample set (target: document, not block ship).
- Evaluation p95 latency & cost per trace.
- Zero silent failures (all FAILED have `reason`).

---

## 2. Shadow experiments — comprehensive verification

### Current state

- Background jobs compare baseline vs candidate per task.
- `SHADOW_REPLAY_MODE=simulate` reuses baseline response (dev only).
- Pass/fail gates recommendations.

### Target state

- **Multi-mode replay**: production traffic proof, live API replay, and optional cached fixtures.
- **Provider abstraction** for candidate inference.
- **Statistical gate** — not single-trace luck.

### Methodology

#### 2.1 When to run a shadow experiment

Trigger when `findRecommendationCandidates()` proposes `(task, baseline → candidate)` AND:

- Candidate has **< N** successful production traces on that task (default N=5), OR
- Baseline cost savings estimate ≥ X% and task profile allows experimentation.

Do **not** re-queue if a PASSED experiment exists for the same tuple within TTL (e.g. 7 days).

#### 2.2 Experiment design

| Mode | When | What happens |
|------|------|----------------|
| **production_proof** | Candidate already has ≥ N healthy traces on task | Compare candidate production scores vs baseline; no extra API spend |
| **api_replay** | Candidate under-trafficked | Re-run prompt from sample of baseline traces through candidate model |
| **simulate** | `NODE_ENV=development` only | Copy baseline response; validates pipeline only |

Sample size `K` (default 10) traces: stratified by recency and latency; exclude ERROR traces.

#### 2.3 Pass criteria (statistical)

For each experiment, compute on K runs:

- `mean_semantic_candidate` ≥ `qualityThreshold` (from TaskProfile)
- `mean_semantic_candidate` ≥ `mean_semantic_baseline - δ` (δ = 0.05 default)
- `mean_hallucination_candidate` ≤ `mean_hallucination_baseline + ε` (ε = 0.05)
- `error_rate_candidate` ≤ baseline error rate + tolerance

**PASS** if all hold and at least `ceil(0.8 * K)` individual runs pass per-run checks.

Store aggregates on `ShadowExperiment` + per-run rows in `ShadowExperimentRun`.

#### 2.4 Provider routing

```
CandidateReplayRouter
  ├── openai    → OpenAI chat completions
  ├── anthropic → Messages API
  ├── google    → Gemini API
  └── groq      → Groq OpenAI-compatible
```

- Resolve API keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc. (project-level keys in phase 2).
- Same **judge** scores replay output (not heuristics) for api_replay mode.
- Timeout, retry once, mark run failed on hard error.

#### 2.5 Cost control

- Max concurrent shadow jobs per project.
- Max replays/day per project (config).
- Skip api_replay for candidates with $/token above baseline unless `optimizationGoal` allows quality spend.

### Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **S1** | Refactor `run-shadow-experiment.ts` into modes: production_proof \| api_replay \| simulate |
| **S2** | `CandidateReplayRouter` + OpenAI replay (prod default) |
| **S3** | Anthropic + Google replay; env key matrix documented |
| **S4** | Use LLM judge scores on replay outputs (depends E2) |
| **S5** | Experiment TTL, deduping, metrics dashboard (internal) |

### Environment matrix

| Environment | `SHADOW_REPLAY_MODE` | Keys required |
|-------------|----------------------|---------------|
| Local dev | `simulate` (default) | None |
| Staging | `api` | Provider keys for candidates under test |
| Production | `api` | Same; never `simulate` |

---

## 3. Catalog — live updates without lying

### Current state

- Curated static JSON (~39 models), manual sync script + `POST /model-catalog/sync`.
- Source metadata on rows; no scheduler.

### Target state

- **Layered catalog**: curated baseline + optional provider adapters.
- **Scheduled refresh** with diff audit; stale pricing flagged.
- **No auto-overwrite** of lifecycle fields without human review queue.

### Methodology

#### 3.1 Data layers

```
┌─────────────────────────────────────┐
│  Curated catalog (git / shared pkg) │  ← lifecycle, replacements, capabilities
└──────────────┬──────────────────────┘
               │ merge
┌──────────────▼──────────────────────┐
│  Provider adapters (optional)       │  ← pricing, context windows from APIs/docs
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  ModelCatalog (Postgres)            │  ← operational source for app
└─────────────────────────────────────┘
```

#### 3.2 Merge rules

| Field | Source priority |
|-------|-----------------|
| `inputTokenPricePer1M`, `outputTokenPricePer1M` | Adapter if fresh (< 7d) else curated |
| `contextWindow` | Adapter > curated |
| `status`, `replacementModel`, `retirementDate` | **Curated only** (manual PR) until review UI exists |
| `capabilities` | Union of curated + adapter |
| `source`, `sourceUrl`, `confidence`, `lastCheckedAt` | Set per winning source |

#### 3.3 Refresh cadence

- **BullMQ cron job** `catalog-sync` weekly (configurable).
- On deploy: `prisma migrate deploy` + **one-shot sync** from curated (already have script).
- Adapter failures: log warning, keep last DB values, lower `confidence` if stale > 30d.

#### 3.4 Provider adapters (phased)

| Adapter | Phase | Notes |
|---------|-------|-------|
| OpenAI pricing page / models API | P1 | Highest traffic |
| Anthropic docs scrape or API | P2 | |
| Google Gemini pricing | P2 | |
| Others | P3 | Stay curated-only |

Start with **deterministic fetch + parse** into adapter interface; no LLM for pricing.

#### 3.5 Review workflow (phase 2)

- `CatalogChangeProposal` table: field diffs awaiting approve.
- Admin UI or GitHub-only for MVP.

### Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **C1** | `CatalogSyncService` in API/worker with merge rules; cron job |
| **C2** | OpenAI adapter (pricing only) |
| **C3** | Staleness alerts in logs; `confidence` decay |
| **C4** | Second adapter + change proposal table |

---

## 4. Recommendations — accurate, explainable methodology

### Current state

- Candidates from catalog price + task analytics; gated by shadow PASS.
- Easy to show empty state without docs.

### Target state

- **Explicit recommendation types** with evidence bundle shown in UI.
- **Conservative by default** for HIGH risk tasks.

### Methodology

#### 4.1 Recommendation types

| Type | Condition | Evidence required |
|------|-----------|-------------------|
| `REDUCE_COST` | Cheaper model, same provider or trusted cross-provider | Shadow PASS or production_proof |
| `REDUCE_LATENCY` | Lower p50 latency on task with ≥ N traces | Production stats only |
| `MIGRATION` | Baseline RETIRING/DEPRECATED | Lifecycle + shadow or production_proof on replacement |
| `QUALITY_WARNING` | Baseline below quality threshold | No model switch; alert only |

#### 4.2 Candidate scoring (ranking)

For each `(task, baseline)` compute eligible catalog models:

1. **Capability filter** — must cover task needs (tools, vision, json) from trace metadata or TaskProfile.
2. **Lifecycle filter** — ACTIVE only for cost recommendations.
3. **Savings estimate** — blended token price × task’s historical input/output token ratio.
4. **Quality guard** — skip if risk HIGH unless shadow PASS with margin δ.
5. **Rank** by: `expected_savings_usd` × confidence_multiplier(shadow status).

#### 4.3 Confidence levels

| Level | Meaning |
|-------|---------|
| **HIGH** | Shadow api_replay PASSED, K≥10, savings ≥15% |
| **MEDIUM** | production_proof PASSED or shadow K=5–9 |
| **LOW** | Heuristic-only pre-shadow queue (internal; **not shown to users**) |

**User-visible API returns only MEDIUM and HIGH** (current behavior extended).

#### 4.4 Explanation payload

Each recommendation returns:

- `rationale[]` — human bullets (cost, quality comparison, lifecycle).
- `signals` — trace count, averages, threshold, experiment id link (internal).
- `verification` — `{ method: "shadow_passed", experimentId, completedAt }`.

#### 4.5 Empty state semantics

Dashboard copy should distinguish:

- “Not enough traces” (< 5 per task/model)
- “Experiments running” (shadow QUEUED/RUNNING)
- “No safe candidate” (candidates failed shadow)
- “Task unhealthy” (error rate or quality below threshold)

### Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **R1** | Refactor `recommendation-candidates.ts` + types for verification block |
| **R2** | Empty-state reason codes in API + dashboard |
| **R3** | QUALITY_WARNING type; HIGH risk stricter gates |
| **R4** | Cross-provider capability matrix in shared package |

---

## 5. Task profiles — configuration surface

### Current state

- `TaskProfile` in DB; used by recommendation engine; demo seed only; **no UI**.

### Target state

- CRUD UI per project; drives eval rubric, shadow strictness, and recommendation behavior.

### Methodology

#### 5.1 Fields (existing + planned)

| Field | Purpose |
|-------|---------|
| `taskName` | Matches `trace.name` or `metadata.task` key |
| `riskLevel` | LOW / MEDIUM / HIGH — gates shadow and recommendation aggressiveness |
| `qualityThreshold` | Min semantic score (0–1) |
| `optimizationGoal` | BALANCED / REDUCE_COST / REDUCE_LATENCY / MAXIMIZE_QUALITY |
| `evalRubricId` (new) | Optional judge rubric override |
| `notes` | Operator documentation |

#### 5.2 Defaults

- Unknown tasks inherit **project default profile** (new `Project.defaultTaskProfile` JSON or single DEFAULT row).
- On first trace for new `taskName`, auto-create profile with MEDIUM risk, 0.8 threshold, BALANCED goal (optional, configurable).

#### 5.3 UI (Projects page or `/projects/:id/tasks`)

- Table of task profiles + edit drawer.
- Inline validation; show how many traces in last 7d per task.
- Link to recommendations/migrations filtered by task.

### Implementation phases

| Phase | Deliverable |
|-------|-------------|
| **T1** | REST CRUD for task profiles (likely exists — verify + complete) |
| **T2** | Web UI table + edit form |
| **T3** | Project default profile + auto-create on first trace (optional flag) |
| **T4** | Wire `evalRubricId` to judge (depends E3) |

---

## 6. Cross-cutting: testing & deploy (summary)

Detailed in `docs/PRODUCTION_CHECKLIST.md` (to add). Minimum bar before public beta:

- GitHub Actions: typecheck + unit tests + `prisma migrate diff` check
- Integration test: ingest → eval → shadow (simulate) → recommendation
- API `GET /health`; Docker entrypoint runs `migrate deploy` + catalog sync
- `render.yaml` documents all env vars including `SHADOW_REPLAY_MODE=api`, judge keys

---

## Recommended implementation order

Dependencies matter. Suggested sequence:

```
E1–E2 (LLM judge) ──┬──► S4 (shadow uses judge)
                    │
C1 (catalog cron)   │
                    │
T1–T2 (task UI) ────┼──► R1–R2 (recommendation explanations)
                    │
S1–S3 (replay modes)┘
```

**Sprint 1 (foundation):** Commit catalog slice · E1/E2 judge · T1/T2 task UI · health + migrate deploy · CI  
**Sprint 2 (trust):** S1–S3 shadow replay · R1–R2 recommendations · C1 catalog cron  
**Sprint 3 (scale):** More adapters · human labels · cross-provider matrix

---

## Open decisions (need your input later)

1. **Default judge model** — `gpt-4.1-mini` vs `claude-haiku-4.5` for cost/quality tradeoff.
2. **Cross-provider recommendations** — allow in v1 or same-provider only?
3. **Store customer provider keys** per project vs platform keys only for shadow replay.
4. **Auto-create task profiles** on first trace — on or off by default?

---

## Related files (today)

| Area | Code |
|------|------|
| Evaluations | `apps/worker/src/scoring.ts`, `apps/worker/src/main.ts` |
| Shadow | `apps/worker/src/run-shadow-experiment.ts`, `apps/api/src/shadow-experiments/` |
| Catalog | `packages/shared/src/catalog/`, `apps/api/src/model-catalog/sync-model-catalog.ts` |
| Recommendations | `apps/api/src/recommendations/recommendation-candidates.ts` |
| Task profiles | `prisma/schema.prisma` (`TaskProfile`), API module TBD |
