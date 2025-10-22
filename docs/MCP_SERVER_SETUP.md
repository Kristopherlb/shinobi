# Shinobi MCP Server Setup

This guide helps you configure the Shinobi MCP Server for use with Cursor.

## Quick Setup

### 1. Build the MCP Server

From the project root:

```bash
pnpm mcp:build
```

### 2. Configure Cursor

Add this to your **user-level** Cursor MCP configuration file:

**Location:** `~/.cursor/mcp.json` (or Cursor Settings → Features → MCP Servers)

```json
{
  "mcpServers": {
    "shinobi": {
      "command": "/ABSOLUTE/PATH/TO/shinobi/bin/shinobi-mcp",
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

**Replace `/ABSOLUTE/PATH/TO/shinobi`** with your actual project path. For example:
- macOS/Linux: `/Users/yourname/project42/shinobi`
- Windows: `C:\\Users\\yourname\\project42\\shinobi`

### 3. Get Your Absolute Path

Run this from the project root to get your path:

```bash
echo "$(pwd)/bin/shinobi-mcp"
```

Copy the output and use it in your MCP config.

### 4. Restart Cursor

After updating the config, restart Cursor completely for changes to take effect.

### 5. Verify

Check that the server is loaded:
- Look for `shinobi` in Cursor's MCP server list
- Check logs at: `~/Library/Application Support/Cursor/logs/*/window*/exthost/anysphere.cursor-mcp/`

## Testing the Server

Test the server manually:

```bash
# Run from project root
./bin/shinobi-mcp
```

Press Ctrl+C to exit. If it starts without errors, it's working!

## Why This Approach?

- ✅ **Portable:** The `bin/shinobi-mcp` script resolves paths dynamically
- ✅ **Each developer** sets their own absolute path once
- ✅ **No hardcoded paths** in version control
- ✅ **Works across** macOS, Linux, and Windows (with appropriate path format)

## Troubleshooting

### MCP Server Not Showing Up

1. Check that you used the **correct absolute path** in your config
2. Verify the server builds: `pnpm mcp:build`
3. Test manually: `./bin/shinobi-mcp`
4. **Restart Cursor** completely
5. Check Cursor logs for errors

### Build Errors

```bash
# Clean and rebuild
rm -rf apps/shinobi-mcp-server/dist
pnpm mcp:build
```

### Path Issues on Windows

Use forward slashes or escaped backslashes in the JSON config:
```json
"command": "C:/Users/yourname/project42/shinobi/bin/shinobi-mcp"
```

Or:
```json
"command": "C:\\Users\\yourname\\project42\\shinobi\\bin\\shinobi-mcp"
```

## Available Tools

Once connected, the Shinobi MCP server provides 40+ tools:

- **Component Discovery:** `get_component_catalog`, `get_component_schema`
- **Manifest Generation:** `generate_manifest`, `expand_pattern`
- **Platform Intelligence:** `get_capability_catalog`, `get_binding_matrix`
- **Cost & Observability:** `estimate_cost`, `provision_dashboard`
- **Feature Flags:** `list_feature_flags`, `toggle_feature_flag`
- And many more!

## Developer Notes

- The `bin/shinobi-mcp` wrapper **must** remain in version control
- Each developer's MCP config (`~/.cursor/mcp.json`) is **not** in version control
- Document any environment variables needed in this file
- The server uses stdio transport (stdin/stdout) for MCP protocol


