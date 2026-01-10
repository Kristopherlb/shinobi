#!/bin/bash
# Builds a single component using appropriate strategy for environment
# Usage: ./build-component.sh <component-name>
# Example: ./build-component.sh sqs-queue

set -e

COMPONENT_NAME="$1"
if [ -z "$COMPONENT_NAME" ]; then
    echo "Usage: $0 <component-name>"
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

# Extract build command from project.json
BUILD_COMMAND=$(node -e "
const fs = require('fs');
const config = JSON.parse(fs.readFileSync('$PROJECT_JSON', 'utf8'));
const build = config.targets?.build;
if (!build || build.executor !== 'nx:run-commands') {
  console.error('No nx:run-commands build target found');
  process.exit(1);
}
console.log(build.options.command);
")
CWD=$(node -e "
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync('$PROJECT_JSON', 'utf8'));
const build = config.targets?.build;
const cwd = build?.options?.cwd || '{workspaceRoot}';
console.log(cwd.replace('{workspaceRoot}', '$WORKSPACE_ROOT'));
")

# Execute based on environment
if [ "$ENV" = "sandbox" ]; then
    echo "Building in sandbox mode: $COMPONENT_NAME"
    cd "$CWD" && $BUILD_COMMAND
else
    echo "Building with nx: @shinobi/components-$COMPONENT_NAME"
    cd "$WORKSPACE_ROOT" && pnpm nx build "@shinobi/components-$COMPONENT_NAME" --skip-nx-cache
fi

