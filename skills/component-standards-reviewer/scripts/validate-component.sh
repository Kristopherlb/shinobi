#!/bin/bash

# Validate component structure against Component Standards Baseline
# Usage: ./validate-component.sh <component-path>
# Example: ./validate-component.sh packages/components/my-service

set -e

COMPONENT_PATH="${1:-}"

if [ -z "$COMPONENT_PATH" ]; then
  echo "Error: Component path is required"
  echo "Usage: $0 <component-path>"
  echo "Example: $0 packages/components/my-service"
  exit 1
fi

if [ ! -d "$COMPONENT_PATH" ]; then
  echo "Error: Component path does not exist: $COMPONENT_PATH"
  exit 1
fi

ERRORS=0
WARNINGS=0

echo "🔍 Validating component structure: $COMPONENT_PATH"
echo ""

# Check for BaseComponent inheritance
if ! grep -r "extends BaseComponent" "$COMPONENT_PATH/src"/*.ts > /dev/null 2>&1; then
  echo "❌ Error: Component does not extend BaseComponent"
  ERRORS=$((ERRORS + 1))
fi

# Check for ConfigBuilder pattern
if ! find "$COMPONENT_PATH/src" -name "*builder.ts" -o -name "*.builder.ts" | grep -q .; then
  echo "⚠️  Warning: No ConfigBuilder file found (*builder.ts or *.builder.ts)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check for compliance framework checks in component code
if grep -r "this\.context\.complianceFramework" "$COMPONENT_PATH/src" --include="*.ts" | grep -v "builder.ts" | grep -v "\.test\."; then
  echo "❌ Error: Compliance framework checks found in component code (should be in ConfigBuilder only)"
  echo "   Found in:"
  grep -rn "this\.context\.complianceFramework" "$COMPONENT_PATH/src" --include="*.ts" | grep -v "builder.ts" | grep -v "\.test\." | sed 's/^/     /'
  ERRORS=$((ERRORS + 1))
fi

# Check for console.log usage
if grep -r "console\.\(log\|error\|warn\|info\)" "$COMPONENT_PATH/src" --include="*.ts" | grep -v "\.test\."; then
  echo "❌ Error: console.log/error/warn/info found (use structured logging instead)"
  echo "   Found in:"
  grep -rn "console\.\(log\|error\|warn\|info\)" "$COMPONENT_PATH/src" --include="*.ts" | grep -v "\.test\." | sed 's/^/     /'
  ERRORS=$((ERRORS + 1))
fi

# Check for Creator pattern
if ! find "$COMPONENT_PATH/src" -name "*creator.ts" -o -name "*.creator.ts" | grep -q .; then
  echo "⚠️  Warning: No Creator file found (*creator.ts or *.creator.ts)"
  WARNINGS=$((WARNINGS + 1))
fi

# Check for Config.schema.json
if [ ! -f "$COMPONENT_PATH/Config.schema.json" ]; then
  echo "⚠️  Warning: Config.schema.json not found at component root"
  WARNINGS=$((WARNINGS + 1))
fi

# Check for tests directory
if [ ! -d "$COMPONENT_PATH/tests" ]; then
  echo "⚠️  Warning: tests/ directory not found"
  WARNINGS=$((WARNINGS + 1))
fi

# Check for CDK-Nag tests
if ! find "$COMPONENT_PATH/tests" -name "*cdk-nag*.ts" -o -name "*cdk-nag*.test.ts" 2>/dev/null | grep -q .; then
  echo "⚠️  Warning: No CDK-Nag security tests found"
  WARNINGS=$((WARNINGS + 1))
fi

echo ""
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo "✅ Component validation passed!"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo "⚠️  Component validation passed with $WARNINGS warning(s)"
  exit 0
else
  echo "❌ Component validation failed with $ERRORS error(s) and $WARNINGS warning(s)"
  echo ""
  echo "See Component Standards Baseline for remediation guidance:"
  echo "  - .cursor/rules/component-standards.mdc"
  echo "  - skills/component-standards-reviewer/references/ANTI_PATTERNS.md"
  exit 1
fi

