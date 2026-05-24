#!/bin/sh
set -eu

echo "Running database migrations..."
npx prisma migrate deploy

if [ "${RUN_CATALOG_SYNC_ON_START:-true}" = "true" ]; then
  echo "Syncing model catalog..."
  npm run model-catalog:sync || echo "Catalog sync skipped (non-fatal)."
fi

echo "Starting API..."
exec npm run start:prod -w @sentinelai/api
