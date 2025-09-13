#!/bin/bash

# Shinobi MCP Server Setup Script for Cursor
echo "🥷🏻 Setting up Shinobi MCP Server for Cursor..."

# Navigate to the MCP server directory
cd packages/components/shinobi/mcp-server

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the server
echo "🔨 Building MCP server..."
npm run build

# Test the server
echo "🧪 Testing MCP server..."
if [ -f "dist/index.js" ]; then
    echo "✅ Shinobi MCP Server is ready!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Add the MCP server to your Cursor settings:"
    echo "   - Open Cursor settings"
    echo "   - Go to MCP Servers"
    echo "   - Add new server with:"
    echo "     Command: node"
    echo "     Args: $(pwd)/dist/index.js"
    echo ""
    echo "2. Or use the provided mcp-config.json file"
    echo ""
    echo "3. Restart Cursor to activate the MCP server"
    echo ""
    echo "🎯 Available tools:"
    echo "   - get_component_catalog"
    echo "   - get_component_schema" 
    echo "   - generate_manifest"
    echo "   - get_slo_status"
    echo "   - provision_dashboard"
    echo "   - analyze_change_impact"
    echo "   - estimate_cost"
    echo "   - check_deployment_readiness"
    echo ""
    echo "📚 Available resources:"
    echo "   - shinobi://components"
    echo "   - shinobi://services"
    echo "   - shinobi://dependencies"
    echo "   - shinobi://compliance"
else
    echo "❌ MCP server test failed. Please check the build output."
    exit 1
fi
