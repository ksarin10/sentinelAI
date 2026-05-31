#!/usr/bin/env bash
# Cross-provider shadow verification smoke test. Requires GROQ_API_KEY in environment or repo .env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "${ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT}/.env"
  set +a
fi

: "${GROQ_API_KEY:?Set GROQ_API_KEY in .env or environment}"

API_URL="${API_URL:-http://localhost:4000/api}"
EMAIL="${E2E_EMAIL:-cross-$(date +%s)@example.com}"
PASSWORD="${E2E_PASSWORD:-e2e-test-password}"

echo "==> Cross-provider E2E (SHADOW_REPLAY_MODE should be api)"

auth=$(curl -sf -X POST "${API_URL}/auth/register" \
  -H "content-type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"name\":\"Cross E2E\"}")

token=$(node -e "process.stdout.write(JSON.parse(process.argv[1]).accessToken)" "${auth}")

project=$(curl -sf -X POST "${API_URL}/projects" \
  -H "authorization: Bearer ${token}" \
  -H "content-type: application/json" \
  -d "{\"name\":\"Cross E2E\",\"slug\":\"cross-$(date +%s)\",\"description\":\"Groq cross-provider test\"}")

project_id=$(node -e "process.stdout.write(JSON.parse(process.argv[1]).id)" "${project}")
echo "Project: ${project_id}"

curl -sf -X POST "${API_URL}/projects/${project_id}/provider-credentials" \
  -H "authorization: Bearer ${token}" \
  -H "content-type: application/json" \
  -d "{\"provider\":\"groq\",\"apiKey\":\"${GROQ_API_KEY}\"}" >/dev/null
echo "Saved groq project credential"

curl -sf -X POST "${API_URL}/projects/${project_id}/provider-credentials" \
  -H "authorization: Bearer ${token}" \
  -H "content-type: application/json" \
  -d "{\"provider\":\"openai\",\"apiKey\":\"${OPENAI_API_KEY:-sk-placeholder-openai-key}\"}" >/dev/null || true

curl -sf -X POST "${API_URL}/projects/${project_id}/seed-demo-analytics" \
  -H "authorization: Bearer ${token}" >/dev/null
echo "Seeded demo traces"

echo "==> Recommendations (initial)"
curl -sf "${API_URL}/projects/${project_id}/recommendations" \
  -H "authorization: Bearer ${token}" | node -e "
const data = JSON.parse(require('fs').readFileSync(0,'utf8'));
console.log('suggestions:', data.suggestions?.length ?? 0);
console.log('verified:', data.recommendations?.length ?? 0);
console.log('pending:', data.insights?.pendingExperiments);
if (data.suggestions?.[0]) {
  const s = data.suggestions[0];
  console.log('suggestion:', s.recommendationScope, s.currentModel, '->', s.recommendedProvider + '/' + s.recommendedModel);
}
"

echo "==> Waiting for worker (60s)..."
sleep 60

echo "==> Recommendations (after shadow)"
result=$(curl -sf "${API_URL}/projects/${project_id}/recommendations" \
  -H "authorization: Bearer ${token}")

node -e "
const data = JSON.parse(process.argv[1]);
const cross = (data.recommendations ?? []).filter((r) => r.recommendationScope === 'CROSS_PROVIDER');
console.log('insights:', data.insights?.reason ?? 'null');
console.log('verified total:', data.recommendations?.length ?? 0);
console.log('verified cross-provider:', cross.length);
if (cross[0]) {
  const r = cross[0];
  console.log('PASS:', r.taskName, r.currentProvider + '/' + r.currentModel, '->', r.recommendedProvider + '/' + r.recommendedModel);
  process.exit(0);
}
if (data.suggestions?.length) {
  console.log('Still suggestion only:', data.suggestions[0]?.verificationBlockReason);
}
process.exit(cross.length ? 0 : 1);
" "${result}"
