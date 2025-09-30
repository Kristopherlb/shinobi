# 🥷 Shinobi MCP Server - One Command Setup

## Quick Start

After cloning this repository, run a single command to set up the Shinobi MCP Server:

```bash
npm run setup:mcp
```

This will:
- Install all dependencies
- Build the MCP server
- Create a global symlink
- Generate Cursor MCP configuration
- Create helper scripts

## Alternative Commands

```bash
# Just build the MCP server
npm run mcp:build

# Start the MCP server directly
npm run mcp:start

# Or use the global command (after setup)
shinobi-mcp-server
```

## Cursor Integration

After running the setup, copy the generated config to Cursor:

```bash
cp mcp-config-template.json ~/.cursor/mcp.json
```

Then restart Cursor to connect to the Shinobi MCP server.

## What You Get

The Shinobi MCP Server provides:

### Components
- **Lambda API** - Serverless API with API Gateway
- **ECS Cluster** - Container orchestration with Service Connect
- **ECR Repository** - Secure container storage
- **SageMaker Notebook** - ML development environment

### Tools
- `get_component_catalog` - Browse available components
- `get_component_schema` - Get component schemas
- `generate_manifest` - Create production manifests
- `get_slo_status` - Check service health
- `provision_dashboard` - Create monitoring dashboards
- `analyze_change_impact` - Predict deployment impact
- `estimate_cost` - Get cost estimates
- `check_deployment_readiness` - Validate deployments

### Resources
- `shinobi://components` - Component catalog
- `shinobi://services` - Service registry
- `shinobi://dependencies` - Dependency graph
- `shinobi://compliance` - Compliance status

## Troubleshooting

If you encounter issues:

1. Make sure you're in the project root directory
2. Check that Node.js is installed (v18+)
3. Run `npm run mcp:build` to rebuild
4. Check the generated `mcp-config-template.json` for correct paths

## Development

To modify the MCP server:

1. Edit files in `apps/shinobi-mcp-server/src/`
2. Run `npm run mcp:build` to rebuild
3. Restart Cursor to pick up changes
