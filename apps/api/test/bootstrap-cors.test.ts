import assert from "node:assert/strict";
import { parseCorsOrigins } from "../src/bootstrap/cors";

assert.deepEqual(parseCorsOrigins(undefined), ["http://localhost:3000"]);
assert.deepEqual(parseCorsOrigins("https://app.example.com, https://staging.example.com"), [
  "https://app.example.com",
  "https://staging.example.com"
]);
