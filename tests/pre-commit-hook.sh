#!/bin/bash
# pre-commit hook - Run tests before committing
# Install: cp tests/pre-commit-hook.sh .git/hooks/pre-commit

echo "Running pre-commit tests..."

# Run tests
npm test

if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Commit aborted."
    echo "Fix the failing tests or use 'git commit --no-verify' to skip."
    exit 1
fi

echo "✅ Tests passed. Proceeding with commit."
exit 0
