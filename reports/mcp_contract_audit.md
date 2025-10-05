# MCP Server Contract Audit – dynamodb-table

## Observations
- The MCP server exposes a `get_component_catalog` tool and `shinobi://components` resource that enumerate real component metadata straight from `packages/components`, allowing clients to discover the dynamodb-table package and its version.[^mcp-catalog]
- `get_component_schema` streams the actual `Config.schema.json` for a named component, so clients can retrieve the dynamodb-table schema through the MCP API.[^mcp-schema]

## Findings
- ❗ The MCP specification requires `/platform/capabilities`, but neither a resource nor a tool currently surfaces the capability registry, limiting agents that need the canonical capability list.[^mcp-capabilities]
- ❗ `/platform/bindings` is also mandated; the server does not expose a binder matrix resource/tool, so AI clients cannot programmatically inspect supported source/target combinations.[^mcp-bindings]
- ⚠️ Catalog entries expose package metadata but omit derived capability listings (e.g., `db:dynamodb`) even though that information is critical for AI planning; enriching the catalog with capability exports would improve parity with the spec's intent.[^mcp-catalog]

## Recommendations
1. Add a tool/resource that emits the platform capability vocabulary (e.g., by reading `platform-capability-naming-standard` or a generated registry) to satisfy `/platform/capabilities`.[^mcp-capabilities]
2. Publish the binder matrix through an MCP resource or tool so `/platform/bindings` queries succeed.[^mcp-bindings]
3. Consider augmenting the component catalog entries with declared capabilities from package metadata or generated manifests to help MCP clients plan bindings.[^mcp-catalog]

[^mcp-catalog]: docs/spec/platform-mcp-spec.md:24-36; apps/shinobi-mcp-server/src/shinobi-server.ts:2341-2720
[^mcp-schema]: docs/spec/platform-mcp-spec.md:27-29; apps/shinobi-mcp-server/src/shinobi-server.ts:2734-2762
[^mcp-capabilities]: docs/spec/platform-mcp-spec.md:30-32; (no corresponding implementation in apps/shinobi-mcp-server/src/shinobi-server.ts)
[^mcp-bindings]: docs/spec/platform-mcp-spec.md:33-35; (no corresponding implementation in apps/shinobi-mcp-server/src/shinobi-server.ts)
