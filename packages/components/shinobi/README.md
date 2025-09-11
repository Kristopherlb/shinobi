# Shinobi Component - The Platform Intelligence Brain

#IN PROGRESS

A production-grade Ops MCP Server that becomes the brain for SRE/DevOps/DPE/Developers and leadership. Delivers exceptional DX/UX from day one, runs locally and in AWS, and provides a clean runway to a drag-and-drop GUI that outputs platform L3 construct manifests.

## Core Philosophy

**"Ask the brain, get an answer or an action."** No AWS trivia, no yak-shaving.

## Key Features

### 🧠 **Platform Intelligence**
- **Manifest-first**: Everything maps to service.yml (read, validate, propose diffs, generate)
- **2-minute local loop**: `shinobi dev up` → hit endpoints/docs locally with seeded sample data
- **Docs like Stripe, speed like Vite**: Endpoints self-document; schemas generate forms; examples everywhere
- **Zero-to-signal defaults**: Deploys safe, internal-only by default; observability & alarms auto-wired

### 🎯 **Persona-Specific Capabilities**

#### **SRE**: Incidents, SLOs, error budgets, runbooks, diagnostics, auto-dashboards
#### **DevOps/DPE**: Drift, bottlenecks, CI/CD insights, scaffolding, binder wiring, cost guardrails
#### **Developers**: Component discovery, schema→form, manifest lint/fix, local preview
#### **Security/Compliance**: Policy simulation, JIT access plans, audit bundles
#### **QA**: Test data plans, environment readiness, change impact diffs
#### **Execs**: Posture, risk, velocity, cost/SLO summaries with deltas and "what changed"

### 🚀 **Creative API Endpoints**

#### **1. Discovery & DocOps**
- `GET /catalog/components` - Catalog of all components, versions, capabilities, stability, cost hints
- `GET /catalog/components/{name}/schema` - Full JSON Schema + typed examples + gotchas
- `GET /catalog/patterns` - Opinionated blueprints (e.g., "event-driven API with DLQs & SLOs")
- `POST /catalog/patterns/expand` - Give an intent; get a concrete component set + initial manifest

#### **2. Topology, Graph & GUI Enablement**
- `POST /graph/plan` - Given partial manifest or intent, return proposed graph (nodes/edges/attrs) + tradeoffs
- `POST /graph/diff` - Compare two graphs/manifests → exact, human-readable change set
- `POST /graph/validate` - Lint graph: anti-patterns (public DB, no DLQ, missing alarms), with fixes
- `POST /graph/layout` - Canonical layout hints for the GUI (ranks, groups, badges, hotspots)

#### **3. Manifest Intelligence (L3)**
- `POST /manifest/generate` - High-level prompt → production-ready manifest snippet(s) with rationale
- `POST /manifest/lint` - Policy & style checks; returns errors, warnings, and auto-fix suggestions
- `POST /manifest/upgrade` - Migrate old fields to new standards; include a PR-ready diff summary

#### **4. Reliability: SLO/SLA & Incident Ops**
- `POST /reliability/slo/design` - Propose SLOs + budgets from component set and traffic profile
- `GET /reliability/slo/status?service=...` - Live SLO posture, burn rates, top violators
- `POST /reliability/ir/playbook` - Given a component/alert, return runbook steps + checks + links
- `POST /reliability/probe/plan` - Synthetic probes plan (URLs, intervals, assertions) + infra hooks

#### **5. Observability & Dashboards**
- `POST /obs/dashboard/provision` - Generate + push dashboards for a service (choose provider)
- `POST /obs/alerts/baseline` - Propose alarms (latency, error rate, saturation) with thresholds per env
- `GET /obs/bottlenecks?service=...` - Hot paths & top N latency/cost offenders; links to traces
- `POST /obs/notebooks/create` - Create analysis notebooks (e.g., NR NerdGraph or Grafana notebooks)

#### **6. ChangeOps & CI/CD**
- `GET /change/ready?env=...` - "Can I deploy?" — blockers: tests, schema drift, missing alarms, FFs
- `POST /change/impact` - Predict blast radius from a manifest diff; list at-risk SLOs & cost changes
- `POST /change/release-notes` - Generate dev-facing and exec-facing release notes from diff + telemetry

#### **7. Security & Compliance**
- `POST /sec/policy/simulate` - Show which rules will trip for a proposed change; suggest compliant options
- `GET /sec/attestations?service=...` - Pull the audit bundle: SBOM, scan results, config proofs
- `POST /sec/jit/plan` - Propose safe, time-boxed JIT roles for on-call diagnostics (principals, scopes, TTL)

#### **8. QA & Test Engineering**
- `POST /qa/readiness` - Does env X satisfy test pre-reqs? (data, flags, routes, quotas) → fix plan
- `POST /qa/seeding/plan` - Minimal deterministic test data plan per component, with cleanup
- `POST /qa/perf/profile` - Perf test skeleton: target mix, SLO gates, auto-dashboards to watch

#### **9. Cost & FinOps**
- `POST /cost/estimate` - Pre-deploy cost estimate by env; sensitivity analysis (P50/P95)
- `GET /cost/attribution?service=...` - Current burn vs budget by tag; anomalies & recommendations
- `POST /cost/guardrails` - Generate budgets + alerts; propose right-sizing & off-hours schedules

#### **10. Developer Experience (DPE) & Self-Service**
- `POST /dx/scaffold` - Given intent → repo layout, CI jobs, devcontainer, local mocks plan
- `POST /dx/forms` - From schemas → UI form spec (labels, groups, defaults, hints, examples)
- `GET /dx/doctor?service=...` - "What's slowing us down?" CI cache misses, flaky tests, slow binds

#### **11. Governance & Exec Insights**
- `GET /gov/scorecard?service=...` - Composite score: reliability, security, velocity, cost; trendlines
- `GET /gov/portfolio` - Portfolio map with red/yellow/green posture, top risks, deltas since last week
- `POST /gov/brief` - Executive brief: 1-pager, last-7-days outcomes, risks, mitigations, asks

## Configuration

### Basic Usage

```yaml
# service.yml
- name: platform-shinobi
  type: shinobi
  config:
    # Data sources to index
    dataSources:
      components: true
      services: true
      dependencies: true
      compliance: true
      cost: true
      security: true
      performance: true
    
    # Feature flags for functionality control
    featureFlags:
      enabled: true
      provider: "aws-appconfig"
      defaults:
        "shinobi.advanced-analytics": true
        "shinobi.ai-insights": false
        "shinobi.auto-remediation": false
        "shinobi.predictive-scaling": false
        "shinobi.cost-optimization": true
        "shinobi.security-scanning": true
        "shinobi.compliance-monitoring": true
        "shinobi.performance-profiling": true
        "shinobi.dependency-analysis": true
        "shinobi.change-impact": true
    
    # API configuration
    api:
      exposure: "internal"  # or "public"
      loadBalancer:
        enabled: true
        certificateArn: "arn:aws:acm:..."
        domainName: "shinobi.example.com"
      rateLimit:
        requestsPerMinute: 1000
        burstCapacity: 2000
    
    # Observability
    observability:
      provider: "cloudwatch"  # or "newrelic", "grafana", "datadog"
      dashboards: ["reliability", "performance", "security"]
      alerts:
        enabled: true
        thresholds:
          cpuUtilization: 80
          memoryUtilization: 80
          responseTime: 2
    
    # Compliance
    compliance:
      securityLevel: "enhanced"  # "standard", "enhanced", "maximum"
      auditLogging: true
    
    # Local development
    localDev:
      enabled: true
      seedData:
        sampleComponents: true
        sampleServices: true
        sampleMetrics: true
      mockServices: true
```

### Advanced Configuration

```yaml
- name: enterprise-shinobi
  type: shinobi
  config:
    compute:
      mode: "ecs"
      cpu: 1024
      memory: 2048
      taskCount: 3
      containerPort: 3000
    
    dataStore:
      type: "dynamodb"
      dynamodb:
        billingMode: "PROVISIONED"
        readCapacity: 100
        writeCapacity: 100
    
    vpc:
      vpcId: "vpc-12345678"
      subnetIds: ["subnet-12345678", "subnet-87654321"]
      securityGroupIds: ["sg-12345678"]
    
    logging:
      retentionDays: 90
      logLevel: "info"
      structuredLogging: true
```

## Feature Flags

Shinobi uses extensive feature flags to control functionality:

### **Core Intelligence Flags**
- `shinobi.advanced-analytics` - Enable advanced analytics and ML insights
- `shinobi.ai-insights` - Enable AI-powered insights and recommendations
- `shinobi.auto-remediation` - Enable automatic remediation of common issues
- `shinobi.predictive-scaling` - Enable predictive scaling based on historical patterns

### **Operational Flags**
- `shinobi.cost-optimization` - Enable cost optimization recommendations
- `shinobi.security-scanning` - Enable continuous security scanning
- `shinobi.compliance-monitoring` - Enable real-time compliance monitoring
- `shinobi.performance-profiling` - Enable detailed performance profiling
- `shinobi.dependency-analysis` - Enable comprehensive dependency analysis
- `shinobi.change-impact` - Enable change impact analysis

### **API Endpoint Flags**
- `shinobi.api.catalog` - Enable component catalog API endpoints
- `shinobi.api.graph` - Enable graph and topology API endpoints
- `shinobi.api.manifest` - Enable manifest generation API endpoints
- `shinobi.api.reliability` - Enable reliability and SLO API endpoints
- `shinobi.api.observability` - Enable observability API endpoints
- `shinobi.api.change` - Enable change management API endpoints
- `shinobi.api.security` - Enable security API endpoints
- `shinobi.api.qa` - Enable QA API endpoints
- `shinobi.api.cost` - Enable cost API endpoints
- `shinobi.api.dx` - Enable developer experience API endpoints
- `shinobi.api.governance` - Enable governance API endpoints

### **Data Source Flags**
- `shinobi.data.components` - Enable components catalog indexing
- `shinobi.data.services` - Enable services registry indexing
- `shinobi.data.dependencies` - Enable dependencies graph indexing
- `shinobi.data.compliance` - Enable compliance status indexing
- `shinobi.data.cost` - Enable cost data indexing
- `shinobi.data.security` - Enable security posture indexing
- `shinobi.data.performance` - Enable performance metrics indexing

### **Local Development Flags**
- `shinobi.local.seed-data` - Enable seed data for local development
- `shinobi.local.mock-services` - Enable mock external services

### **Experimental Flags**
- `shinobi.experimental.gui` - Enable experimental drag-and-drop GUI features
- `shinobi.experimental.voice` - Enable experimental voice command features

## Capabilities

### **Provided Capabilities**
- `api:rest` - REST API endpoints
- `container:ecs` - ECS container orchestration
- `intelligence:platform` - Platform intelligence and insights
- `observability:comprehensive` - Comprehensive observability
- `compliance:monitoring` - Compliance monitoring
- `security:scanning` - Security scanning
- `cost:optimization` - Cost optimization
- `performance:profiling` - Performance profiling
- `dependency:analysis` - Dependency analysis
- `change:impact` - Change impact analysis
- `feature:flags` - Feature flag management

### **Required Capabilities**
- `vpc:network` - VPC network access
- `security:groups` - Security group management
- `feature:flags:provider` - Feature flag provider

## Construct Handles

- `main` - Main Shinobi service
- `cluster` - ECS cluster
- `service` - ECS service
- `taskDefinition` - ECS task definition
- `repository` - ECR repository
- `dataTable` - DynamoDB table
- `loadBalancer` - Application Load Balancer
- `logGroup` - CloudWatch Log Group
- `eventRule` - EventBridge rule for re-indexing

## Compliance Frameworks

### **Commercial**
- Standard security level
- Basic observability
- 30-day log retention
- Internal API exposure

### **FedRAMP Moderate**
- Enhanced security level
- Advanced analytics enabled
- 90-day log retention
- Internal API exposure only
- All data sources enabled

### **FedRAMP High**
- Maximum security level
- All AI/ML features enabled
- 7-year log retention
- Internal API exposure only
- All data sources enabled
- Enhanced monitoring thresholds

## Local Development

```bash
# Start Shinobi locally with seed data
shinobi dev up

# Access the API
curl http://localhost:3000/health

# View API documentation
open http://localhost:3000/docs

# Check feature flags
curl http://localhost:3000/feature-flags
```

## Examples

### **Generate a Manifest**
```bash
curl -X POST http://localhost:3000/manifest/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Generate a serverless API with a DynamoDB table for storing user data"}'
```

### **Get Component Schema**
```bash
curl http://localhost:3000/catalog/components/lambda-api/schema
```

### **Check SLO Status**
```bash
curl "http://localhost:3000/reliability/slo/status?service=user-api"
```

### **Generate Dashboard**
```bash
curl -X POST http://localhost:3000/obs/dashboard/provision \
  -H "Content-Type: application/json" \
  -d '{"service": "user-api", "provider": "cloudwatch"}'
```

## Architecture

Shinobi is built on AWS ECS Fargate with the following architecture:

- **Compute**: ECS Fargate with auto-scaling
- **Data Store**: DynamoDB with GSI for query patterns
- **API**: Application Load Balancer with HTTPS
- **Observability**: CloudWatch with custom dashboards and alarms
- **Security**: IAM roles with least privilege, VPC isolation
- **Compliance**: Framework-specific hardening and audit logging

## Integration

Shinobi integrates with:
- **OpenFeature** for feature flag management
- **AWS AppConfig** for configuration management
- **CloudWatch** for observability
- **DynamoDB** for data storage
- **EventBridge** for event-driven re-indexing
- **ECS** for container orchestration

## Future Roadmap

- **Drag-and-drop GUI** for visual manifest generation
- **Voice commands** for hands-free operation
- **AI-powered insights** with machine learning
- **Autonomous operations** with self-healing
- **Multi-cloud support** beyond AWS
- **Real-time collaboration** for team workflows

---

*Shinobi - The Platform Intelligence Brain. Ask the brain, get an answer or an action.*
