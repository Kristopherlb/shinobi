#!/bin/bash

# Full Component Refactor Script
# Runs the component refactor script on all components in the platform

set -e  # Exit on any error

echo "🚀 Starting Full Platform Component Refactor"
echo "============================================="

# First, do a dry run to show what will be changed
echo "📋 Step 1: Analyzing all components (dry run)..."
./refactor-all-components.js --dry-run --skip-existing

echo ""
read -p "🤔 Do you want to proceed with the refactor? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Refactor cancelled."
    exit 0
fi

echo ""
echo "🔧 Step 2: Refactoring all components..."
echo "======================================="

# Run the actual refactor
./refactor-all-components.js --skip-existing --verbose

echo ""
echo "✅ Step 3: Refactor completed!"
echo "=============================="

# Show summary of what was created
echo "📊 Summary of refactored components:"
find src/components -name "*.builder.ts" -exec dirname {} \; | sort | while read dir; do
    component=$(basename "$dir")
    echo "  ✓ $component"
done

echo ""
echo "📝 Next Steps:"
echo "=============="
echo "1. Review generated files in each component directory"
echo "2. Update ConfigBuilder interfaces with actual component configuration"
echo "3. Implement actual CDK constructs in component files"
echo "4. Add specific test assertions for CloudFormation resources"
echo "5. Update component registry to include new creators"
echo "6. Run tests: npm test"
echo ""
echo "📚 For detailed guidance, see: COMPONENT_REFACTOR_GUIDE.md"
echo ""
echo "🎉 Platform Component Refactor Complete! 🎉"
