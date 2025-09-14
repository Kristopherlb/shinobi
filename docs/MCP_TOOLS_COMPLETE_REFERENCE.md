# Shinobi MCP Tools Complete Reference

## 🥷🏻 Overview

The Shinobi MCP Server provides **40+ tools across 11 categories** and **7 rich resources** for comprehensive platform intelligence. This document provides the complete reference from the actual source code.

## 📋 Complete Tool Catalog

### **1. Discovery & DocOps (4 tools)**
- `get_component_catalog` - Get catalog of all components with versions, capabilities, stability
- `get_component_schema` - Get full JSON Schema with examples and gotchas
- `get_component_patterns` - Get opinionated blueprints for common use cases
- `expand_pattern` - Expand high-level intent into concrete component set

### **2. Topology, Graph & GUI Enablement (4 tools)**
- `plan_graph` - Generate proposed graph from partial manifest or intent
- `diff_graphs` - Compare two graphs/manifests with human-readable changes
- `validate_graph` - Lint graph for anti-patterns with fixes
- `layout_graph` - Generate canonical layout hints for GUI

### **3. Manifest Intelligence (L3) (3 tools)**
- `generate_manifest` - Generate production-ready manifest from prompt
- `lint_manifest` - Lint manifest for policy and style issues
- `upgrade_manifest` - Migrate old fields to new standards

### **4. Reliability: SLO/SLA & Incident Ops (4 tools)**
- `design_slo` - Propose SLOs and budgets from component set
- `get_slo_status` - Get live SLO posture, burn rates, violators
- `generate_playbook` - Generate runbook steps for incident response
- `plan_probes` - Generate synthetic probes plan

### **5. Observability & Dashboards (4 tools)**
- `provision_dashboard` - Generate and push dashboards for services
- `baseline_alerts` - Propose alarms with thresholds per environment
- `find_bottlenecks` - Find hot paths and top latency/cost offenders
- `create_notebook` - Create analysis notebooks for investigation

### **6. ChangeOps & CI/CD (3 tools)**
- `check_deployment_readiness` - Check if deployment is ready
- `analyze_change_impact` - Predict blast radius from manifest diff
- `generate_release_notes` - Generate dev and exec-facing release notes

### **7. Security & Compliance (3 tools)**
- `simulate_policy` - Show which security rules will trip
- `get_attestations` - Get audit bundle: SBOM, scan results, config proofs
- `plan_jit_access` - Propose safe, time-boxed JIT roles

### **8. QA & Test Engineering (3 tools)**
- `check_qa_readiness` - Check if environment satisfies test pre-reqs
- `plan_test_data` - Generate minimal deterministic test data plan
- `profile_performance` - Generate performance test skeleton

### **9. Cost & FinOps (3 tools)**
- `estimate_cost` - Generate pre-deploy cost estimate with sensitivity analysis
- `get_cost_attribution` - Get current burn vs budget by tag
- `setup_guardrails` - Generate budgets and alerts with right-sizing

### **10. Developer Experience (DPE) & Self-Service (3 tools)**
- `scaffold_project` - Generate repo layout, CI jobs, devcontainer
- `generate_forms` - Generate UI form spec from schemas
- `diagnose_slowdowns` - Diagnose what is slowing down development

### **11. Governance & Exec Insights (3 tools)**
- `get_governance_scorecard` - Get composite score with trendlines
- `get_portfolio_map` - Get portfolio map with posture and risks
- `generate_exec_brief` - Generate executive brief with outcomes and risks

## 🔧 Component Generation Tools (Additional)
- `generate_component` - Generate complete platform component following compliance pipeline
- `component_wizard` - Interactive wizard for guided component generation
- `scaffold_component` - Scaffold basic component structure (Stage 0 only)
- `upgrade_component` - Upgrade existing component through compliance pipeline

## ✅ Validation & Testing Tools (Additional)
- `validate_component_patterns` - Validate component follows architectural patterns
- `run_component_tests` - Execute test suite with coverage and compliance validation
- `audit_component_compliance` - Run comprehensive compliance audit on component

## 🚩 Feature Flag Management Tools (Additional)
- `list_feature_flags` - List all available feature flags with values and configuration
- `get_feature_flag` - Get current value and configuration of specific feature flag
- `set_feature_flag` - Set or update feature flag configuration
- `toggle_feature_flag` - Toggle boolean feature flag on/off for immediate testing
- `evaluate_feature_flags` - Evaluate multiple feature flags with given context

## 📊 Rich Resources (7 resources)

### **Available MCP Resources**
- `shinobi://components` - Component catalog
- `shinobi://services` - Service registry
- `shinobi://dependencies` - Dependency graph
- `shinobi://compliance` - Compliance status
- `shinobi://costs` - Cost data
- `shinobi://security` - Security posture
- `shinobi://performance` - Performance metrics

## 🎛️ Feature Flags (25+ flags)

### **Advanced Analytics & Intelligence**
- `shinobi.advanced-analytics` - Enable advanced analytics and machine learning insights
- `shinobi.ai-insights` - Enable AI-powered insights and recommendations

### **Automation & Remediation**
- `shinobi.auto-remediation` - Enable automatic remediation of common issues
- `shinobi.predictive-scaling` - Enable predictive scaling based on historical patterns

### **Cost & Resource Optimization**
- `shinobi.cost-optimization` - Enable cost optimization recommendations and monitoring

### **Security & Compliance**
- `shinobi.security-scanning` - Enable continuous security scanning and vulnerability detection
- `shinobi.compliance-monitoring` - Enable real-time compliance monitoring and reporting

### **Performance & Monitoring**
- `shinobi.performance-profiling` - Enable detailed performance profiling and bottleneck analysis
- `shinobi.dependency-analysis` - Enable comprehensive dependency analysis and impact assessment
- `shinobi.change-impact` - Enable change impact analysis and risk assessment

### **API & Endpoint Features**
- `shinobi.api.catalog` - Enable component catalog API endpoints
- `shinobi.api.graph` - Enable graph and topology API endpoints
- `shinobi.api.manifest` - Enable manifest generation and validation API endpoints
- `shinobi.api.reliability` - Enable reliability and SLO API endpoints
- `shinobi.api.observability` - Enable observability and dashboard API endpoints
- `shinobi.api.change` - Enable change management and CI/CD API endpoints
- `shinobi.api.security` - Enable security and compliance API endpoints
- `shinobi.api.qa` - Enable QA and testing API endpoints
- `shinobi.api.cost` - Enable cost and FinOps API endpoints
- `shinobi.api.dx` - Enable developer experience and self-service API endpoints
- `shinobi.api.governance` - Enable governance and executive insights API endpoints

### **Data Source Features**
- `shinobi.data.components` - Enable components catalog data source indexing
- `shinobi.data.services` - Enable services registry data source indexing
- `shinobi.data.dependencies` - Enable dependencies graph data source indexing
- `shinobi.data.compliance` - Enable compliance status data source indexing
- `shinobi.data.cost` - Enable cost data source indexing
- `shinobi.data.security` - Enable security posture data source indexing
- `shinobi.data.performance` - Enable performance metrics data source indexing

### **Local Development Features**
- `shinobi.local.seed-data` - Enable seed data for local development
- `shinobi.local.mock-services` - Enable mock external services for local development

### **Experimental Features**
- `shinobi.experimental.gui` - Enable experimental drag-and-drop GUI features
- `shinobi.experimental.voice` - Enable experimental voice command features

### **Mocking Control Flags**
- `shinobi.disable-mocking` - Disable mocking and use real data sources
- `shinobi.use-real-slo-data` - Use real CloudWatch metrics for SLO status
- `shinobi.use-real-cost-data` - Use real AWS pricing data for cost estimates

### **Test Control Flags**
- `shinobi.run-audited-tests-only` - Run tests only for audited components

## 🏗️ Architecture

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

## 🔧 Environment Variables

### **Core Configuration**
```bash
SHINOBI_COMPUTE_MODE=ecs
SHINOBI_CPU=512
SHINOBI_MEMORY=1024
SHINOBI_TASK_COUNT=1
SHINOBI_CONTAINER_PORT=3000
```

### **API Configuration**
```bash
SHINOBI_API_EXPOSURE=internal
SHINOBI_LOAD_BALANCER_ENABLED=true
SHINOBI_API_VERSION=1.0
```

### **Feature Flags**
```bash
SHINOBI_FEATURE_FLAGS_ENABLED=true
SHINOBI_FEATURE_FLAGS_PROVIDER=aws-appconfig
```

### **Data Sources**
```bash
SHINOBI_DATA_SOURCES_COMPONENTS=true
SHINOBI_DATA_SOURCES_SERVICES=true
SHINOBI_DATA_SOURCES_DEPENDENCIES=true
SHINOBI_DATA_SOURCES_COMPLIANCE=true
SHINOBI_DATA_SOURCES_COST=true
SHINOBI_DATA_SOURCES_SECURITY=true
SHINOBI_DATA_SOURCES_PERFORMANCE=true
```

### **Observability**
```bash
SHINOBI_OBSERVABILITY_PROVIDER=cloudwatch
SHINOBI_DASHBOARDS=reliability,performance,security
SHINOBI_ALERTS_ENABLED=true
```

### **Compliance**
```bash
SHINOBI_COMPLIANCE_FRAMEWORK=commercial
SHINOBI_SECURITY_LEVEL=standard
SHINOBI_AUDIT_LOGGING=false
```

### **Local Development**
```bash
SHINOBI_LOCAL_DEV_ENABLED=false
SHINOBI_SEED_COMPONENTS=true
SHINOBI_SEED_SERVICES=true
SHINOBI_MOCK_SERVICES=true
```

### **Logging**
```bash
SHINOBI_LOG_RETENTION_DAYS=30
SHINOBI_LOG_LEVEL=info
SHINOBI_STRUCTURED_LOGGING=true
```

## 🚀 Usage Examples

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

## 🔒 Security & Compliance

### **Security Features**
- **JWT Authentication** - Token-based API access
- **Role-Based Access Control** - Read, Generative, Admin roles
- **VPC Isolation** - Internal-only deployment by default
- **IAM Least Privilege** - Minimal required permissions

### **Compliance Support**
- **Commercial** - Standard security, basic observability
- **FedRAMP Moderate** - Enhanced security, advanced analytics
- **FedRAMP High** - Maximum security, all AI/ML features

## 📈 Monitoring & Observability

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

---

**Shinobi MCP Server - The Platform Intelligence Brain. Ask the brain, get an answer or an action.** 🥷🏻
