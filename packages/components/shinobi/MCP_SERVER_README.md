# Shinobi MCP Server - The Platform Intelligence Brain

# IN PROGRESS

## 🥷🏻 **Overview**

The Shinobi MCP Server is a production-grade Model Context Protocol (MCP) server that provides comprehensive platform intelligence capabilities. It serves as the brain for SRE/DevOps/DPE/Developers and leadership, delivering exceptional DX/UX through a rich set of tools and resources.

## 🚀 **Key Features**

### **11 Creative API Categories with 40+ Tools**

#### **1. Discovery & DocOps**
- `get_component_catalog` - Get catalog of all components with versions, capabilities, stability
- `get_component_schema` - Get full JSON Schema with examples and gotchas
- `get_component_patterns` - Get opinionated blueprints for common use cases
- `expand_pattern` - Expand high-level intent into concrete component set

#### **2. Topology, Graph & GUI Enablement**
- `plan_graph` - Generate proposed graph from partial manifest or intent
- `diff_graphs` - Compare two graphs/manifests with human-readable changes
- `validate_graph` - Lint graph for anti-patterns with fixes
- `layout_graph` - Generate canonical layout hints for GUI

#### **3. Manifest Intelligence (L3)**
- `generate_manifest` - Generate production-ready manifest from prompt
- `lint_manifest` - Lint manifest for policy and style issues
- `upgrade_manifest` - Migrate old fields to new standards

#### **4. Reliability: SLO/SLA & Incident Ops**
- `design_slo` - Propose SLOs and budgets from component set
- `get_slo_status` - Get live SLO posture, burn rates, violators
- `generate_playbook` - Generate runbook steps for incident response
- `plan_probes` - Generate synthetic probes plan

#### **5. Observability & Dashboards**
- `provision_dashboard` - Generate and push dashboards for services
- `baseline_alerts` - Propose alarms with thresholds per environment
- `find_bottlenecks` - Find hot paths and top latency/cost offenders
- `create_notebook` - Create analysis notebooks for investigation

#### **6. ChangeOps & CI/CD**
- `check_deployment_readiness` - Check if deployment is ready
- `analyze_change_impact` - Predict blast radius from manifest diff
- `generate_release_notes` - Generate dev and exec-facing release notes

#### **7. Security & Compliance**
- `simulate_policy` - Show which security rules will trip
- `get_attestations` - Get audit bundle: SBOM, scan results, config proofs
- `plan_jit_access` - Propose safe, time-boxed JIT roles

#### **8. QA & Test Engineering**
- `check_qa_readiness` - Check if environment satisfies test pre-reqs
- `plan_test_data` - Generate minimal deterministic test data plan
- `profile_performance` - Generate performance test skeleton

#### **9. Cost & FinOps**
- `estimate_cost` - Generate pre-deploy cost estimate with sensitivity analysis
- `get_cost_attribution` - Get current burn vs budget by tag
- `setup_guardrails` - Generate budgets and alerts with right-sizing

#### **10. Developer Experience (DPE) & Self-Service**
- `scaffold_project` - Generate repo layout, CI jobs, devcontainer
- `generate_forms` - Generate UI form spec from schemas
- `diagnose_slowdowns` - Diagnose what is slowing down development

#### **11. Governance & Exec Insights**
- `get_governance_scorecard` - Get composite score with trendlines
- `get_portfolio_map` - Get portfolio map with posture and risks
- `generate_exec_brief` - Generate executive brief with outcomes and risks

### **7 Rich Resources**

- `shinobi://components` - Component catalog
- `shinobi://services` - Service registry
- `shinobi://dependencies` - Dependency graph
- `shinobi://compliance` - Compliance status
- `shinobi://costs` - Cost data
- `shinobi://security` - Security posture
- `shinobi://performance` - Performance metrics

## 🛠️ **Installation & Usage**

### **As a CDK Component**

```yaml
# service.yml
- name: platform-shinobi
  type: shinobi
  config:
    # Enable all data sources
    dataSources:
      components: true
      services: true
      dependencies: true
      compliance: true
      cost: true
      security: true
      performance: true
    
    # Configure feature flags
    featureFlags:
      enabled: true
      provider: "aws-appconfig"
      defaults:
        "shinobi.advanced-analytics": true
        "shinobi.ai-insights": false
        "shinobi.auto-remediation": false
    
    # API configuration
    api:
      exposure: "internal"
      loadBalancer:
        enabled: true
```

### **As a Standalone MCP Server**

```bash
# Install dependencies
npm install

# Build the server
npm run build:server

# Start the MCP server
npm run start:mcp

# Or run in development mode
npm run dev:mcp
```

### **Environment Variables**

```bash
# Core configuration
SHINOBI_COMPUTE_MODE=ecs
SHINOBI_CPU=512
SHINOBI_MEMORY=1024
SHINOBI_TASK_COUNT=1
SHINOBI_CONTAINER_PORT=3000

# API configuration
SHINOBI_API_EXPOSURE=internal
SHINOBI_LOAD_BALANCER_ENABLED=true
SHINOBI_API_VERSION=1.0

# Feature flags
SHINOBI_FEATURE_FLAGS_ENABLED=true
SHINOBI_FEATURE_FLAGS_PROVIDER=aws-appconfig

# Data sources
SHINOBI_DATA_SOURCES_COMPONENTS=true
SHINOBI_DATA_SOURCES_SERVICES=true
SHINOBI_DATA_SOURCES_DEPENDENCIES=true
SHINOBI_DATA_SOURCES_COMPLIANCE=true
SHINOBI_DATA_SOURCES_COST=true
SHINOBI_DATA_SOURCES_SECURITY=true
SHINOBI_DATA_SOURCES_PERFORMANCE=true

# Observability
SHINOBI_OBSERVABILITY_PROVIDER=cloudwatch
SHINOBI_DASHBOARDS=reliability,performance,security
SHINOBI_ALERTS_ENABLED=true

# Compliance
SHINOBI_COMPLIANCE_FRAMEWORK=commercial
SHINOBI_SECURITY_LEVEL=standard
SHINOBI_AUDIT_LOGGING=false

# Local development
SHINOBI_LOCAL_DEV_ENABLED=false
SHINOBI_SEED_COMPONENTS=true
SHINOBI_SEED_SERVICES=true
SHINOBI_MOCK_SERVICES=true

# Logging
SHINOBI_LOG_RETENTION_DAYS=30
SHINOBI_LOG_LEVEL=info
SHINOBI_STRUCTURED_LOGGING=true
```

## 🔧 **MCP Client Integration**

### **Using with Claude Desktop**

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "shinobi": {
      "command": "node",
      "args": ["/path/to/shinobi/dist/server/index.js"],
      "env": {
        "SHINOBI_DATA_SOURCES_COMPONENTS": "true",
        "SHINOBI_DATA_SOURCES_SERVICES": "true"
      }
    }
  }
}
```

### **Using with Other MCP Clients**

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Connect to Shinobi MCP Server
const transport = new StdioClientTransport({
  command: 'node',
  args: ['/path/to/shinobi/dist/server/index.js']
});

const client = new Client({
  name: 'shinobi-client',
  version: '1.0.0'
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log('Available tools:', tools.tools);

// Call a tool
const result = await client.callTool({
  name: 'get_component_catalog',
  arguments: {
    filter: 'lambda',
    includeVersions: true
  }
});

console.log('Component catalog:', result.content);
```

## 📊 **Example Tool Calls**

### **Get Component Catalog**

```typescript
const result = await client.callTool({
  name: 'get_component_catalog',
  arguments: {
    filter: 'api',
    includeVersions: true
  }
});
```

### **Generate Manifest**

```typescript
const result = await client.callTool({
  name: 'generate_manifest',
  arguments: {
    prompt: 'Generate a serverless API with DynamoDB for user data',
    includeRationale: true
  }
});
```

### **Check SLO Status**

```typescript
const result = await client.callTool({
  name: 'get_slo_status',
  arguments: {
    service: 'user-api',
    timeRange: '24h'
  }
});
```

### **Generate Dashboard**

```typescript
const result = await client.callTool({
  name: 'provision_dashboard',
  arguments: {
    service: 'user-api',
    provider: 'cloudwatch',
    dashboardType: 'reliability'
  }
});
```

### **Analyze Change Impact**

```typescript
const result = await client.callTool({
  name: 'analyze_change_impact',
  arguments: {
    manifestDiff: {
      // Your manifest changes
    },
    includeCostImpact: true
  }
});
```

## 🏗️ **Architecture**

### **MCP Server Components**

- **ShinobiMcpServer** - Main MCP server implementation
- **Tool Handlers** - 40+ tool implementations across 11 categories
- **Resource Providers** - 7 rich resources for platform data
- **Configuration Management** - Environment-based configuration

### **CDK Component Integration**

- **ShinobiComponent** - CDK component for AWS infrastructure
- **ECS Fargate** - Container orchestration
- **DynamoDB** - Data storage
- **Application Load Balancer** - API exposure
- **CloudWatch** - Observability and monitoring

### **Feature Flag Integration**

- **25+ Feature Flags** - Granular control over functionality
- **Environment Targeting** - Different behavior per environment
- **Compliance Targeting** - Framework-specific capabilities
- **Percentage Rollouts** - Gradual feature deployment

## 🔒 **Security & Compliance**

### **Security Features**

- **JWT Authentication** - Token-based API access
- **Role-Based Access Control** - Read, Generative, Admin roles
- **VPC Isolation** - Internal-only deployment by default
- **IAM Least Privilege** - Minimal required permissions

### **Compliance Support**

- **Commercial** - Standard security, basic observability
- **FedRAMP Moderate** - Enhanced security, advanced analytics
- **FedRAMP High** - Maximum security, all AI/ML features

## 📈 **Monitoring & Observability**

### **Built-in Monitoring**

- **CloudWatch Alarms** - CPU, memory, response time, task count
- **Custom Dashboards** - Reliability, performance, security, compliance
- **Structured Logging** - JSON-formatted logs with correlation IDs
- **Health Checks** - Container and API health monitoring

### **Observability Providers**

- **CloudWatch** - AWS native monitoring
- **New Relic** - Application performance monitoring
- **Grafana** - Custom dashboards and alerting
- **Datadog** - Full-stack observability

## 🚀 **Local Development**

### **Quick Start**

```bash
# Clone and install
git clone <repository>
cd packages/components/shinobi
npm install

# Start local development server
npm run dev:mcp

# The server will be available via stdio for MCP clients
```

### **Seed Data**

When `SHINOBI_LOCAL_DEV_ENABLED=true`, the server includes:

- **Sample Components** - Mock component catalog
- **Sample Services** - Mock service registry
- **Sample Metrics** - Mock performance data
- **Mock External Services** - Simulated AWS services

## 🔄 **Deployment**

### **AWS ECS Deployment**

The CDK component automatically provisions:

- **ECS Cluster** - Container orchestration
- **Fargate Service** - Serverless containers
- **ECR Repository** - Container image storage
- **DynamoDB Table** - Data persistence
- **Application Load Balancer** - API exposure
- **CloudWatch Logs** - Centralized logging
- **IAM Roles** - Service permissions

### **Docker Deployment**

```bash
# Build the container
docker build -t shinobi-mcp-server -f src/server/Dockerfile .

# Run the container
docker run -p 3000:3000 \
  -e SHINOBI_DATA_SOURCES_COMPONENTS=true \
  -e SHINOBI_DATA_SOURCES_SERVICES=true \
  shinobi-mcp-server
```

## 📚 **API Reference**

### **Tool Categories**

1. **Discovery & DocOps** - Component discovery and documentation
2. **Topology, Graph & GUI Enablement** - Graph operations and layout
3. **Manifest Intelligence (L3)** - Manifest generation and validation
4. **Reliability: SLO/SLA & Incident Ops** - SLO management and incident response
5. **Observability & Dashboards** - Monitoring and alerting
6. **ChangeOps & CI/CD** - Change management and deployment
7. **Security & Compliance** - Security scanning and compliance
8. **QA & Test Engineering** - Testing and quality assurance
9. **Cost & FinOps** - Cost management and optimization
10. **Developer Experience (DPE) & Self-Service** - Developer tools and scaffolding
11. **Governance & Exec Insights** - Executive reporting and governance

### **Resource Types**

- **shinobi://components** - Component catalog data
- **shinobi://services** - Service registry data
- **shinobi://dependencies** - Dependency graph data
- **shinobi://compliance** - Compliance status data
- **shinobi://costs** - Cost attribution data
- **shinobi://security** - Security posture data
- **shinobi://performance** - Performance metrics data

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 **License**

MIT License - see LICENSE file for details

---

**Shinobi MCP Server - The Platform Intelligence Brain. Ask the brain, get an answer or an action.** 🥷🏻
