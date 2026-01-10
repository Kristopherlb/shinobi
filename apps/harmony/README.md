# Harmony Golden Path (Phase 1)

This package implements Phase 1 from `docs/harmony`: a local Golden Path that runs the Brain (LangGraph), Nervous System (Temporal), and Muscle (Dagger) together with an MCP tool server in STDIO mode.

## Prerequisites

- Docker (privileged containers enabled for the Dagger engine)
- Node.js 20+
- pnpm 10+

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
HARMONY_REPO="https://github.com/modelcontextprotocol/servers" pnpm start:client
```

The workflow runs the Plan → Execute → Review steps and outputs the resulting state, including the README contents, file tree, and review notes.

## Troubleshooting

- **Dagger connection errors**: ensure the Dagger engine container is running and the Docker socket is accessible.
- **Temporal connection errors**: confirm `localhost:7233` is reachable and the Temporal dev server is up.
- **MCP Inspector**: if the inspector image is unavailable, run it with `npx @modelcontextprotocol/inspector` instead.
