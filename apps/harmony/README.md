# Harmony Golden Path (Phase 1)

This package implements Phase 1 from `docs/harmony`: a local Golden Path that runs the Brain (LangGraph), Nervous System (Temporal), and Muscle (Dagger) together with an MCP tool server in STDIO mode.

## Prerequisites

- Docker (privileged containers enabled for the Dagger engine)
- Node.js 20+
- pnpm 10+
- LLM API key (set `HARMONY_LLM_API_KEY`)

## Start the local stack

From the repo root:

```bash
cd apps/harmony
docker compose -f docker-compose.golden-path.yml up -d
```

This starts:
- Temporal dev server + UI on `localhost:8233`
- Dagger engine on `localhost:6060`
- MCP Inspector on `localhost:6274`

> If the MCP Inspector image tag changes, update `docker-compose.golden-path.yml` with the latest published image.

## Run the MCP tool server (STDIO)

In a new terminal:

```bash
cd apps/harmony
pnpm install
pnpm start:mcp
```

The MCP server exposes the `analyze_repo` tool for cloning and scanning repositories through Dagger.

## Run the Temporal worker

```bash
cd apps/harmony
pnpm start:worker
```

## Run the durable agent

```bash
cd apps/harmony
HARMONY_LLM_API_KEY="..." \
HARMONY_REPO="https://github.com/modelcontextprotocol/servers" \
pnpm start:client
```

The workflow runs the Plan → Execute → Review steps and outputs the resulting state, including the README contents, file tree, and review notes.

## Configuration

Runtime defaults live in `config/runtime.json`, and every value can be overridden via environment variables.

Key overrides:
- `HARMONY_MCP_SERVER_COMMAND`, `HARMONY_MCP_SERVER_ENTRY`
- `HARMONY_TEMPORAL_TASK_QUEUE`, `HARMONY_TEMPORAL_WORKFLOW_PREFIX`
- `HARMONY_DEFAULT_GOAL`, `HARMONY_DEFAULT_REPO`
- `HARMONY_LLM_PROVIDER`, `HARMONY_LLM_MODEL`, `HARMONY_LLM_API_KEY`

### Tool selection

Tool selection is backed by a vector index stored in Postgres/pgvector. A dedicated ingestion step embeds MCP tool definitions with `text-embedding-3-small` and stores them in the `mcp_tool_index` table. At runtime, the plan step embeds the user goal and retrieves the top matches from the vector index.

#### Ingest tools

Provide a Postgres connection string and embedding provider configuration, then run:

```bash
cd apps/harmony
TOOL_INDEX_DATABASE_URL="postgres://user:pass@localhost:5432/harmony" \
EMBEDDING_API_KEY="..." \
pnpm start:ingest-tools
```

Optional environment variables:

- `EMBEDDING_MODEL` (defaults to `text-embedding-3-small`)
- `EMBEDDING_BASE_URL` (defaults to `https://api.openai.com/v1`)
- `MCP_SERVER_ID` (defaults to `local-stdio`)
- `TOOL_INDEX_ENABLED` (defaults to `false` - set to `true` to enable vector-based tool selection)

## Run the OpsNarrative workflow

The OpsNarrative workflow aggregates Linear, Git, and PagerDuty data, synthesizes a report using a configurable AI provider, and delivers it to Slack with a local-file fallback.

### Run locally with Dagger

From the repo root:

```bash
cd apps/harmony
dagger call run-local --source . --ai-provider OLLAMA --model llama3
```

Optional inputs:

- `ONW_PROVIDER_CONFIG` (JSON) overrides the provider config injected by Dagger.
- `ONW_FLAG_OVERRIDES` (JSON) controls OpenFeature flags such as `enable-linear-source`.
- `OTEL_EXPORTER_OTLP_ENDPOINT` sets the OTLP exporter endpoint (defaults to `http://localhost:4318/v1/traces`).

If you use the Ollama sidecar, ensure the model is pulled before running:

```bash
docker exec -it <ollama-container> ollama pull llama3
```

### Run locally with Temporal

```bash
cd apps/harmony
HARMONY_WORKFLOW=ops-narrative \\
ONW_PROVIDER_CONFIG='{\"type\":\"OLLAMA\",\"host\":\"http://localhost:11434\",\"model\":\"llama3\"}' \\
ONW_LINEAR_TEAM=PLAT \\
ONW_GIT_PROVIDER=GITLAB \\
ONW_GIT_REPO=platform%2Fops-narrative \\
ONW_PD_SERVICE=P123456 \\
pnpm start:client
```

Required credentials by source:

- `LINEAR_API_TOKEN`
- `GITLAB_TOKEN` or `BITBUCKET_TOKEN` (depending on `ONW_GIT_PROVIDER`)
- `PAGERDUTY_API_TOKEN`
- `SLACK_WEBHOOK_URL` (only if delivering to Slack)

## Testing

```bash
cd apps/harmony
pnpm test
```
## Troubleshooting

- **Dagger connection errors**: ensure the Dagger engine container is running and the Docker socket is accessible.
- **Temporal connection errors**: confirm `localhost:7233` is reachable and the Temporal dev server is up.
- **MCP Inspector**: if the inspector image is unavailable, run it with `npx @modelcontextprotocol/inspector` instead.
