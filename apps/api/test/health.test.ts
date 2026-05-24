import assert from "node:assert/strict";
import { aggregateHealthStatus } from "../src/health/health.service";

assert.equal(aggregateHealthStatus({ database: "ok", redis: "ok" }), "ok");
assert.equal(aggregateHealthStatus({ database: "ok", redis: "degraded" }), "degraded");
assert.equal(aggregateHealthStatus({ database: "error", redis: "ok" }), "error");
