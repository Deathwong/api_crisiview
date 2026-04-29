#!/usr/bin/env bash
set -euo pipefail

if [ -z "${ROLLBACK_TAG:-}" ]; then
    echo "Erreur : ROLLBACK_TAG non defini."
    echo "Usage : ROLLBACK_TAG=42 ./scripts/rollback.sh"
    exit 1
fi

echo "Rollback vers crisisview-api:${ROLLBACK_TAG}"
export API_IMAGE="crisisview-api:${ROLLBACK_TAG}"
docker compose -f deploy/docker-compose.staging.yml up -d
echo "Rollback termine"
