# Testing Infrastructure

This directory contains the test suite for Word Racing, designed to ensure safe refactoring and prevent regressions.

## Prerequisites

1. **Node.js** (v18 or higher) - Download from https://nodejs.org/
2. **npm** (comes with Node.js)

Verify installation:
```bash
node --version
npm --version
```

## Quick Start

```bash
# Navigate to project root
cd D:\CC\vibe-coding\word-racing

# Install dependencies (first time only)
npm install

# Run all tests
npm test

# Run specific test file
npx vitest run tests/car.test.js

# Run tests in watch mode (during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Files

| File | Module | Tests | Focus |
|------|--------|-------|-------|
| `car.test.js` | `js/car.js` | 25+ | Physics, upgrades, nitro, lap tracking |
| `track.test.js` | `js/track.js` | 15+ | Geometry, collision, progress |
| `quiz.test.js` | `js/quiz.js` | 30+ | Modes, scoring, wrong words, combo |
| `game.test.js` | `js/game.js` | 25+ | State machine, economy, shop |

## Test Setup

`setup.js` mocks browser globals for Node.js testing:
- `localStorage` - Mock storage
- `canvas.getContext()` - Mock Canvas 2D context
- `fetch()` - Mock API calls
- `window`, `document` - Mock DOM

## Workflow for Safe Refactoring

### Before Each Change
```bash
npm test
```
Ensure all tests pass.

### After Each Change
```bash
npm test
```
Verify no regressions.

### Commit Hook (Optional)
Automatically run tests before each commit:
```bash
# Linux/Mac
cp tests/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Windows (Git Bash)
cp tests/pre-commit-hook.sh .git/hooks/pre-commit
```

## Writing New Tests

### Test Structure
```javascript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Feature Name', () => {
  let instance;

  beforeEach(() => {
    // Setup before each test
    instance = new MyClass();
  });

  it('should do something', () => {
    // Arrange
    const input = 42;

    // Act
    const result = instance.method(input);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Common Assertions
```javascript
expect(value).toBe(expected);           // Exact equality
expect(value).toEqual(expected);        // Deep equality
expect(value).toBeGreaterThan(n);       // Comparison
expect(value).toContain(item);          // Array/string contains
expect(fn).toThrow();                   // Exception thrown
expect(array).toHaveLength(n);          // Array length
```

## Coverage Report

After running `npm run test:coverage`, open:
```
coverage/index.html
```

This shows line-by-line coverage for each file.

## Troubleshooting

### "Cannot find module"
Run `npm install` first.

### "window is not defined"
The `setup.js` file should handle this. Ensure `vitest.config.js` includes:
```javascript
setupFiles: ['./tests/setup.js']
```

### Tests pass but game doesn't work
Unit tests verify logic, not browser integration. Always test in browser after changes.

## Adding Tests for New Features

When adding a new feature:

1. **Write tests first** (TDD approach)
2. Run tests (should fail)
3. Implement feature
4. Run tests (should pass)
5. Refactor if needed
6. Run tests again

This ensures every feature has test coverage from day one.
