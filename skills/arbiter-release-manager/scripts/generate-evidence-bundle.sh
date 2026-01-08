#!/bin/bash
# Generates FedRAMP Evidence Bundle for compliance audit
# Usage: ./generate-evidence-bundle.sh [compliance-framework] [output-dir]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKSPACE_ROOT="$(cd "$SKILL_DIR/../../.." && pwd)"
COMPLIANCE_FRAMEWORK="${1:-commercial}"
OUTPUT_DIR="${2:-$WORKSPACE_ROOT/evidence-bundles/$COMPLIANCE_FRAMEWORK-$(date +%Y-%m-%d)}"

echo "📦 Generating FedRAMP Evidence Bundle..."
echo "   Compliance Framework: $COMPLIANCE_FRAMEWORK"
echo "   Output Directory: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"/{oscal,tests,logs,dashboards,tags}

# Generate index
cat > "$OUTPUT_DIR/index.md" <<EOF
# Evidence Bundle: $COMPLIANCE_FRAMEWORK

**Generated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Compliance Framework**: $COMPLIANCE_FRAMEWORK
**Workspace**: $WORKSPACE_ROOT

## Evidence Contents

- **OSCAL**: Component assessments in Open Security Controls Assessment Language format
- **Tests**: Test results and coverage reports
- **Logs**: Structured log samples and log group configurations
- **Dashboards**: CloudWatch dashboard definitions
- **Tags**: Resource tagging compliance reports

## Evidence Structure

\`\`\`
$OUTPUT_DIR/
├── index.md
├── oscal/
│   └── component-assessment.json
├── tests/
│   ├── coverage-report.json
│   └── test-results.json
├── logs/
│   └── log-samples.json
├── dashboards/
│   └── dashboard-definitions.json
└── tags/
    └── tagging-compliance.json
\`\`\`

## Collection Instructions

1. **OSCAL Artifacts**: Run component audits and export OSCAL format
2. **Test Results**: Collect test execution results and coverage reports
3. **Log Samples**: Extract structured log samples from CloudWatch Logs
4. **Dashboards**: Export CloudWatch dashboard definitions
5. **Tagging**: Generate tagging compliance reports

## Next Steps

1. Collect evidence artifacts into respective directories
2. Validate OSCAL format compliance
3. Verify all required artifacts are present
4. Package evidence bundle for auditor review

EOF

# Generate placeholder files
cat > "$OUTPUT_DIR/oscal/component-assessment.json" <<EOF
{
  "component-assessments": [],
  "compliance-framework": "$COMPLIANCE_FRAMEWORK",
  "generated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "note": "Run component audits to populate this file"
}
EOF

cat > "$OUTPUT_DIR/tests/test-results.json" <<EOF
{
  "test-results": [],
  "coverage": {},
  "generated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "note": "Run tests and collect results to populate this file"
}
EOF

echo "✅ Evidence bundle structure created at $OUTPUT_DIR"
echo ""
echo "📚 Next steps:"
echo "   1. Collect OSCAL artifacts from component audits"
echo "   2. Collect test results and coverage reports"
echo "   3. Extract log samples from CloudWatch Logs"
echo "   4. Export CloudWatch dashboard definitions"
echo "   5. Generate tagging compliance reports"
echo "   6. Validate evidence bundle completeness"


