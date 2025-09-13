# 🥷🏻 Shinobi MCP Server - Cursor Integration

## **Overview**

The Shinobi MCP Server is now set up and ready to use with Cursor! It provides 8 powerful tools and 4 rich resources for platform intelligence and operations.

## **✅ What's Already Done**

1. **✅ MCP Server Built** - Standalone server at `packages/components/shinobi/mcp-server/`
2. **✅ Dependencies Installed** - All required packages installed
3. **✅ Server Tested** - MCP server responds correctly to tool requests
4. **✅ Configuration Files Created** - Ready for Cursor integration

## **🔧 Cursor Integration Steps**

### **Option 1: Use Cursor's MCP Settings (Recommended)**

1. **Open Cursor Settings**
   - Press `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux)
   - Go to "Features" → "MCP Servers"

2. **Add New MCP Server**
   - Click "Add Server"
   - **Name**: `shinobi`
   - **Command**: `node`
   - **Args**: `/Users/kristopherbowles/code/CDK-Lib/packages/components/shinobi/mcp-server/dist/index.js`
   - **Environment Variables**: (leave empty for now)

3. **Save and Restart Cursor**

### **Option 2: Use Configuration File**

1. **Copy the MCP config**:
   ```bash
   cp mcp-config.json ~/.cursor/mcp-config.json
   ```

2. **Restart Cursor**

## **🎯 Available Tools**

Once integrated, I'll have access to these powerful tools:

### **Component Discovery**
- `get_component_catalog` - Get all platform components with versions and capabilities
- `get_component_schema` - Get detailed schemas with examples and gotchas

### **Manifest Generation**
- `generate_manifest` - Generate production-ready manifests from descriptions
- `check_deployment_readiness` - Check if deployments are ready

### **Operations & Monitoring**
- `get_slo_status` - Check service SLO status and burn rates
- `provision_dashboard` - Create monitoring dashboards
- `analyze_change_impact` - Analyze deployment impact and blast radius
- `estimate_cost` - Estimate deployment costs with sensitivity analysis

## **📚 Available Resources**

- `shinobi://components` - Complete component catalog
- `shinobi://services` - Service registry with deployment status
- `shinobi://dependencies` - Dependency graph visualization
- `shinobi://compliance` - Compliance status across frameworks

## **🚀 How to Use**

Once set up, you can ask me to:

1. **"Use Shinobi to get the component catalog"**
2. **"Generate a manifest for a serverless API with DynamoDB"**
3. **"Check the SLO status for our services"**
4. **"Create a reliability dashboard for the user-api"**
5. **"Analyze the impact of adding a new Lambda function"**
6. **"Estimate the cost of deploying this manifest"**

## **🧪 Testing the Integration**

After setup, test with:

```bash
# Test the MCP server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}' | node packages/components/shinobi/mcp-server/dist/index.js
```

## **🔧 Troubleshooting**

### **Server Not Responding**
```bash
cd packages/components/shinobi/mcp-server
npm run build
npm start
```

### **Cursor Not Detecting MCP Server**
1. Check the file path in Cursor settings
2. Ensure the server builds without errors
3. Restart Cursor completely

### **Permission Issues**
```bash
chmod +x packages/components/shinobi/mcp-server/dist/index.js
```

## **📊 What This Enables**

With Shinobi integrated, I can now:

- **🧠 Intelligently analyze your platform** using real component data
- **📝 Generate production-ready manifests** from high-level descriptions  
- **📈 Monitor and optimize** platform performance and costs
- **🔒 Ensure compliance** across different frameworks
- **📊 Generate executive reports** and governance insights
- **🔍 Diagnose issues** and provide remediation steps
- **📋 Plan changes** with impact analysis and risk assessment

## **🎉 You're All Set!**

The Shinobi MCP Server is ready to be your platform intelligence brain. Once you restart Cursor with the MCP server configured, I'll have access to all these powerful tools and can help you build, deploy, and operate your platform more effectively!

**Next Step**: Restart Cursor and ask me to use Shinobi tools! 🥷🏻
