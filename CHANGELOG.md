# Changelog

All notable changes to Word Racing will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed - Phase 1.1 & 1.2 Complete
- **Config Extraction**: Created `config/game-config.js` with all game constants
  - PHYSICS: car movement, friction, nitro, upgrades
  - ECONOMY: fuel, coins, shop items, rewards
  - TRACK: waypoints, width, samples
  - DISPLAY: canvas, minimap, countdown, particles
  - QUIZ: question settings, distractor scoring
  - GAME: state names, limits, boundaries
  - CAR: visual properties

- **Module System**: Converted all JS files to ES6 modules
  - `js/main.js`: Single entry point, replaces inline script
  - All classes now use `export` instead of `window.*`
  - `index.html` loads only `main.js` with `type="module"`

- Files converted:
  - `js/track.js` → imports TRACK, DISPLAY config
  - `js/car.js` → imports PHYSICS, UPGRADES, DISPLAY, GAME, CAR config
  - `js/question-factory.js` → exports DistractorEngine, QuestionFactory
  - `js/quiz.js` → imports QuestionFactory, QUIZ config
  - `js/game.js` → imports Track, Car, Quiz, ECONOMY, DISPLAY, GAME, UPGRADES config
  - `js/nav.js` → imports GAME config

### Changed - Refactoring Branch
- Created `feature/refactor` branch for Phase 1 refactoring
- Main branch contains testing infrastructure as safety net

### Added - Refactoring Infrastructure
- **REFACTORING-PLAN.md** - Complete 5-phase refactoring roadmap with code samples
- **Memory system** - Saved refactoring status for session continuity

### Added - Testing Infrastructure
- **package.json** - Node.js project configuration with Vitest test runner
- **vitest.config.js** - Test runner configuration with jsdom environment
- **tests/setup.js** - Mock browser globals (localStorage, canvas, fetch)
- **tests/car.test.js** - 25+ tests for car physics, upgrades, nitro system
- **tests/track.test.js** - 15+ tests for track geometry and collision detection
- **tests/quiz.test.js** - 30+ tests for quiz generation, modes, scoring
- **tests/game.test.js** - 25+ tests for game state machine, economy, shop
- **tests/run-tests.sh** - Linux/Mac test runner script
- **tests/run-tests.bat** - Windows test runner script
- **tests/pre-commit-hook.sh** - Git pre-commit hook template

### Test Coverage Summary

| Module | Tests | Coverage Focus |
|--------|-------|----------------|
| Car | 25+ | Physics, upgrades, nitro, lap tracking |
| Track | 15+ | Geometry, collision, progress |
| Quiz | 30+ | Modes, scoring, wrong words, combo |
| Game | 25+ | State machine, economy, shop, leaderboard |

### Testing Workflow

```bash
# Install dependencies (first time)
npm install

# Run all tests
npm test

# Run specific test file
npx vitest run tests/car.test.js

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Pre-Commit Hook Installation

```bash
# Linux/Mac
cp tests/pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Windows (Git Bash)
cp tests/pre-commit-hook.sh .git/hooks/pre-commit
```

## [2.0.0] - 2024-05-12

### Added
- Dual currency system (Fuel Coins + Gear Coins)
- 5 question modes: PIT_BOARD, RADIO_MSG, STRATEGY, QUALIFYING, LAP_REVIEW
- Adaptive wrong word review system
- Upgrade system (Engine, Tire, Body)
- Leaderboard with best lap times

## [1.0.0] - Initial Release

### Added
- Basic quiz system with word-to-meaning questions
- F1 car racing gameplay
- Fuel and nitro systems
- Shop for purchasing upgrades
