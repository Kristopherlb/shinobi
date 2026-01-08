#!/bin/bash

# Validate test metadata sidecars against Platform Testing Standard
# Usage: ./validate-test-metadata.sh <test-file-path>
# Example: ./validate-test-metadata.sh packages/components/my-service/tests/my-service.component.test.ts

set -e

TEST_FILE="${1:-}"

if [ -z "$TEST_FILE" ]; then
  echo "Error: Test file path is required"
  echo "Usage: $0 <test-file-path>"
  echo "Example: $0 packages/components/my-service/tests/my-service.component.test.ts"
  exit 1
fi

if [ ! -f "$TEST_FILE" ]; then
  echo "Error: Test file does not exist: $TEST_FILE"
  exit 1
fi

# Find metadata sidecar
TEST_DIR=$(dirname "$TEST_FILE")
TEST_BASE=$(basename "$TEST_FILE" .ts | sed 's/\.test$//' | sed 's/\.spec$//')
META_FILES=(
  "$TEST_DIR/${TEST_BASE}.test.meta.json"
  "$TEST_DIR/${TEST_BASE}.spec.meta.json"
  "$TEST_DIR/${TEST_BASE}.test.meta.yaml"
  "$TEST_DIR/${TEST_BASE}.spec.meta.yaml"
  "$TEST_DIR/${TEST_BASE}.test.meta.yml"
  "$TEST_DIR/${TEST_BASE}.spec.meta.yml"
)

META_FILE=""
for file in "${META_FILES[@]}"; do
  if [ -f "$file" ]; then
    META_FILE="$file"
    break
  fi
done

if [ -z "$META_FILE" ]; then
  echo "❌ Error: No metadata sidecar found for $TEST_FILE"
  echo "   Expected one of:"
  for file in "${META_FILES[@]}"; do
    echo "     - $file"
  done
  exit 1
fi

echo "🔍 Validating metadata: $META_FILE"
echo ""

# Function to validate a single test's metadata
# This function uses global variables: ID, LEVEL, ORACLE, AI_GENERATED, HUMAN_REVIEWED, MASK_RULES, EVIDENCE_COUNT
# It also uses: META_FILE, TEST_FILE, HAS_TESTS_ARRAY, i (test index)
validate_single_test_metadata() {
  local TEST_ERRORS=0
  local TEST_WARNINGS=0
  local TEST_FAILED_CHECKS=0
  local TEST_PASSED_CHECKS=0
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Platform Testing Standard - Checklist of Truth"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  
  # ──────────────────────────────────────────────────────────────────────────────
  # Step 1: Sidecar Check (already done above, but report it)
  # ──────────────────────────────────────────────────────────────────────────────
  echo "Step 1: Sidecar"
  echo "  Check: Is there a .meta.json sidecar?"
  if [ -n "$META_FILE" ]; then
    echo "  ✅ PASS: Metadata sidecar found: $META_FILE"
    TEST_PASSED_CHECKS=$((TEST_PASSED_CHECKS + 1))
  else
    echo "  ❌ FAIL: No metadata sidecar found"
    TEST_FAILED_CHECKS=$((TEST_FAILED_CHECKS + 1))
    TEST_ERRORS=$((TEST_ERRORS + 1))
  fi
  echo ""
  
  # ──────────────────────────────────────────────────────────────────────────────
  # Step 2: Naming Convention Check
  # ──────────────────────────────────────────────────────────────────────────────
  echo "Step 2: Naming"
  echo "  Check: Does test file use Feature__Condition__ExpectedOutcome format?"
  
  # Extract test names from the test file
  if grep -qE "(it|test|describe)\(['\"]([A-Za-z0-9]+__[^'\"']+__[^'\"']+)['\"]" "$TEST_FILE" 2>/dev/null; then
    echo "  ✅ PASS: Test names use __ separators"
    TEST_PASSED_CHECKS=$((TEST_PASSED_CHECKS + 1))
  else
    # Check for common anti-patterns
    if grep -qE "(it|test)\(['\"]works['\"]|(it|test)\(['\"]test['\"]" "$TEST_FILE" 2>/dev/null; then
      echo "  ❌ FAIL: Test uses generic name like 'works' or 'test'"
      echo "     Expected format: Feature__Condition__ExpectedOutcome"
      TEST_FAILED_CHECKS=$((TEST_FAILED_CHECKS + 1))
      TEST_ERRORS=$((TEST_ERRORS + 1))
    else
      echo "  ⚠️  WARN: Could not verify naming convention (may need manual review)"
      TEST_WARNINGS=$((TEST_WARNINGS + 1))
    fi
  fi
  echo ""
  
  # ──────────────────────────────────────────────────────────────────────────────
  # Step 3: Oracle Check
  # ──────────────────────────────────────────────────────────────────────────────
  echo "Step 3: Oracle"
  echo "  Check: Is it using a single primary oracle?"
  
  # Validate oracle value first
  if [[ ! "$ORACLE" =~ ^(exact|snapshot|property|contract|metamorphic|trace)$ ]]; then
    echo "  ❌ FAIL: Invalid oracle value: \"$ORACLE\""
    echo "     Must be one of: exact, snapshot, property, contract, metamorphic, trace"
    TEST_FAILED_CHECKS=$((TEST_FAILED_CHECKS + 1))
    TEST_ERRORS=$((TEST_ERRORS + 1))
  else
    echo "  ✅ PASS: Valid oracle type: $ORACLE"
    TEST_PASSED_CHECKS=$((TEST_PASSED_CHECKS + 1))
    
    # Check for mixing oracles (heuristic)
    if grep -qE "toMatchSnapshot" "$TEST_FILE" 2>/dev/null && grep -qE "(fc|fast-check|hypothesis)" "$TEST_FILE" 2>/dev/null; then
      echo "  ⚠️  WARN: Potential oracle mixing detected (snapshot + property-based)"
      echo "     Keep one primary oracle per test case"
      TEST_WARNINGS=$((TEST_WARNINGS + 1))
    elif grep -qE "toMatchSnapshot" "$TEST_FILE" 2>/dev/null && grep -qE "(ajv|zod|yup)\.(validate|safeParse)" "$TEST_FILE" 2>/dev/null; then
      echo "  ⚠️  WARN: Potential oracle mixing detected (snapshot + contract)"
      echo "     Keep one primary oracle per test case"
      TEST_WARNINGS=$((TEST_WARNINGS + 1))
    fi
  fi
  echo ""
  
  # ──────────────────────────────────────────────────────────────────────────────
  # Step 4: Masking Check
  # ──────────────────────────────────────────────────────────────────────────────
  echo "Step 4: Masking"
  echo "  Check: Are volatile fields masked in snapshots?"
  
  if [ "$ORACLE" = "snapshot" ]; then
    if [ "$MASK_RULES" -eq 0 ]; then
      echo "  ❌ FAIL: Snapshot tests MUST declare mask_rules"
      echo "     oracle=\"snapshot\" requires mask_rules array"
      TEST_FAILED_CHECKS=$((TEST_FAILED_CHECKS + 1))
      TEST_ERRORS=$((TEST_ERRORS + 1))
    else
      # Extract mask rules for display
      if command -v jq &> /dev/null; then
        local MASK_LIST
        if [ "$HAS_TESTS_ARRAY" = "true" ] && [ -n "${i:-}" ]; then
          MASK_LIST=$(jq -r ".tests[$i].mask_rules // [] | join(\", \")" "$META_FILE")
        else
          MASK_LIST=$(jq -r '.mask_rules // [] | join(", ")' "$META_FILE")
        fi
        echo "  ✅ PASS: mask_rules declared: [$MASK_LIST]"
        TEST_PASSED_CHECKS=$((TEST_PASSED_CHECKS + 1))
        
        # Check for common volatile fields in test file
        if grep -qE "(timestamp|uuid|arn|hash|requestId|traceId)" "$TEST_FILE" 2>/dev/null; then
          echo "     ⚠️  Note: Test contains volatile fields - ensure masks are applied"
        fi
      else
        echo "  ✅ PASS: mask_rules declared ($MASK_RULES rules)"
        TEST_PASSED_CHECKS=$((TEST_PASSED_CHECKS + 1))
      fi
    fi
  else
    echo "  ⏭️  SKIP: Not a snapshot test (oracle=$ORACLE)"
  fi
  echo ""
  
  # ──────────────────────────────────────────────────────────────────────────────
  # Step 5: Evidence Check (Integration/E2E only)
  # ──────────────────────────────────────────────────────────────────────────────
  echo "Step 5: Evidence"
  echo "  Check: Are evidence URIs present? (Integration/E2E only)"
  
  if [ "$LEVEL" = "integration" ] || [ "$LEVEL" = "e2e" ]; then
    if [ "$EVIDENCE_COUNT" -eq 0 ]; then
      echo "  ❌ FAIL: Integration/E2E tests must include evidence URIs"
      echo "     level=\"$LEVEL\" requires non-empty evidence array"
      TEST_FAILED_CHECKS=$((TEST_FAILED_CHECKS + 1))
      TEST_ERRORS=$((TEST_ERRORS + 1))
    else
      if command -v jq &> /dev/null; then
        local EVIDENCE_LIST
        if [ "$HAS_TESTS_ARRAY" = "true" ] && [ -n "${i:-}" ]; then
          EVIDENCE_LIST=$(jq -r ".tests[$i].evidence // [] | join(\", \")" "$META_FILE")
        else
          EVIDENCE_LIST=$(jq -r '.evidence // [] | join(", ")' "$META_FILE")
        fi
        echo "  ✅ PASS: Evidence URIs present: [$EVIDENCE_LIST]"
      else
        echo "  ✅ PASS: Evidence URIs present ($EVIDENCE_COUNT URIs)"
      fi
      TEST_PASSED_CHECKS=$((TEST_PASSED_CHECKS + 1))
    fi
  else
    echo "  ⏭️  SKIP: Not integration/E2E test (level=$LEVEL)"
  fi
  echo ""
  
  # ──────────────────────────────────────────────────────────────────────────────
  # Additional Validations
  # ──────────────────────────────────────────────────────────────────────────────
  echo "Additional Validations:"
  echo ""
  
  # Validate ID format (TP-<service>-<feature>-NNN)
  if [[ ! "$ID" =~ ^TP-[a-z0-9-]+-[a-z0-9-]+-[0-9]{3}$ ]]; then
    echo "  ❌ FAIL: ID must follow TP-<service>-<feature>-NNN format"
    echo "     Got: \"$ID\""
    echo "     Expected: TP-<service>-<feature>-NNN (zero-padded 3 digits)"
    TEST_FAILED_CHECKS=$((TEST_FAILED_CHECKS + 1))
    TEST_ERRORS=$((TEST_ERRORS + 1))
  else
    echo "  ✅ PASS: ID format valid: $ID"
    TEST_PASSED_CHECKS=$((TEST_PASSED_CHECKS + 1))
  fi
  
  # Validate level
  if [[ ! "$LEVEL" =~ ^(unit|integration|e2e)$ ]]; then
    echo "  ❌ FAIL: level must be 'unit', 'integration', or 'e2e'"
    echo "     Got: \"$LEVEL\""
    TEST_FAILED_CHECKS=$((TEST_FAILED_CHECKS + 1))
    TEST_ERRORS=$((TEST_ERRORS + 1))
  else
    echo "  ✅ PASS: level valid: $LEVEL"
    TEST_PASSED_CHECKS=$((TEST_PASSED_CHECKS + 1))
  fi
  
  # Check AI-generated requires human reviewer
  if [ "$AI_GENERATED" = "true" ] && [ -z "$HUMAN_REVIEWED" ]; then
    echo "  ❌ FAIL: AI-generated tests require human_reviewed_by"
    echo "     ai_generated=true requires non-empty human_reviewed_by"
    TEST_FAILED_CHECKS=$((TEST_FAILED_CHECKS + 1))
    TEST_ERRORS=$((TEST_ERRORS + 1))
  elif [ "$AI_GENERATED" = "true" ] && [ -n "$HUMAN_REVIEWED" ]; then
    echo "  ✅ PASS: AI-generated test has human reviewer: $HUMAN_REVIEWED"
    TEST_PASSED_CHECKS=$((TEST_PASSED_CHECKS + 1))
  fi
  echo ""
  
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Summary"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "  Checks Passed:  $TEST_PASSED_CHECKS"
  echo "  Checks Failed:  $TEST_FAILED_CHECKS"
  echo "  Warnings:        $TEST_WARNINGS"
  echo ""
  
  # Update global counters
  ERRORS=$((ERRORS + TEST_ERRORS))
  WARNINGS=$((WARNINGS + TEST_WARNINGS))
  FAILED_CHECKS=$((FAILED_CHECKS + TEST_FAILED_CHECKS))
  PASSED_CHECKS=$((PASSED_CHECKS + TEST_PASSED_CHECKS))
  
  if [ $TEST_ERRORS -eq 0 ] && [ $TEST_WARNINGS -eq 0 ]; then
    echo "✅ ✅ ✅  ALL CHECKS PASSED  ✅ ✅ ✅"
    echo ""
    echo "Test is compliant with Platform Testing Standard (PTS-1.0)"
  elif [ $TEST_ERRORS -eq 0 ]; then
    echo "⚠️  Validation passed with $TEST_WARNINGS warning(s)"
    echo ""
    echo "Test is compliant but has warnings. Review and address as needed."
  else
    echo "❌ ❌ ❌  VALIDATION FAILED  ❌ ❌ ❌"
    echo ""
    echo "Test failed $TEST_FAILED_CHECKS check(s) with $TEST_ERRORS error(s) and $TEST_WARNINGS warning(s)"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Remediation Guidance"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "See Platform Testing Standard for detailed requirements:"
    echo "  📄 docs/platform-standards/platform-testing-standard.md"
    echo ""
    echo "Reference documentation:"
    echo "  📋 skills/platform-testing-reviewer/references/METADATA_SCHEMA.md"
    echo "  📋 skills/platform-testing-reviewer/references/ORACLE_GUIDE.md"
    echo "  📋 skills/platform-testing-reviewer/references/MASKING_RULES.md"
    echo ""
  fi
}

# Initialize global counters
ERRORS=0
WARNINGS=0
FAILED_CHECKS=0
PASSED_CHECKS=0

# Check if it's JSON or YAML
if [[ "$META_FILE" == *.json ]]; then
  # Validate JSON syntax
  if ! python3 -m json.tool "$META_FILE" > /dev/null 2>&1; then
    echo "❌ Error: Invalid JSON syntax in $META_FILE"
    exit 1
  fi
  
  # Check if metadata uses tests array format or root-level format
  if command -v jq &> /dev/null; then
    HAS_TESTS_ARRAY=$(jq -e '.tests | type == "array"' "$META_FILE" 2>/dev/null || echo "false")
  else
    HAS_TESTS_ARRAY=$(python3 -c "import json; data=json.load(open('$META_FILE')); print('true' if isinstance(data.get('tests'), list) else 'false')" 2>/dev/null || echo "false")
  fi
  
  if [ "$HAS_TESTS_ARRAY" = "true" ]; then
    # Extract test count for iteration
    if command -v jq &> /dev/null; then
      TEST_COUNT=$(jq -r '.tests | length' "$META_FILE")
    else
      TEST_COUNT=$(python3 -c "import json; print(len(json.load(open('$META_FILE')).get('tests', [])))" 2>/dev/null || echo "0")
    fi
    
    echo "📋 Found $TEST_COUNT test(s) in metadata array format"
    echo ""
    
    # Validate each test in the array
    for i in $(seq 0 $((TEST_COUNT - 1))); do
      if [ $TEST_COUNT -gt 1 ]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "  Test $((i + 1))/$TEST_COUNT"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
      fi
      
      # Extract values for this test
      if command -v jq &> /dev/null; then
        ID=$(jq -r ".tests[$i].id // empty" "$META_FILE")
        LEVEL=$(jq -r ".tests[$i].level // empty" "$META_FILE")
        ORACLE=$(jq -r ".tests[$i].oracle // empty" "$META_FILE")
        AI_GENERATED=$(jq -r ".tests[$i].ai_generated // false" "$META_FILE")
        HUMAN_REVIEWED=$(jq -r ".tests[$i].human_reviewed_by // empty" "$META_FILE")
        MASK_RULES=$(jq -r ".tests[$i].mask_rules // [] | length" "$META_FILE")
        EVIDENCE_COUNT=$(jq -r ".tests[$i].evidence // [] | length" "$META_FILE")
      else
        ID=$(python3 -c "import json; data=json.load(open('$META_FILE')); print(data.get('tests', [{}])[$i].get('id', ''))" 2>/dev/null || echo "")
        LEVEL=$(python3 -c "import json; data=json.load(open('$META_FILE')); print(data.get('tests', [{}])[$i].get('level', ''))" 2>/dev/null || echo "")
        ORACLE=$(python3 -c "import json; data=json.load(open('$META_FILE')); print(data.get('tests', [{}])[$i].get('oracle', ''))" 2>/dev/null || echo "")
        AI_GENERATED=$(python3 -c "import json; data=json.load(open('$META_FILE')); print(data.get('tests', [{}])[$i].get('ai_generated', False))" 2>/dev/null || echo "false")
        HUMAN_REVIEWED=$(python3 -c "import json; data=json.load(open('$META_FILE')); print(data.get('tests', [{}])[$i].get('human_reviewed_by', ''))" 2>/dev/null || echo "")
        MASK_RULES=$(python3 -c "import json; data=json.load(open('$META_FILE')); print(len(data.get('tests', [{}])[$i].get('mask_rules', [])))" 2>/dev/null || echo "0")
        EVIDENCE_COUNT=$(python3 -c "import json; data=json.load(open('$META_FILE')); print(len(data.get('tests', [{}])[$i].get('evidence', [])))" 2>/dev/null || echo "0")
      fi
      
      # Run validation for this test
      validate_single_test_metadata
      
      if [ $i -lt $((TEST_COUNT - 1)) ]; then
        echo ""
      fi
    done
  else
    # Root-level format (backward compatibility)
    if command -v jq &> /dev/null; then
      ID=$(jq -r '.id // empty' "$META_FILE")
      LEVEL=$(jq -r '.level // empty' "$META_FILE")
      ORACLE=$(jq -r '.oracle // empty' "$META_FILE")
      AI_GENERATED=$(jq -r '.ai_generated // false' "$META_FILE")
      HUMAN_REVIEWED=$(jq -r '.human_reviewed_by // empty' "$META_FILE")
      MASK_RULES=$(jq -r '.mask_rules // [] | length' "$META_FILE")
      EVIDENCE_COUNT=$(jq -r '.evidence // [] | length' "$META_FILE")
    else
      ID=$(python3 -c "import json; print(json.load(open('$META_FILE')).get('id', ''))" 2>/dev/null || echo "")
      LEVEL=$(python3 -c "import json; print(json.load(open('$META_FILE')).get('level', ''))" 2>/dev/null || echo "")
      ORACLE=$(python3 -c "import json; print(json.load(open('$META_FILE')).get('oracle', ''))" 2>/dev/null || echo "")
      AI_GENERATED=$(python3 -c "import json; print(json.load(open('$META_FILE')).get('ai_generated', False))" 2>/dev/null || echo "false")
      HUMAN_REVIEWED=$(python3 -c "import json; print(json.load(open('$META_FILE')).get('human_reviewed_by', ''))" 2>/dev/null || echo "")
      MASK_RULES=$(python3 -c "import json; print(len(json.load(open('$META_FILE')).get('mask_rules', [])))" 2>/dev/null || echo "0")
      EVIDENCE_COUNT=$(python3 -c "import json; print(len(json.load(open('$META_FILE')).get('evidence', [])))" 2>/dev/null || echo "0")
    fi
    
    validate_single_test_metadata
  fi
else
  # YAML - would need yq or python yaml parser
  echo "⚠️  Warning: YAML metadata validation requires yq or python yaml (skipping detailed checks)"
  exit 0
fi

# Final exit status
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo ""
  echo "✅ ✅ ✅  ALL TESTS PASSED  ✅ ✅ ✅"
  echo ""
  echo "All tests are compliant with Platform Testing Standard (PTS-1.0)"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo ""
  echo "⚠️  Validation passed with $WARNINGS warning(s)"
  echo ""
  echo "All tests are compliant but have warnings. Review and address as needed."
  exit 0
else
  echo ""
  echo "❌ ❌ ❌  VALIDATION FAILED  ❌ ❌ ❌"
  echo ""
  echo "Validation failed with $ERRORS error(s) and $WARNINGS warning(s)"
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Remediation Guidance"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "See Platform Testing Standard for detailed requirements:"
  echo "  📄 docs/platform-standards/platform-testing-standard.md"
  echo ""
  echo "Reference documentation:"
  echo "  📋 skills/platform-testing-reviewer/references/METADATA_SCHEMA.md"
  echo "  📋 skills/platform-testing-reviewer/references/ORACLE_GUIDE.md"
  echo "  📋 skills/platform-testing-reviewer/references/MASKING_RULES.md"
  echo ""
  exit 1
fi
