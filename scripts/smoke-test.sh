#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:3001}"
MAX_RETRIES=10
SLEEP=3

echo "=============================="
echo "  SMOKE TESTS — CrisisView API"
echo "=============================="

check_url() {
    local url="$1"
    local label="$2"
    local attempt=1

    echo ""
    echo "[TEST] $label : $url"

    until curl -sf --max-time 5 "$url" > /dev/null 2>&1; do
        if [ $attempt -ge $MAX_RETRIES ]; then
            echo "[FAIL] $label inaccessible apres $MAX_RETRIES tentatives"
            exit 1
        fi
        echo "  Tentative $attempt/$MAX_RETRIES — attente ${SLEEP}s..."
        sleep $SLEEP
        attempt=$((attempt + 1))
    done

    echo "[OK]   $label repond"
}

check_url "${API_URL}/health" "API /health"
check_url "${API_URL}/incidents" "API /incidents"
check_url "${API_URL}/techniciens" "API /techniciens"

echo ""
echo "=============================="
echo "  SMOKE TESTS : TOUS OK"
echo "=============================="
