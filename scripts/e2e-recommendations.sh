#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:4000/api}"
EMAIL="${E2E_EMAIL:-e2e-$(date +%s)@example.com}"
PASSWORD="${E2E_PASSWORD:-e2e-test-password}"

echo "==> E2E recommendations test"

auth=$(curl -sf -X POST "${API_URL}/auth/register" \
  -H "content-type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\",\"name\":\"E2E Tester\"}")

token=$(node -e "process.stdout.write(JSON.parse(process.argv[1]).accessToken)" "${auth}")

project_payload=$(cat <<EOF
{"name":"E2E Project","slug":"e2e-$(date +%s)","description":"Recommendation e2e"}
EOF
)

project=$(curl -sf -X POST "${API_URL}/projects" \
  -H "authorization: Bearer ${token}" \
  -H "content-type: application/json" \
  -d "${project_payload}")

project_id=$(node -e "process.stdout.write(JSON.parse(process.argv[1]).id)" "${project}")
echo "Project: ${project_id}"

seed=$(curl -sf -X POST "${API_URL}/projects/${project_id}/seed-demo-analytics" \
  -H "authorization: Bearer ${token}")
echo "Seed: ${seed}"

echo "==> Recommendations (initial)"
curl -sf "${API_URL}/projects/${project_id}/recommendations" \
  -H "authorization: Bearer ${token}" | node -e "
const data = JSON.parse(require('fs').readFileSync(0,'utf8'));
console.log('insights:', data.insights?.reason, '-', data.insights?.message?.slice(0,120));
console.log('candidates:', data.insights?.candidateCount, 'pending:', data.insights?.pendingExperiments, 'failed:', data.insights?.failedExperiments);
console.log('verified:', data.recommendations?.length);
if ((data.insights?.candidateCount ?? 0) === 0 && (data.insights?.pendingExperiments ?? 0) === 0) {
  console.error('No shadow experiment was queued. Set SHADOW_MIN_SAVINGS_USD=0 for this test.');
  process.exit(1);
}
"

echo "==> Waiting for worker shadow jobs (poll up to 90s)..."
result=""
for _ in $(seq 1 30); do
  sleep 3
  result=$(curl -sf "${API_URL}/projects/${project_id}/recommendations" \
    -H "authorization: Bearer ${token}")
  pending=$(node -e "const d=JSON.parse(process.argv[1]);process.stdout.write(String(d.insights?.pendingExperiments??0))" "${result}")
  verified=$(node -e "const d=JSON.parse(process.argv[1]);process.stdout.write(String(d.recommendations?.length??0))" "${result}")
  if [ "${verified}" != "0" ] || [ "${pending}" = "0" ]; then
    break
  fi
done

echo "==> Recommendations (after shadow)"

node -e "
const data = JSON.parse(process.argv[1]);
console.log('insights:', data.insights?.reason ?? 'null', '-', (data.insights?.message ?? '').slice(0,140));
console.log('verified recommendations:', data.recommendations?.length ?? 0);
if (data.recommendations?.length !== 0) {
  console.error('Simulation must not create verified recommendations.');
  process.exit(1);
}
" "${result}"

verifications=$(curl -sf "${API_URL}/projects/${project_id}/verifications?taskName=support.answer" \
  -H "authorization: Bearer ${token}")

node -e "
const rows = JSON.parse(process.argv[1]);
const simulation = rows.find((row) => row.verificationMethod === 'SIMULATION');
if (!simulation) throw new Error('Expected a simulation result');
if (simulation.evidenceQuality !== 'DEMO') throw new Error('Simulation must be DEMO evidence');
if (simulation.switchStatus !== 'NOT_RUN') throw new Error('Simulation must not produce a switch verdict');
if (simulation.switchStatusLabel !== 'Simulation only') throw new Error('Simulation label is not explicit');
console.log('simulation boundary:', simulation.switchStatusLabel, '-', simulation.evidenceQuality);
" "${verifications}"

echo "==> E2E PASSED: simulation remained separate from verified evidence"
