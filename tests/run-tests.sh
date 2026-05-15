#!/bin/bash
# test-runner.sh - Run tests before and after each change
# Usage: ./tests/run-tests.sh [file]

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  Word Racing Test Runner"
echo "═══════════════════════════════════════════════════════════"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run tests
echo ""
echo "🧪 Running tests..."
echo ""

if [ -n "$1" ]; then
    # Run specific test file
    npx vitest run "$1" --reporter=verbose
else
    # Run all tests
    npx vitest run --reporter=verbose
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
if [ $? -eq 0 ]; then
    echo "✅ All tests passed! Safe to proceed."
else
    echo "❌ Tests failed! Fix issues before committing."
fi
echo "═══════════════════════════════════════════════════════════"
