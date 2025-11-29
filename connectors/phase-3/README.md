# Phase 3 connectors

This folder holds the runner used in local development to simulate upstream connectors (Slack, GitHub, OpenAI, Anthropic, Salesforce, etc.).

## Running locally

```bash
cp ../../.env.example ../../.env # if you have not already
pnpm connectors:phase3
```

The `run.sh` script validates that the expected tokens/secrets are present, sources the root `.env` so credentials stay in one place, and then keeps the mock connector loop alive.

When you replace the placeholder `runner.mjs` with the real connectors from Phase 3, make sure the script keeps STDOUT/STDERR streaming so `docker compose logs` can tail it during development.
