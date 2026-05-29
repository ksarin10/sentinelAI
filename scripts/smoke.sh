#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:4000/api}"
EMAIL="${SMOKE_EMAIL:-smoke-$(date +%s)@example.com}"
PASSWORD="${SMOKE_PASSWORD:-smoke-test-password}"
PROJECT_NAME="${SMOKE_PROJECT_NAME:-Smoke Test Project}"

echo "==> SentinelAI smoke test against ${API_URL}"

register_payload=$(cat <<EOF
{"email":"${EMAIL}","password":"${PASSWORD}","name":"Smoke Tester"}
EOF
)

auth=$(curl -sf -X POST "${API_URL}/auth/register" \
  -H "content-type: application/json" \
  -d "${register_payload}")

token=$(node -e "const auth=JSON.parse(process.argv[1]); process.stdout.write(auth.accessToken)" "${auth}")
echo "Registered user ${EMAIL}"

health=$(curl -sf "${API_URL}/health")
echo "Health: ${health}"

project_payload=$(cat <<EOF
{"name":"${PROJECT_NAME}","slug":"smoke-$(date +%s)","description":"Smoke test project"}
EOF
)

project=$(curl -sf -X POST "${API_URL}/projects" \
  -H "authorization: Bearer ${token}" \
  -H "content-type: application/json" \
  -d "${project_payload}")

project_id=$(node -e "const p=JSON.parse(process.argv[1]); process.stdout.write(p.id)" "${project}")

api_key=$(curl -sf -X POST "${API_URL}/projects/${project_id}/api-keys" \
  -H "authorization: Bearer ${token}" \
  -H "content-type: application/json" \
  -d '{"name":"smoke-ingest-key"}')

ingest_secret=$(node -e "const k=JSON.parse(process.argv[1]); if(!k.secret) throw new Error('missing api key secret'); process.stdout.write(k.secret)" "${api_key}")

trace=$(curl -sf -X POST "${API_URL}/ingest/traces" \
  -H "authorization: Bearer ${ingest_secret}" \
  -H "content-type: application/json" \
  -d '{"name":"smoke.task","provider":"openai","model":"gpt-4.1-mini","prompt":"Say hello in one sentence.","response":"Hello from the smoke test.","latencyMs":120,"tokens":{"promptTokens":12,"completionTokens":8,"totalTokens":20},"costUsd":0.0001}')

echo "Ingested trace: ${trace}"
echo "Smoke test completed successfully."
