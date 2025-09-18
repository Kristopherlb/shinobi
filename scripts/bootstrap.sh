#!/bin/bash

# Shinobi Platform Bootstrap Script
# This script sets up the development environment for the Shinobi Platform

set -e

echo "🥷🏻 Shinobi Platform Bootstrap Script"
echo "======================================"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if Node.js version is compatible
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo "❌ Node.js version 20 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ pnpm version: $(pnpm -v)"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
pnpm install

# Generate project configurations for components
echo ""
echo "⚙️  Generating project configurations..."
if [ -f "tools/scripts/generate-project-configs.mjs" ]; then
    node tools/scripts/generate-project-configs.mjs
else
    echo "⚠️  Project config generator not found, skipping..."
fi

# Build all packages
echo ""
echo "🔨 Building all packages..."
pnpm build

# Run type checking
echo ""
echo "🔍 Running type checking..."
pnpm type-check

# Run tests
echo ""
echo "🧪 Running tests..."
pnpm test

echo ""
echo "✅ Bootstrap completed successfully!"
echo ""
echo "🚀 Available commands:"
echo "   pnpm build          - Build all packages"
echo "   pnpm test           - Run all tests"
echo "   pnpm lint           - Lint all packages"
echo "   pnpm type-check     - Type check all packages"
echo "   pnpm affected:build - Build affected packages only"
echo "   pnpm graph          - Show dependency graph"
echo "   pnpm svc            - Start the CLI service"
echo ""
echo "📚 For more information, see CONTRIBUTING.md"
