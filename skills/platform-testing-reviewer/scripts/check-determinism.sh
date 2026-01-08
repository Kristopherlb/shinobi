#!/bin/bash

# Check determinism requirements in test files
# Usage: ./check-determinism.sh <test-file-path>
# Example: ./check-determinism.sh packages/components/my-service/tests/my-service.component.test.ts

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

WARNINGS=0

echo "🔍 Checking determinism requirements: $TEST_FILE"
echo ""

# Check for clock freezing (JS/TS)
if [[ "$TEST_FILE" == *.ts ]] || [[ "$TEST_FILE" == *.tsx ]] || [[ "$TEST_FILE" == *.js ]] || [[ "$TEST_FILE" == *.jsx ]]; then
  if ! grep -qE '(jest\.(useFakeTimers|setSystemTime)|vi\.(useFakeTimers|setSystemTime)|sinon\.(useFakeTimers)|MockDate\.set)' "$TEST_FILE"; then
    echo "⚠️  Warning: No clock freezing detected (use jest.useFakeTimers, vi.useFakeTimers, etc.)"
    WARNINGS=$((WARNINGS + 1))
  fi
  
  # Check for RNG seeding
  if ! grep -qE '(seedrandom|fc\.configure|Math\.random\s*=)' "$TEST_FILE"; then
    echo "⚠️  Warning: No RNG seeding detected (use seedrandom, fc.configure, or Math.random = ...)"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check for clock freezing (Python)
if [[ "$TEST_FILE" == *.py ]]; then
  if ! grep -qE '(freezegun\.freeze_time|@freeze_time|time_machine\.travel)' "$TEST_FILE"; then
    echo "⚠️  Warning: No clock freezing detected (use freezegun.freeze_time, @freeze_time, or time_machine.travel)"
    WARNINGS=$((WARNINGS + 1))
  fi
  
  # Check for RNG seeding
  if ! grep -qE '(\brandom\.seed|\bnp\.random\.seed|hypothesis\.settings)' "$TEST_FILE"; then
    echo "⚠️  Warning: No RNG seeding detected (use random.seed, np.random.seed, or hypothesis.settings)"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# Check for network access (unless explicitly allowed)
if grep -qE '(https?://|\b(fetch|axios|superagent|urllib|requests|get|post)\()' "$TEST_FILE"; then
  # Check if metadata indicates network is allowed
  TEST_DIR=$(dirname "$TEST_FILE")
  TEST_BASE=$(basename "$TEST_FILE" .ts | sed 's/\.test$//' | sed 's/\.spec$//')
  META_FILE="$TEST_DIR/${TEST_BASE}.test.meta.json"
  
  if [ -f "$META_FILE" ] && command -v jq &> /dev/null; then
    FIXTURES=$(jq -r '.fixtures // [] | join(",")' "$META_FILE")
    if [[ ! "$FIXTURES" =~ (net:allow|live_integration) ]]; then
      echo "⚠️  Warning: Network access detected but not explicitly allowed in fixtures"
      echo "   Add 'net:allow' or 'live_integration' to fixtures array if intentional"
      WARNINGS=$((WARNINGS + 1))
    fi
  else
    echo "⚠️  Warning: Network access detected"
    echo "   Ensure metadata includes 'net:allow' or 'live_integration' in fixtures if intentional"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

echo ""
if [ $WARNINGS -eq 0 ]; then
  echo "✅ Determinism checks passed!"
  exit 0
else
  echo "⚠️  Determinism checks found $WARNINGS warning(s)"
  echo ""
  echo "See Platform Testing Standard §6 for determinism requirements:"
  echo "  - docs/platform-standards/platform-testing-standard.md"
  exit 0
fi


