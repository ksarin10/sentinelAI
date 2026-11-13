# Ingestion reliability and performance

This report defines what SentinelAI's Go ingestion gateway guarantees, how those guarantees are tested, and the conditions behind its performance numbers.

## Delivery contract

The gateway provides **durable acceptance and at-least-once delivery**:

1. A client sends `POST /v1/traces` with a project API key and a project-scoped `Idempotency-Key`.
2. The gateway encrypts the delivery envelope with AES-256-GCM, writes it to a `0600` spool file, calls `fsync`, atomically renames it into `ready/`, and syncs the directory.
3. Only after that sequence succeeds does the gateway return `202 Accepted`.
4. A worker atomically moves ready work to `processing/`, sends it upstream, and writes a durable receipt before deleting the in-flight file.
5. The NestJS API enforces uniqueness on `(projectId, externalId)`, so a retry returns the original trace instead of creating another row or evaluation.

This is not exactly-once transport. A worker can deliver a request successfully and crash before recording its receipt. The gateway will send that request again after restart; the idempotent API turns the repeated delivery into one database effect.

The encryption key is derived from `INGEST_SPOOL_SECRET`, which must contain at least 32 characters. Authentication failure prevents startup with the wrong key rather than treating encrypted bytes as a corrupt trace. Existing plaintext records remain readable during migration and are encrypted on their next state transition. Production deployments should use a randomly generated secret, store it in a secrets manager, restrict access to the gateway's runtime user, and preserve the old key until the queue has drained before rotating it.

## Failure matrix

| Failure | Observable behavior | Data outcome |
| --- | --- | --- |
| Duplicate request while the first write is running | The duplicate waits for the first durable write, then returns `duplicate: true` | One spool item |
| Duplicate request after delivery | A durable receipt returns `duplicate: true` | One database trace |
| Process exits after `202` | Startup rebuilds the queue from disk | Accepted trace remains queued |
| Worker exits after claiming work | Startup moves unacknowledged `processing/` files back to `ready/` | Trace is redelivered |
| Worker exits after upstream success but before receipt | Trace is redelivered | Database uniqueness suppresses the repeated effect |
| Network error, `408`, `429`, or `5xx` | Retry with capped exponential backoff and jitter | Trace remains queued |
| Permanent `4xx` or exhausted retry budget | Warning log and durable file under `dead/` | Trace remains inspectable |
| Queue reaches `INGEST_MAX_PENDING` | `503 Service Unavailable` and `Retry-After: 1` | Request is explicitly rejected, never silently dropped |
| One API key reaches `INGEST_MAX_PENDING_PER_KEY` | `429 Too Many Requests` and `Retry-After: 1` | Other API keys retain queue capacity |
| Spool is opened with the wrong encryption key | Startup fails authentication | Encrypted records are not overwritten or discarded |

The race-enabled tests cover duplicate suppression, capacity rejection, delayed retries, permanent failures, and restart recovery:

```bash
cd services/ingest-gateway
go test -race ./...
```

## Reproducible load test

Run the HTTP-to-disk path with unique trace IDs:

```bash
cd services/ingest-gateway
go run ./cmd/ingest-load -requests 500 -concurrency 12
```

Measurement from November 12, 2026:

| Condition | Value |
| --- | --- |
| Machine | Apple M2 Max, 12 logical CPUs, arm64 |
| OS / Go | macOS, Go 1.27.4 |
| Requests | 500 unique traces |
| Concurrent clients | 12 |
| Payload | 193 bytes |
| Durability boundary | AES-GCM encryption + file `fsync` + atomic rename + directory sync before `202` |
| Network | In-process server over loopback |
| Upstream delivery | Disabled so the benchmark isolates durable intake |
| Errors | 0 |
| Throughput | 179.94 traces/second |
| p50 latency | 61.99 ms |
| p95 latency | 96.34 ms |
| p99 latency | 108.65 ms |

These are local development measurements, not a production capacity claim. Filesystem, storage hardware, payload size, concurrency, and background I/O materially affect the result. The load tool prints all run conditions with each result so later measurements can be compared honestly.

## Outage and crash-recovery experiment

The chaos command accepts traces while a fake downstream API returns `503`, persists one retry for every trace, simulates a downstream success immediately followed by a process crash before receipt persistence, reopens the encrypted spool as a fresh service instance, and drains the backlog into an idempotent sink:

```bash
cd services/ingest-gateway
go run ./cmd/ingest-chaos -traces 500 -concurrency 12
```

Result from November 12, 2026:

| Measurement | Result |
| --- | ---: |
| Durably accepted traces | 500 |
| Downstream outage responses | 500 |
| Unique downstream effects after recovery | 500 |
| Harmless repeated transport deliveries | 1 |
| Lost traces | 0 |
| Pending after recovery | 0 |
| Experiment errors | 0 |
| Total duration | 30.41 seconds |

This command simulates process death by abandoning an in-flight lease and constructing a fresh spool and worker instance over the same files. It does not issue an operating-system `SIGKILL`. That separate process-level test remains future work.

## Profiling story: eliminating retry-path syscalls

The first CPU profile showed `os.Stat` under duplicate detection consuming 52.8% of sampled CPU time. Each repeated event checked `ready/`, `processing/`, `receipts/`, and `dead/` on disk even though the spool already serialized access.

The fix rebuilds an in-memory key index during startup and updates it only after a durable write. A concurrent request for the same key waits on the original write's completion channel, so the optimization does not return `202` before durability.

Five benchmark runs on the same M2 Max measured:

| Benchmark | Before, median | After, median | Change |
| --- | ---: | ---: | ---: |
| Duplicate enqueue | 5,797 ns/op | 187.5 ns/op | 30.9x faster |
| Duplicate allocations | 864 B/op, 7 allocs | 128 B/op, 2 allocs | 85% fewer bytes |
| Unique sequential enqueue | 11.20 ms/op | 10.15 ms/op | 9.4% faster |
| Unique allocations | 6,567 B/op, 53 allocs | 3,508 B/op, 29 allocs | 47% fewer bytes |

A second change moved unrelated disk writes out of the global mutex. Same-key requests still coordinate through a per-key completion channel, while unique trace IDs can call `fsync` concurrently. The post-change parallel benchmark measured a median 6.42 ms/op across 12 goroutines.

Reproduce the benchmarks and collect CPU and heap profiles:

```bash
cd services/ingest-gateway
./scripts/profile.sh profiles
go tool pprof -top profiles/cpu.pprof
go tool pprof -http=:8080 profiles/cpu.pprof
```

## Known limits

- Receipt and encrypted dead-letter retention is currently unbounded. A production rollout should add a reviewed retention policy before sustained high-volume use.
- Capacity isolation is per API key, not true project-level fair scheduling. A project with several keys can consume several shares.
- Dead letters are retained and counted but do not yet have a supported inspection and replay API.
- One gateway instance owns a local spool. Horizontal scaling requires sticky routing per idempotency key or a shared durable log.
- The service deliberately favors durability over single-request latency by syncing every accepted event. A future group-commit design should preserve the same acknowledgement boundary and be evaluated under crash injection before adoption.
