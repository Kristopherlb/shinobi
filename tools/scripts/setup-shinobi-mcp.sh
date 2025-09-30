#!/bin/bash

# Shinobi MCP Server Setup Script
# One-command setup for new developers

set -e

echo "🥷 Setting up Shinobi MCP Server..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the MCP server
echo "🔨 Building MCP server..."
cd apps/shinobi-mcp-server
npm install
npm run build
npm link

# Create a global symlink for easy access
echo "🔗 Creating global symlink..."
cd ../../..
npm link @shinobi/mcp-server

# Create a simple start script
echo "📝 Creating start script..."
cat > start-shinobi-mcp.sh << 'EOF'
#!/bin/bash
cd apps/shinobi-mcp-server
node dist/index.js
EOF

chmod +x start-shinobi-mcp.sh

# Create Cursor MCP config template
echo "⚙️ Creating Cursor MCP config template..."
cat > mcp-config-template.json << EOF
{
  "mcpServers": {
    "shinobi": {
      "command": "node",
      "args": [
        "$(pwd)/apps/shinobi-mcp-server/dist/index.js"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
EOF

echo "✅ Setup complete!"
echo ""
echo "To use the Shinobi MCP server:"
echo "1. Copy the config to your Cursor MCP settings:"
echo "   cp mcp-config-template.json ~/.cursor/mcp.json"
echo ""
echo "2. Or run the server directly:"
echo "   ./start-shinobi-mcp.sh"
echo ""
echo "3. Or use the global command:"
echo "   shinobi-mcp-server"
