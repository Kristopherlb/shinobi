# Shinobi Component Generation Tools

This directory contains tools for generating production-grade, compliance-enabled AWS CDK L3 components using the Shinobi platform.

## Tools Overview

### `kb-load.mjs`
Platform KB pack selection helper that intelligently selects compliance packs based on service type and framework.

```bash
# Basic usage
node tools/kb-load.mjs platform-kb s3-bucket fedramp-moderate

# With explicit packs
node tools/kb-load.mjs platform-kb s3-bucket fedramp-moderate aws.global.logging aws.service.s3
```

### `agent-scaffold.mjs`
KB-driven component scaffolding tool that creates component package structure with audit plan and observability stubs.

```bash
# Scaffold a new component
node tools/agent-scaffold.mjs \
  --component s3-bucket \
  --service-type s3-bucket \
  --framework fedramp-moderate \
  --packs /tmp/packs.json \
  --controls "AC-2(3),AT-4(b)"
```

### `gen-tests-from-plan.mjs`
Generates unit tests based on component plan compliance requirements.

```bash
# Generate tests for a component
node tools/gen-tests-from-plan.mjs s3-bucket
```

### `gen-rego-from-plan.mjs`
Generates REGO policies based on component plan compliance requirements.

```bash
# Generate REGO policies for a component
node tools/gen-rego-from-plan.mjs s3-bucket
```

### `compliance-qa.mjs`
Answers questions about component compliance based on component plan.

```bash
# Ask about packs
node tools/compliance-qa.mjs s3-bucket "which packs are selected?"

# Ask about NIST controls
node tools/compliance-qa.mjs lambda-api "which nist controls are enforced?"

# Get compliance summary
node tools/compliance-qa.mjs ecs-cluster "provide a compliance summary"
```

### `shinobi-generate.mjs`
CLI wrapper for the Shinobi MCP agent to generate components from CI or command line.

```bash
# Generate an S3 bucket component with FedRAMP Moderate compliance
node tools/shinobi-generate.mjs \
  --componentName s3-bucket \
  --serviceType s3-bucket \
  --framework fedramp-moderate \
  --extraControlTags "AC-2(3),AT-4(b)" \
  --includeTests true \
  --includeObservability true \
  --includePolicies true
```

### `svc-audit-static.mjs`
Static compliance audit tool that validates generated components against platform standards.

```bash
# Run static compliance audit
node tools/svc-audit-static.mjs
```

## Example: Complete Component Generation

Here's how to generate a complete S3 bucket component with compliance by construction:

```bash
# 1. Load compliance packs
node tools/kb-load.mjs platform-kb s3-bucket fedramp-moderate > /tmp/packs.json

# 2. Extract selected packs
PACKS=$(cat /tmp/packs.json | jq -r '.chosen[].meta.id' | tr '\n' ',' | sed 's/,$//')

# 3. Generate component via Cursor MCP
# In Cursor, use: mcp_shinobi_generate_component
# With parameters:
# {
#   "componentName": "s3-bucket",
#   "serviceType": "s3-bucket", 
#   "framework": "fedramp-moderate",
#   "packsToInclude": ["aws.imported.fedramp-moderate", "aws.global.logging", "aws.service.s3"],
#   "extraControlTags": ["AC-2(3)", "AT-4(b)"],
#   "includeTests": true,
#   "includeObservability": true,
#   "includePolicies": true
# }

# 4. Validate generated component
node tools/svc-audit-static.mjs
```

## Generated Component Structure

The agent generates a complete component package with:

```
packages/components/s3-bucket/
├── src/
│   ├── s3-bucket.component.ts      # BaseComponent with 6-step synth()
│   ├── s3-bucket.builder.ts        # ConfigBuilder with 5-layer precedence
│   ├── s3-bucket.creator.ts        # IComponentCreator factory
│   └── index.ts                    # Public exports
├── tests/
│   ├── unit/
│   │   ├── builder.test.ts         # Config precedence tests
│   │   └── component.test.ts       # Component synthesis tests
│   ├── compliance.test.ts          # NIST control validation
│   └── observability.test.ts       # Monitoring tests
├── audit/
│   ├── component.plan.json         # Compliance plan with packs & controls
│   ├── s3-bucket.oscal.json       # OSCAL metadata stub
│   └── rego/
│       └── *.rego                  # REGO policies for posture rules
├── observability/
│   ├── alarms-config.json          # CloudWatch alarms
│   └── otel-dashboard-template.json # OpenTelemetry dashboard
├── package.json                    # Package manifest
└── README.md                       # Usage documentation
```

## Compliance Features

Generated components include:

- ✅ **6-step synth() pattern** following platform contract
- ✅ **ConfigBuilder with 5-layer precedence** (Component > Environment > Platform > Compliance > Hardcoded)
- ✅ **Compliance tagging** with `applyComplianceTags()` utility
- ✅ **REGO policies** for posture-type rules
- ✅ **Observability configs** with framework-specific retention
- ✅ **Comprehensive test suite** with 90%+ coverage target
- ✅ **NIST control mapping** including custom `extraControlTags`

## MCP Integration

These tools are integrated into the Shinobi MCP server and can be called via MCP tools:

- `kb.selectPacks` → calls `kb-load.mjs`
- `component.scaffold` → calls `agent-scaffold.mjs`
- `component.generateTests` → calls `gen-tests-from-plan.mjs`
- `component.generateRego` → calls `gen-rego-from-plan.mjs`
- `audit.static` → calls `svc-audit-static.mjs`
- `qa.component` → calls `compliance-qa.mjs`

## Cursor Integration

Use the system prompt in `docs/prompts/cursor-kb-aware-component-builder.md` and user prompt templates in `docs/prompts/cursor-user-prompt-template.md` for Cursor integration.

## CI Integration

The GitHub workflow (`.github/workflows/compliance-check.yml`) automatically:

1. Loads compliance packs using `kb-load.mjs`
2. Generates components with Shinobi agent
3. Runs static compliance audit with `svc-audit-static.mjs`
4. Validates generated artifacts
5. Runs component tests

## Framework Support

Supported compliance frameworks:
- `commercial` - Standard AWS best practices
- `fedramp-low` - FedRAMP Low requirements
- `fedramp-moderate` - FedRAMP Moderate requirements  
- `fedramp-high` - FedRAMP High requirements

## Extra Control Tags

Use `extraControlTags` to include additional NIST controls not in the standard catalog:

```bash
--extraControlTags "AC-2(3),AT-4(b),SC-13"
```

These controls are:
- Added to `nist_controls` in `component.plan.json`
- Included in `compliance:nist-controls` tags
- Referenced in OSCAL documentation
- Available for audit and JIRA tracking

## Next Steps

1. **Generate components** using the Shinobi MCP agent
2. **Review generated files** for compliance requirements
3. **Run tests** to validate functionality
4. **Extend platform KB** with additional packs and controls
5. **Customize templates** for organization-specific requirements