#!/bin/bash
# Parses AWS Config conformance pack YAML files into reference documentation
# Uses LLM (via Cursor agent or similar) to extract rules and update markdown files
# Usage: ./parse-conformance-packs.sh [conformance-packs-dir]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFORMANCE_PACKS_DIR="${1:-$SKILL_DIR/references/conformance-packs}"
REFERENCES_DIR="$SKILL_DIR/references"

echo "📋 Parsing AWS Config conformance packs..."
echo "   Source: $CONFORMANCE_PACKS_DIR"
echo "   Output: $REFERENCES_DIR"

if [ ! -d "$CONFORMANCE_PACKS_DIR" ]; then
  echo "❌ Error: Conformance packs directory not found: $CONFORMANCE_PACKS_DIR"
  echo "   Run fetch-conformance-packs.sh first"
  exit 1
fi

# Count YAML files
YAML_COUNT=$(find "$CONFORMANCE_PACKS_DIR" -name "*.yaml" -o -name "*.yml" | wc -l | tr -d ' ')
echo "   Found $YAML_COUNT conformance pack files"

# Create parsing summary
PARSING_SUMMARY="$CONFORMANCE_PACKS_DIR/PARSING_SUMMARY.md"
cat > "$PARSING_SUMMARY" <<EOF
# Conformance Pack Parsing Summary

**Generated**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Source**: $CONFORMANCE_PACKS_DIR
**Total Packs**: $YAML_COUNT

## Parsing Instructions

This directory contains AWS Config conformance pack YAML files. To update the reference documentation:

1. **Review each YAML file** for:
   - AWS Config rules referenced
   - Remediation actions
   - Compliance framework mappings
   - Observability requirements

2. **Extract rules** and update:
   - \`references/CONFORMANCE_PACK_MAPPING.md\` - Add new service/framework mappings
   - \`references/OBSERVABILITY_RULES.md\` - Extract CloudWatch, logging, tracing rules
   - \`references/COMPLIANCE_RULES.md\` - Extract compliance framework requirements
   - \`references/OPERATIONAL_BEST_PRACTICES.md\` - Extract operational patterns

3. **Use LLM assistance** (Cursor agent) to:
   - Parse YAML structure
   - Extract rule descriptions
   - Map to component configuration patterns
   - Generate markdown documentation

## Automated Parsing (Future)

This script will be enhanced to:
- Use LLM API to parse YAML files automatically
- Generate structured markdown from conformance pack rules
- Update reference files with extracted information
- Validate extracted rules against platform standards

## Manual Parsing Workflow

For now, use this workflow:

1. Identify relevant conformance pack (e.g., \`Operational-Best-Practices-for-S3.yaml\`)
2. Review YAML structure:
   \`\`\`bash
   cat "$CONFORMANCE_PACKS_DIR/Operational-Best-Practices-for-S3.yaml" | head -50
   \`\`\`
3. Extract key rules:
   - AWS Config rule names
   - Remediation actions
   - Compliance requirements
4. Update appropriate reference file:
   - Service mappings → \`CONFORMANCE_PACK_MAPPING.md\`
   - Observability → \`OBSERVABILITY_RULES.md\`
   - Compliance → \`COMPLIANCE_RULES.md\`
   - Operations → \`OPERATIONAL_BEST_PRACTICES.md\`

## Example: Parsing S3 Conformance Pack

\`\`\`bash
# View S3 pack structure
cat "$CONFORMANCE_PACKS_DIR/Operational-Best-Practices-for-S3.yaml"

# Extract rule names
grep -i "rule" "$CONFORMANCE_PACKS_DIR/Operational-Best-Practices-for-S3.yaml" | head -20

# Find remediation actions
grep -i "remediation" "$CONFORMANCE_PACKS_DIR/Operational-Best-Practices-for-S3.yaml"
\`\`\`

## Next Steps

1. Review conformance packs in this directory
2. Use Cursor agent with \`devops-knowledge-base\` skill to parse and extract rules
3. Update reference documentation with extracted information
4. Commit changes to repository

EOF

echo "✅ Parsing summary generated at $PARSING_SUMMARY"
echo ""
echo "📚 Next steps:"
echo "   1. Review conformance packs in $CONFORMANCE_PACKS_DIR"
echo "   2. Use Cursor agent with devops-knowledge-base skill to parse YAML files"
echo "   3. Update reference documentation in $REFERENCES_DIR"
echo "   4. Run 'pnpm nx update @shinobi/skill-devops-knowledge-base' to automate this process"


