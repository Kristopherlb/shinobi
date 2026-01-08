#!/bin/bash
# Tests a single component using appropriate strategy for environment
# Usage: ./test-component.sh <component-name> [test-args]
# Example: ./test-component.sh openfeature-provider
# Example: ./test-component.sh openfeature-provider --reporter=verbose

set -e

COMPONENT_NAME="$1"
TEST_ARGS="${@:2}"  # All remaining arguments are passed to vitest

if [ -z "$COMPONENT_NAME" ]; then
    echo "Usage: $0 <component-name> [vitest-args...]"
    exit 1
fi

WORKSPACE_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PROJECT_JSON="$WORKSPACE_ROOT/packages/components/$COMPONENT_NAME/project.json"

if [ ! -f "$PROJECT_JSON" ]; then
    echo "Error: project.json not found at $PROJECT_JSON"
    exit 1
fi

# Detect environment
ENV=$(cd "$WORKSPACE_ROOT" && "$(dirname "$0")/detect-environment.sh")

# Extract test configuration from project.json
TEST_EXECUTOR=$(node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$PROJECT_JSON', 'utf8'));
const test = config.targets?.test;
if (!test) {
  console.error('No test target found');
  process.exit(1);
}
console.log(test.executor || '');
")

TEST_CONFIG=$(node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$PROJECT_JSON', 'utf8'));
const test = config.targets?.test;
if (!test) {
  console.error('No test target found');
  process.exit(1);
}
console.log(test.options?.config || '');
")

# Resolve test config path
if [ -n "$TEST_CONFIG" ]; then
    TEST_CONFIG_PATH="$WORKSPACE_ROOT/$TEST_CONFIG"
else
    # Default vitest config location
    TEST_CONFIG_PATH="$WORKSPACE_ROOT/packages/components/$COMPONENT_NAME/vitest.config.ts"
fi

# Execute based on environment
if [ "$ENV" = "sandbox" ]; then
    echo "Testing in sandbox mode: $COMPONENT_NAME"
    if [ ! -f "$TEST_CONFIG_PATH" ]; then
        echo "Warning: Test config not found at $TEST_CONFIG_PATH, using default vitest behavior"
        cd "$WORKSPACE_ROOT" && node_modules/.bin/vitest run packages/components/$COMPONENT_NAME/__tests__ $TEST_ARGS
    else
        cd "$WORKSPACE_ROOT" && node_modules/.bin/vitest run --config "$TEST_CONFIG_PATH" $TEST_ARGS
    fi
else
    echo "Testing with nx: @shinobi/components-$COMPONENT_NAME"
    cd "$WORKSPACE_ROOT" && pnpm nx test "@shinobi/components-$COMPONENT_NAME" $TEST_ARGS
fi

