#!/bin/bash
# Generates EVIDENCE.md test report for FedRAMP compliance
# Usage: ./generate-evidence.sh [test-output-file]
# This script should be run after `pnpm nx test` completes

set -e

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SKILL_NAME="devops-knowledge-base"
EVIDENCE_FILE="$SKILL_DIR/EVIDENCE.md"
TEST_OUTPUT="${1:-}"

# Get current timestamp
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$EVIDENCE_FILE" <<EOF
# Test Evidence Report: devops-knowledge-base

**Generated**: $TIMESTAMP  
**Skill**: devops-knowledge-base  
**Test Framework**: Vitest (3-layer testing hierarchy)

## Test Summary

| Layer | Test File | Status | Notes |
|-------|-----------|--------|-------|
| **Layer 1: Structural** | \`tests/structure.test.ts\` | PENDING | Run \`pnpm nx test @shinobi/skill-devops-knowledge-base\` |
| **Layer 2: Deterministic** | \`tests/scripts.test.ts\` | PENDING | Validates executable scripts |
| **Layer 3: Behavioral** | \`tests/behavior.meta.json\` | PENDING | LLM-as-a-judge evals |

## Test Results

\`\`\`
<!-- Test output will be appended here after test execution -->
\`\`\`

## Compliance Notes

This evidence bundle is generated for FedRAMP High compliance requirements. All test results are timestamped and can be consumed by the Arbiter during the release process.

## Test IDs

- TP-devops-knowledge-base-structure-001: Structural validation (metadata, file layout, naming)
- TP-devops-knowledge-base-scripts-001: Deterministic script unit tests
- TP-devops-knowledge-base-behavior-001: Behavioral evals (LLM instruction adherence)

EOF

echo "✅ Evidence report generated at $EVIDENCE_FILE"


