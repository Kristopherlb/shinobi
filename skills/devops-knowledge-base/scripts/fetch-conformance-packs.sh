#!/bin/bash
# Fetches AWS Config conformance packs from AWS Labs repository
# Usage: ./fetch-conformance-packs.sh [output-dir]
# Output directory defaults to references/conformance-packs/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="${1:-$SKILL_DIR/references/conformance-packs}"
REPO_URL="https://github.com/awslabs/aws-config-rules"
REPO_BRANCH="master"
REPO_PATH="aws-config-conformance-packs"

echo "📦 Fetching AWS Config conformance packs..."
echo "   Repository: $REPO_URL"
echo "   Branch: $REPO_BRANCH"
echo "   Path: $REPO_PATH"
echo "   Output: $OUTPUT_DIR"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Check if git is available
if ! command -v git &> /dev/null; then
  echo "❌ Error: git is required but not installed"
  exit 1
fi

# Clone or update repository
TEMP_REPO_DIR=$(mktemp -d)
trap "rm -rf $TEMP_REPO_DIR" EXIT

echo "📥 Cloning repository..."
git clone --depth 1 --branch "$REPO_BRANCH" "$REPO_URL" "$TEMP_REPO_DIR" 2>/dev/null || {
  echo "⚠️  Clone failed, trying without branch specification..."
  git clone --depth 1 "$REPO_URL" "$TEMP_REPO_DIR"
}

# Copy conformance packs
if [ -d "$TEMP_REPO_DIR/$REPO_PATH" ]; then
  echo "📋 Copying conformance packs..."
  cp -r "$TEMP_REPO_DIR/$REPO_PATH"/* "$OUTPUT_DIR/" 2>/dev/null || {
    echo "⚠️  Some files may not have copied successfully"
  }
  echo "✅ Conformance packs fetched to $OUTPUT_DIR"
else
  echo "❌ Error: Conformance packs directory not found in repository"
  exit 1
fi

# Generate index
echo "📝 Generating index..."
cat > "$OUTPUT_DIR/INDEX.md" <<EOF
# AWS Config Conformance Packs Index

**Source**: $REPO_URL/tree/$REPO_BRANCH/$REPO_PATH  
**Fetched**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Available Conformance Packs

EOF

# List all YAML files
find "$OUTPUT_DIR" -name "*.yaml" -o -name "*.yml" | sort | while read -r file; do
  basename_file=$(basename "$file")
  echo "- \`$basename_file\`" >> "$OUTPUT_DIR/INDEX.md"
done

echo "✅ Index generated at $OUTPUT_DIR/INDEX.md"
echo ""
echo "📚 Next steps:"
echo "   1. Review conformance packs in $OUTPUT_DIR"
echo "   2. Parse rules using scripts/parse-conformance-packs.sh (if available)"
echo "   3. Update references/CONFORMANCE_PACK_MAPPING.md with new packs"


