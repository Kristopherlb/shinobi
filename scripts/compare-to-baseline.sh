#!/bin/bash
# scripts/compare-to-baseline.sh
# Compares current build/test/typecheck state against a captured baseline
# Usage: ./scripts/compare-to-baseline.sh [BASELINE_DIR]
#        If BASELINE_DIR not provided, uses .baseline-ref

set -e

BASELINE_DIR="${1:-$(cat .baseline-ref 2>/dev/null || echo '')}"

# If baseline name doesn't include baselines/, prepend it
if [[ "$BASELINE_DIR" != baselines/* ]] && [[ "$BASELINE_DIR" == baseline-* ]]; then
  BASELINE_DIR="baselines/$BASELINE_DIR"
fi

if [ -z "$BASELINE_DIR" ] || [ ! -d "$BASELINE_DIR" ]; then
  echo "❌ Error: Baseline directory not found"
  echo "Usage: $0 [BASELINE_DIR]"
  echo "Or set .baseline-ref file with baseline directory name"
  exit 1
fi

echo "🔍 Comparing current state to baseline: $BASELINE_DIR"
echo ""

# Create temp directory for current results
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

echo "🔨 Running current build..."
pnpm nx run-many -t build --all --output-style=stream > "$TMP_DIR/current-build.txt" 2>&1 || true
CURRENT_BUILD_EXIT=$?

echo "🧪 Running current tests..."
pnpm nx run-many -t test --all --output-style=stream > "$TMP_DIR/current-test.txt" 2>&1 || true
CURRENT_TEST_EXIT=$?

echo "📝 Running current typecheck..."
pnpm nx run-many -t typecheck --all --output-style=stream > "$TMP_DIR/current-typecheck.txt" 2>&1 || true
CURRENT_TYPECHECK_EXIT=$?

# Count current results
CURRENT_BUILD_SUCCESS=$(grep -c "✔" "$TMP_DIR/current-build.txt" 2>/dev/null || echo "0")
CURRENT_BUILD_FAILED=$(grep -c "✖" "$TMP_DIR/current-build.txt" 2>/dev/null || echo "0")
CURRENT_TEST_SUCCESS=$(grep -c "✔" "$TMP_DIR/current-test.txt" 2>/dev/null || echo "0")
CURRENT_TEST_FAILED=$(grep -c "✖" "$TMP_DIR/current-test.txt" 2>/dev/null || echo "0")
CURRENT_TYPECHECK_SUCCESS=$(grep -c "✔" "$TMP_DIR/current-typecheck.txt" 2>/dev/null || echo "0")
CURRENT_TYPECHECK_FAILED=$(grep -c "✖" "$TMP_DIR/current-typecheck.txt" 2>/dev/null || echo "0")

# Count baseline results
BASELINE_BUILD_SUCCESS=$(grep -c "✔" "$BASELINE_DIR/build-results.txt" 2>/dev/null || echo "0")
BASELINE_BUILD_FAILED=$(grep -c "✖" "$BASELINE_DIR/build-results.txt" 2>/dev/null || echo "0")
BASELINE_TEST_SUCCESS=$(grep -c "✔" "$BASELINE_DIR/test-results.txt" 2>/dev/null || echo "0")
BASELINE_TEST_FAILED=$(grep -c "✖" "$BASELINE_DIR/test-results.txt" 2>/dev/null || echo "0")
BASELINE_TYPECHECK_SUCCESS=$(grep -c "✔" "$BASELINE_DIR/typecheck-results.txt" 2>/dev/null || echo "0")
BASELINE_TYPECHECK_FAILED=$(grep -c "✖" "$BASELINE_DIR/typecheck-results.txt" 2>/dev/null || echo "0")

# Generate comparison report
cat > "$TMP_DIR/comparison.md" << EOF
# Baseline Comparison Report

**Baseline**: $BASELINE_DIR
**Comparison Time**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

## Build Comparison

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Success | $BASELINE_BUILD_SUCCESS | $CURRENT_BUILD_SUCCESS | $((CURRENT_BUILD_SUCCESS - BASELINE_BUILD_SUCCESS)) |
| Failed | $BASELINE_BUILD_FAILED | $CURRENT_BUILD_FAILED | $((CURRENT_BUILD_FAILED - BASELINE_BUILD_FAILED)) |
| Exit Code | $(grep -oP 'Exit code: \K\d+' "$BASELINE_DIR/build-results.txt" 2>/dev/null || echo "N/A") | $CURRENT_BUILD_EXIT | - |

## Test Comparison

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Success | $BASELINE_TEST_SUCCESS | $CURRENT_TEST_SUCCESS | $((CURRENT_TEST_SUCCESS - BASELINE_TEST_SUCCESS)) |
| Failed | $BASELINE_TEST_FAILED | $CURRENT_TEST_FAILED | $((CURRENT_TEST_FAILED - BASELINE_TEST_FAILED)) |
| Exit Code | $(grep -oP 'Exit code: \K\d+' "$BASELINE_DIR/test-results.txt" 2>/dev/null || echo "N/A") | $CURRENT_TEST_EXIT | - |

## Typecheck Comparison

| Metric | Baseline | Current | Change |
|--------|----------|---------|--------|
| Success | $BASELINE_TYPECHECK_SUCCESS | $CURRENT_TYPECHECK_SUCCESS | $((CURRENT_TYPECHECK_SUCCESS - BASELINE_TYPECHECK_SUCCESS)) |
| Failed | $BASELINE_TYPECHECK_FAILED | $CURRENT_TYPECHECK_FAILED | $((CURRENT_TYPECHECK_FAILED - BASELINE_TYPECHECK_FAILED)) |
| Exit Code | $(grep -oP 'Exit code: \K\d+' "$BASELINE_DIR/typecheck-results.txt" 2>/dev/null || echo "N/A") | $CURRENT_TYPECHECK_EXIT | - |

## Regression Detection

EOF

# Check for regressions
REGRESSIONS=0
IMPROVEMENTS=0

if [ "$CURRENT_BUILD_FAILED" -gt "$BASELINE_BUILD_FAILED" ]; then
  echo "⚠️  REGRESSION: Build failures increased from $BASELINE_BUILD_FAILED to $CURRENT_BUILD_FAILED" >> "$TMP_DIR/comparison.md"
  REGRESSIONS=$((REGRESSIONS + 1))
elif [ "$CURRENT_BUILD_FAILED" -lt "$BASELINE_BUILD_FAILED" ]; then
  echo "✅ IMPROVEMENT: Build failures decreased from $BASELINE_BUILD_FAILED to $CURRENT_BUILD_FAILED" >> "$TMP_DIR/comparison.md"
  IMPROVEMENTS=$((IMPROVEMENTS + 1))
fi

if [ "$CURRENT_TEST_FAILED" -gt "$BASELINE_TEST_FAILED" ]; then
  echo "⚠️  REGRESSION: Test failures increased from $BASELINE_TEST_FAILED to $CURRENT_TEST_FAILED" >> "$TMP_DIR/comparison.md"
  REGRESSIONS=$((REGRESSIONS + 1))
elif [ "$CURRENT_TEST_FAILED" -lt "$BASELINE_TEST_FAILED" ]; then
  echo "✅ IMPROVEMENT: Test failures decreased from $BASELINE_TEST_FAILED to $CURRENT_TEST_FAILED" >> "$TMP_DIR/comparison.md"
  IMPROVEMENTS=$((IMPROVEMENTS + 1))
fi

if [ "$CURRENT_TYPECHECK_FAILED" -gt "$BASELINE_TYPECHECK_FAILED" ]; then
  echo "⚠️  REGRESSION: Typecheck failures increased from $BASELINE_TYPECHECK_FAILED to $CURRENT_TYPECHECK_FAILED" >> "$TMP_DIR/comparison.md"
  REGRESSIONS=$((REGRESSIONS + 1))
elif [ "$CURRENT_TYPECHECK_FAILED" -lt "$BASELINE_TYPECHECK_FAILED" ]; then
  echo "✅ IMPROVEMENT: Typecheck failures decreased from $BASELINE_TYPECHECK_FAILED to $CURRENT_TYPECHECK_FAILED" >> "$TMP_DIR/comparison.md"
  IMPROVEMENTS=$((IMPROVEMENTS + 1))
fi

if [ "$REGRESSIONS" -eq 0 ] && [ "$IMPROVEMENTS" -eq 0 ]; then
  echo "✅ No changes detected - status matches baseline" >> "$TMP_DIR/comparison.md"
fi

echo "" >> "$TMP_DIR/comparison.md"
echo "## Detailed Diffs" >> "$TMP_DIR/comparison.md"
echo "" >> "$TMP_DIR/comparison.md"
echo "### Build Results Diff" >> "$TMP_DIR/comparison.md"
echo "\`\`\`" >> "$TMP_DIR/comparison.md"
diff -u "$BASELINE_DIR/build-results.txt" "$TMP_DIR/current-build.txt" >> "$TMP_DIR/comparison.md" 2>&1 || echo "No differences or diff unavailable" >> "$TMP_DIR/comparison.md"
echo "\`\`\`" >> "$TMP_DIR/comparison.md"

# Display summary
cat "$TMP_DIR/comparison.md"

echo ""
echo "📄 Full comparison report saved to: $TMP_DIR/comparison.md"
echo ""

# Exit with error if regressions found
if [ "$REGRESSIONS" -gt 0 ]; then
  echo "❌ $REGRESSIONS regression(s) detected!"
  exit 1
elif [ "$IMPROVEMENTS" -gt 0 ]; then
  echo "✅ $IMPROVEMENTS improvement(s) detected!"
  exit 0
else
  echo "✅ No changes from baseline"
  exit 0
fi

