# Testing the Agent-Driven Audit System

## Quick Start

### 1. Restart Cursor
```
Command Palette → "Reload Window"
or
Restart Cursor entirely
```

### 2. Verify MCP Server Loaded

Check MCP panel - should show:
- **69 tools** (up from 62)
- Shinobi server connected
- No errors

### 3. Quick Smoke Tests

#### Test Standards (New Feature)
```
List all platform standards
```
Expected: JSON with ~8 standards, chunk counts, URIs

#### Test Review Run (New Feature)  
```
Start an agent-driven audit of the shinobi-mcp-server
```
Expected:
- Returns `runId`
- Returns `automatedFindings` (7 rule packs)
- Returns `agentTasks` (5 tasks with detailed prompts)

#### Test Review Schema (New Feature)
```
Show me the agent task and finding schemas
```
Expected: JSON schemas for Finding and AgentTask types

## Detailed Testing

### Standards System

**List Standards:**
```typescript
await mcp_shinobi_standards_list({})
```

Should return:
```json
{
  "standards": [
    {
      "id": "testing",
      "name": "Testing Standard",
      "uri": "shinobi://standards/testing/v1",
      "chunks": 5,
      "updatedAt": "2025-10-22T..."
    },
    ...
  ]
}
```

**Get Standard Chunk:**
```typescript
await mcp_shinobi_standards_get({
  uri: "shinobi://standards/testing/v1#test-metadata"
})
```

Should return specific section content.

### Agent-Driven Review

**Start Review:**
```typescript
const review = await mcp_shinobi_review_run({
  serviceId: "shinobi-mcp-server",
  scopes: ["infra", "code", "config"],
  failLevel: "error"
})
```

Should return:
```json
{
  "runId": "uuid-here",
  "automatedFindings": [
    {
      "id": "AUTO-1",
      "ruleId": "SEC-S3-001",
      "category": "security",
      "severity": "high",
      "scope": "infra",
      "target": "MyBucket",
      "evidence": "...",
      "why": "...",
      "fix": "...",
      "refs": ["..."],
      "effort": "M"
    }
  ],
  "agentTasks": [
    {
      "taskId": "audit-testing-standard",
      "title": "Testing Standard Compliance Audit",
      "prompt": "300+ character detailed prompt...",
      "inputs": {
        "paths": ["packages/components/*/tests/**"],
        "standards": ["platform-testing-standard.md"]
      },
      "suggestedToolCalls": [
        {
          "tool": "read_file",
          "args": { "target_file": "..." }
        }
      ]
    },
    {
      "taskId": "audit-capability-binding",
      ...
    },
    {
      "taskId": "audit-versioning",
      ...
    },
    {
      "taskId": "audit-dependency-graph",
      ...
    },
    {
      "taskId": "audit-security-deepdive",
      ...
    }
  ]
}
```

**Submit Agent Findings:**
```typescript
await mcp_shinobi_review_submit_agent_findings({
  runId: "uuid-from-above",
  taskId: "audit-testing-standard",
  findings: [
    {
      id: "AGENT-1",
      ruleId: "PTS-102",
      category: "testing",
      severity: "high",
      scope: "code",
      target: "s3-bucket.test.ts",
      evidence: "Missing metadata file",
      why: "Required per platform-testing-standard.md §11",
      fix: "Create .meta.json with 12 required fields",
      refs: ["platform-testing-standard.md#11"],
      effort: "S"
    }
  ]
})
```

Should return: `{ "accepted": true }`

**Merge Report:**
```typescript
const result = await mcp_shinobi_review_merge({
  runId: "uuid-from-above"
})
```

Should return:
```json
{
  "report": {
    "findings": [...],
    "suppressedFindings": [...],
    "tickets": [
      {
        "title": "[PTS-102] Missing metadata",
        "severity": "high",
        "steps": ["...", "...", "..."],
        "acceptance": ["...", "..."]
      }
    ],
    "automatedChecks": {
      "executed": ["infra.security", ...],
      "duration": 1234
    },
    "agentAnalysis": {
      "tasksCompleted": ["audit-testing-standard"],
      "duration": 5678
    }
  },
  "exitCode": 2,
  "summary": {
    "score": {
      "infra": 85,
      "code": 92,
      "config": 100,
      "overall": 92
    },
    "totals": {
      "blocker": 0,
      "high": 2,
      "medium": 3,
      "low": 1
    }
  }
}
```

## What Should Error (Expected Behavior)

These methods **should throw errors** (not implemented yet):
- Service registry
- Dependency graph
- Compliance status
- Cost data
- Security posture
- Performance metrics

If they return fake data, something is wrong.  
If they error with "not yet implemented", that's **correct**.

## Agent Tasks Inspection

Each agent task should have:

**Testing Standard:**
- 10 validation requirements in prompt
- Suggests reading standard doc + finding test files
- Max 50 findings, 5 min timeout

**Capability Binding:**
- 7 validation requirements
- Suggests codebase search + MCP binding matrix call
- Max 30 findings, 4 min timeout

**Versioning:**
- 7 validation requirements
- Suggests finding package.json + CHANGELOG files
- Max 20 findings, 3 min timeout

**Dependency Graph:**
- 7 validation requirements
- Suggests codebase search + NX workspace call
- Max 25 findings, 4 min timeout

**Security Deep Dive:**
- 10 validation requirements
- Suggests AWS docs search + secrets grep
- Max 40 findings, 5 min timeout

## Success Criteria

✅ 69 tools loaded  
✅ Standards list returns real data  
✅ Review run returns automated findings + 5 tasks  
✅ Agent tasks have detailed prompts (not empty)  
✅ Submit findings works  
✅ Merge produces comprehensive report  
✅ Tickets are generated from findings  
✅ Scores calculated (0-100)  
✅ Exit codes work (0/1/2)  
✅ Mock methods properly error  

## Troubleshooting

**Tools not showing:**
- Restart Cursor harder (quit and reopen)
- Check MCP config in `~/.cursor/mcp.json`
- Run `pnpm mcp:build` and try again

**Errors on tool calls:**
- Check Console for actual error message
- Most common: TypeScript errors (should be fixed)
- If "not implemented" error: expected for some tools

**Agent tasks empty:**
- Check review-run.ts line 177-181
- Should call task-generator.ts
- Verify task-generator.ts exists

---

**Ready to test!** Start with standards list, then try a full review run. 🥷🏻


