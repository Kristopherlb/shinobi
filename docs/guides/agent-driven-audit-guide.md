# Agent-Driven Audit System - Quick Start Guide

**Status:** ✅ **FULLY FUNCTIONAL** - Agent-driven audit system operational

## Overview

The Shinobi MCP server now includes a **two-phase agent-driven audit system**:

1. **Phase 1: Automated Checks** - Fast static analysis (cdk.out, file patterns, AST)
2. **Phase 2: Agent Analysis** - AI-powered semantic validation and deep reasoning
3. **Phase 3: Merge & Report** - Combine findings, apply suppressions, generate tickets

## Current Capabilities

### ✅ Working Now (67 MCP Tools)

**Original 47 tools** - All platform intelligence capabilities intact
**Legacy 15 audit tools** - Individual audits (deprecated but functional)  
**New 5 agent-driven tools** - Two-phase review system

### ✅ Agent-Driven Review Tools

1. **`shinobi.review.run`** - Start review, get automated findings + agent tasks
2. **`shinobi.review.submitAgentFindings`** - Submit agent analysis results  
3. **`shinobi.review.merge`** - Merge findings into final report
4. **`shinobi.review.report.get`** - Get formatted report (JSON/Markdown)
5. **`shinobi.review.schema`** - Get schemas for tasks and findings

## Quick Start

### 1. Start a Review

```typescript
// Call shinobi.review.run
const result = await mcp_shinobi_review_run({
  serviceId: "my-api",
  envId: "prod", 
  scopes: ["infra", "code", "config"],
  failLevel: "error"
});

// Returns:
// {
//   runId: "abc123",
//   automatedFindings: [...], // 8 rule packs executed
//   agentTasks: [...] // Tasks for AI agent to execute
// }
```

### 2. Agent Executes Tasks

The AI agent (you in Cursor) receives tasks like:

```json
{
  "taskId": "audit-testing-standard",
  "title": "Testing Standard Compliance Audit", 
  "prompt": "Analyze all test files against platform-testing-standard.md...",
  "inputs": {
    "paths": ["packages/components/*/tests/**/*.test.ts"],
    "standards": ["platform-testing-standard.md"]
  },
  "suggestedToolCalls": [
    { "tool": "read_file", "args": { "target_file": "docs/platform-standards/platform-testing-standard.md" }},
    { "tool": "glob_file_search", "args": { "glob_pattern": "**/tests/**/*.test.ts" }}
  ]
}
```

**Agent performs:**
- Reads test files and standards
- Analyzes semantically (metadata, naming, oracles, assertions)
- Generates structured findings
- Calls suggested tools (AWS MCP servers, file system)

### 3. Submit Agent Findings

```typescript
// Agent submits findings back
await mcp_shinobi_review_submit_agent_findings({
  runId: "abc123",
  taskId: "audit-testing-standard", 
  findings: [
    {
      id: "AGENT-TESTING-1",
      ruleId: "PTS-102", 
      category: "testing",
      severity: "high",
      scope: "code",
      target: "packages/components/s3-bucket/tests/s3-bucket.test.ts",
      evidence: "Missing .meta.json sidecar file",
      why: "Every test must have metadata documenting oracle, invariants, etc.",
      fix: "Create s3-bucket.test.meta.json with required fields",
      refs: ["platform-testing-standard.md#11"],
      effort: "S"
    }
  ]
});
```

### 4. Merge and Get Report

```typescript
// Merge all findings
const report = await mcp_shinobi_review_merge({
  runId: "abc123"
});

// Returns:
// {
//   report: { findings: [...], tickets: [...] },
//   exitCode: 2, // 0=ok, 1=error, 2=violations
//   summary: { infra: 85, code: 92, config: 100 }
// }

// Get formatted report
const markdown = await mcp_shinobi_review_report_get({
  runId: "abc123",
  format: "markdown"
});
```

## What's Analyzed

### Automated Checks (Phase 1)
- **Infrastructure:** S3 encryption, IAM wildcards, Lambda tracing, tagging
- **Code:** CDK best practices, logging standards, console.* usage
- **Config:** Environment branching, precedence chain violations

### Agent Analysis (Phase 2)  
- **Testing Standard:** Deep metadata validation, test quality analysis
- **Semantic Validation:** Things that require human reasoning
- **Cross-references:** Standards compliance, architectural patterns

## Example Workflow

```bash
# 1. Start review
curl -X POST /mcp/tools/call \
  -d '{"name": "shinobi.review.run", "arguments": {"serviceId": "my-api"}}'

# 2. Agent analyzes (in Cursor)
# - Reads files
# - Calls AWS MCP tools  
# - Generates findings

# 3. Submit findings
curl -X POST /mcp/tools/call \
  -d '{"name": "shinobi.review.submitAgentFindings", "arguments": {...}}'

# 4. Get final report
curl -X POST /mcp/tools/call \
  -d '{"name": "shinobi.review.merge", "arguments": {"runId": "abc123"}}'
```

## Architecture Benefits

✅ **Separation of Concerns** - Fast automated + deep agent analysis  
✅ **Scalable** - Add new agent tasks without changing core  
✅ **Standards-Driven** - References platform standards documents  
✅ **Suppression Support** - Ignore findings with justification  
✅ **Exit Codes** - CI/CD integration (0=ok, 2=violations)  
✅ **Multiple Formats** - JSON for automation, Markdown for humans  
✅ **Audit Trail** - Track tool calls and analysis steps  

## Next Steps

**Immediate:** System is ready for use - start reviews now!  
**Future:** Add more agent tasks (capability binding, versioning, dependency analysis)  
**Enhancement:** Standards as MCP resources, ticket generation, AWS MCP integration  

---

**Ready to audit!** 🥷🏻 The agent-driven system is fully operational.

