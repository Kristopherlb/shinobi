#!/bin/bash
# Script to copy binder system files for sharing

SHARE_DIR="binder-system-share"
mkdir -p "$SHARE_DIR"

# Core files
cp packages/core/src/platform/binders/strategies/binder-strategy.ts "$SHARE_DIR/"
cp packages/core/src/platform/binders/types.ts "$SHARE_DIR/"
cp packages/core/src/platform/binders/registry/comprehensive-binder-registry.ts "$SHARE_DIR/"

# Example implementation
mkdir -p "$SHARE_DIR/strategies/storage"
cp packages/core/src/platform/binders/strategies/storage/efs-binder-strategy.ts "$SHARE_DIR/strategies/storage/"

# Example test
mkdir -p "$SHARE_DIR/strategies/storage/__tests__"
cp packages/core/src/platform/binders/strategies/storage/__tests__/efs-binder-strategy.test.ts "$SHARE_DIR/strategies/storage/__tests__/"

echo "✅ Files copied to $SHARE_DIR/"
echo ""
echo "Files included:"
echo "  - binder-strategy.ts (core interface)"
echo "  - types.ts (type definitions)"
echo "  - comprehensive-binder-registry.ts (registry)"
echo "  - strategies/storage/efs-binder-strategy.ts (example implementation)"
echo "  - strategies/storage/__tests__/efs-binder-strategy.test.ts (example test)"
