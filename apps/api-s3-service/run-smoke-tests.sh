#!/bin/bash
# Quick smoke test runner script
# Usage: ./run-smoke-tests.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="${SCRIPT_DIR}/tests"

echo "🧪 Running Smoke Tests for api-s3-service"
echo ""

# Check if tests directory exists
if [ ! -d "$TESTS_DIR" ]; then
  echo "❌ Error: tests directory not found at $TESTS_DIR"
  exit 1
fi

# Check if dependencies are installed
if [ ! -d "$TESTS_DIR/node_modules" ]; then
  echo "📦 Installing test dependencies..."
  cd "$TESTS_DIR"
  pnpm install
  cd "$SCRIPT_DIR"
fi

# Run tests
cd "$TESTS_DIR"
pnpm test

