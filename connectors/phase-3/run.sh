#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
export NODE_NO_WARNINGS=1

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

REQUIRED_VARS=(
  "OPENAI_API_KEY"
  "ANTHROPIC_API_KEY"
  "CONNECTOR_SLACK_BOT_TOKEN"
  "CONNECTOR_GITHUB_APP_ID"
  "CONNECTOR_GITHUB_APP_PRIVATE_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "Missing required environment variable: $var" >&2
    exit 1
  fi
done

node "$ROOT_DIR/connectors/phase-3/runner.mjs"
