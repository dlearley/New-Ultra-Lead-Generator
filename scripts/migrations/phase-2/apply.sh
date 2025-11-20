#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$SCRIPT_DIR"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

DB_URL="${POSTGRES_URL:-${DATABASE_URL:-}}"
if [[ -z "$DB_URL" ]]; then
  echo "Set POSTGRES_URL or DATABASE_URL before running migrations" >&2
  exit 1
fi

shopt -s nullglob
FILES=("$MIGRATIONS_DIR"/*.sql)
shopt -u nullglob

if [[ ${#FILES[@]} -eq 0 ]]; then
  echo "No migrations found in $MIGRATIONS_DIR"
  exit 0
fi

IFS=$'\n' FILES=($(printf '%s\n' "${FILES[@]}" | sort))
unset IFS

echo "Applying Phase 2 migrations from $MIGRATIONS_DIR"
for file in "${FILES[@]}"; do
  echo "Running ${file##*/}"
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$file"
done

echo "Phase 2 migrations completed"
