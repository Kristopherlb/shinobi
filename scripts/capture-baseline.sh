#!/bin/bash
# scripts/capture-baseline.sh
# Captures a comprehensive baseline of the current build/test/typecheck state
# Usage: ./scripts/capture-baseline.sh

set -e

BASELINE_DIR="baselines/baseline-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BASELINE_DIR"

echo "📦 Capturing baseline at $(date)" | tee "$BASELINE_DIR/baseline-info.txt"
echo "Git commit: $(git rev-parse HEAD)" >> "$BASELINE_DIR/baseline-info.txt"
echo "Git branch: $(git branch --show-current)" >> "$BASELINE_DIR/baseline-info.txt"
echo "Node version: $(node -v)" >> "$BASELINE_DIR/baseline-info.txt"
echo "pnpm version: $(pnpm -v)" >> "$BASELINE_DIR/baseline-info.txt"
echo "Nx version: $(pnpm nx --version)" >> "$BASELINE_DIR/baseline-info.txt"

echo ""
echo "🔨 Building all projects..."
BUILD_START=$(date +%s)
pnpm nx run-many -t build --all --output-style=stream > "$BASELINE_DIR/build-results.txt" 2>&1 || true
BUILD_EXIT=$?
BUILD_END=$(date +%s)
BUILD_DURATION=$((BUILD_END - BUILD_START))

echo ""
echo "🧪 Running all tests..."
TEST_START=$(date +%s)
pnpm nx run-many -t test --all --output-style=stream > "$BASELINE_DIR/test-results.txt" 2>&1 || true
TEST_EXIT=$?
TEST_END=$(date +%s)
TEST_DURATION=$((TEST_END - TEST_START))

echo ""
echo "📝 Typechecking all projects..."
TYPECHECK_START=$(date +%s)
pnpm nx run-many -t typecheck --all --output-style=stream > "$BASELINE_DIR/typecheck-results.txt" 2>&1 || true
TYPECHECK_EXIT=$?
TYPECHECK_END=$(date +%s)
TYPECHECK_DURATION=$((TYPECHECK_END - TYPECHECK_START))

echo ""
echo "📊 Generating dependency graph..."
pnpm nx graph --file="$BASELINE_DIR/dependency-graph.json" --format=json 2>&1 || pnpm nx graph > "$BASELINE_DIR/dependency-graph.txt" 2>&1 || true

echo ""
echo "📦 Capturing package metadata..."
find packages apps -name "package.json" -type f 2>/dev/null | while read -r pkg; do
  echo "=== $pkg ===" >> "$BASELINE_DIR/package-jsons.txt"
  cat "$pkg" >> "$BASELINE_DIR/package-jsons.txt"
  echo "" >> "$BASELINE_DIR/package-jsons.txt"
done || true

echo ""
echo "📋 Capturing workspace dependency tree..."
pnpm list --depth=10 > "$BASELINE_DIR/pnpm-deps.txt" 2>&1 || true

echo ""
echo "📁 Capturing dist file structure..."
find dist -type f \( -name "*.js" -o -name "*.d.ts" -o -name "*.map" \) 2>/dev/null | sort > "$BASELINE_DIR/dist-files.txt" || echo "No dist files found" > "$BASELINE_DIR/dist-files.txt"

echo ""
echo "📊 Capturing project list..."
pnpm nx show projects --json > "$BASELINE_DIR/projects.json" 2>&1 || true

# Count successes/failures
BUILD_SUCCESS=$(grep -c "✔" "$BASELINE_DIR/build-results.txt" 2>/dev/null || echo "0")
BUILD_FAILED=$(grep -c "✖" "$BASELINE_DIR/build-results.txt" 2>/dev/null || echo "0")
TEST_SUCCESS=$(grep -c "✔" "$BASELINE_DIR/test-results.txt" 2>/dev/null || echo "0")
TEST_FAILED=$(grep -c "✖" "$BASELINE_DIR/test-results.txt" 2>/dev/null || echo "0")
TYPECHECK_SUCCESS=$(grep -c "✔" "$BASELINE_DIR/typecheck-results.txt" 2>/dev/null || echo "0")
TYPECHECK_FAILED=$(grep -c "✖" "$BASELINE_DIR/typecheck-results.txt" 2>/dev/null || echo "0")

# Generate summary
cat > "$BASELINE_DIR/SUMMARY.md" << EOF
# Baseline Capture Summary

**Timestamp**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Git Commit**: $(git rev-parse HEAD)
**Git Branch**: $(git branch --show-current)

## Environment
- Node: $(node -v)
- pnpm: $(pnpm -v)
- Nx: $(pnpm nx --version)

## Build Status
- Exit Code: $BUILD_EXIT
- Duration: ${BUILD_DURATION}s
- Success: $BUILD_SUCCESS
- Failed: $BUILD_FAILED
- Results: See build-results.txt

## Test Status  
- Exit Code: $TEST_EXIT
- Duration: ${TEST_DURATION}s
- Success: $TEST_SUCCESS
- Failed: $TEST_FAILED
- Results: See test-results.txt

## Typecheck Status
- Exit Code: $TYPECHECK_EXIT
- Duration: ${TYPECHECK_DURATION}s
- Success: $TYPECHECK_SUCCESS
- Failed: $TYPECHECK_FAILED
- Results: See typecheck-results.txt

## Artifacts
- Build results: \`build-results.txt\`
- Test results: \`test-results.txt\`
- Typecheck results: \`typecheck-results.txt\`
- Dependency graph: \`dependency-graph.json\`
- Package metadata: \`package-jsons.txt\`
- pnpm dependencies: \`pnpm-deps.txt\`
- Dist files: \`dist-files.txt\`
- Projects list: \`projects.json\`

## Usage
To compare current state against this baseline:
\`\`\`bash
./scripts/compare-to-baseline.sh $BASELINE_DIR
\`\`\`
EOF

echo ""
echo "✅ Baseline captured in $BASELINE_DIR"
echo "📄 Summary: $BASELINE_DIR/SUMMARY.md"
echo ""
echo "To use this baseline for comparison:"
echo "  ./scripts/compare-to-baseline.sh $BASELINE_DIR"
echo ""
echo "$BASELINE_DIR" > .baseline-ref
echo "Baseline reference saved to .baseline-ref"

