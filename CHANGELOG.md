# Changelog

All notable changes to Word Racing will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Epic 4: Reset Features
- **Reset All Data**: Clear all user data (coins, achievements, tracks, word progress)
- **Reset Daily**: Clear today's practice limit (keeps word progress)
- **Reset This Week**: Clear last 7 days of practice history
- **Debug Commands**: Console commands for unlocking tracks, adding coins, etc.
- **Settings Dropdown**: Added reset options to home page settings menu

### Added - Phase 1 MVP: Quiz Improvement
- **"I Don't Know" Button**: Added button for words the user doesn't recognize
  - Shows learning panel with word, phonetic, meaning, and example sentence
  - Word is added to wrong words for later review
- **Wrong Answer Learning**: After wrong answer, shows learning panel
  - Must click "Got it, continue" to proceed
  - Wrong word is added to end of quiz for re-testing
- **Retry Mechanism**: Wrong words appear again in same quiz session
  - Marked with "🔄 RETRY" label
  - Must answer correctly to complete quiz

### Added - Dynamic Wordset System
- **Wordset Loader**: Created `quiz/wordset-loader.js`
  - Support for multiple vocabulary sets
  - Dynamic loading and switching
  - Caching and localStorage persistence
- **Wordset Config**: Created `data/wordsets-config.json`
  - Shanghai Grade 6 (default)
  - F1 Racing vocabulary
  - Reading A-Z Level H & I
- **Updated VocabularyQuiz**: Now supports wordset switching
  - `switchWordSet(id)` method
  - `getAvailableWordSets()` method

### Changed - Phase 5 Complete (Robustness Layer)
- **Input Validation**: Created `core/validators.js`
  - Type validators (isNumber, isString, isArray, etc.)
  - Range validators (inRange, isValidLevel)
  - Game-specific validators (isValidLapCount, isValidFuel, etc.)
  - Sanitization for game state
- **Storage Migration**: Created `core/storage.js`
  - Versioned localStorage with automatic migration
  - Current version: 2
  - Export/import for backup
- **Error Boundaries**: Created `core/error-handler.js`
  - GameError class with severity levels (LOW, MEDIUM, HIGH, FATAL)
  - Error wrapping for sync/async functions
  - Graceful degradation with user notifications
- **Debug Panel**: Created `debug/debug-panel.js`
  - FPS counter
  - State inspector (car position, resources, upgrades)
  - Physics overlay (F4)
  - Toggle with F3

### Changed - Phase 4 Complete (Data-Driven Design)
- **Question Mode Registry**: Created `quiz/mode-registry.js`
  - Quiz modes are now data-driven, add new modes via config
  - Updated `js/question-factory.js` to use registry
- **Upgrade System**: Created `systems/upgrade-system.js`
  - Upgrade effects are configurable and extensible
  - Supports multiple effect types per upgrade
- **Track Data**: Created `data/tracks.json`
  - Tracks are now stored as JSON data
  - Supports multiple tracks (oval, figure8)

### Changed - Phase 3 Complete (View Layer Separation)
- **View System**: Created modular view architecture
  - `views/base-view.js` - Abstract base class with lifecycle
  - `views/home-view.js` - Home page with stats, leaderboard
  - `views/quiz-view.js` - Quiz questions and results
  - `views/shop-view.js` - Shop items and purchases
  - `views/race-view.js` - Race canvas and touch controls
  - `views/view-manager.js` - View coordination and navigation
- **New Entry Point**: Created `js/main-v2.js` using ViewManager

### Changed - Architecture Integration
- **ShopSystem Integration**: Shop logic centralized in `systems/shop-system.js`
  - `Game._shopItems` getter delegates to `ShopSystem.getItems()`
  - `Game._executeShopAction()` delegates to `ShopSystem.purchase()`
- **RenderSystem Integration**: All rendering extracted from Game class
  - `Game._render()` builds state object and delegates to `RenderSystem.render()`
  - Floating text, HUD, countdown, results all handled by RenderSystem
  - 400+ lines of rendering code removed from Game
- **Game Class Reduction**: 995 lines → 552 lines (-44%)
- **Skipped Subsystems**:
  - QuizEngine: Thin wrapper, low integration value
  - UpgradeSystem: Needs Car refactoring first

### Changed - Phase 2 Complete (Split God Class)
- **RenderSystem**: Created `rendering/render-system.js`
  - All canvas rendering extracted from Game class
  - HUD, countdown, results, minimap, floating text
- **ShopSystem**: Created `systems/shop-system.js`
  - Purchase validation and execution
  - Currency handling and upgrade logic
- **QuizEngine**: Created `systems/quiz-engine.js`
  - Quiz flow coordination
  - Event-driven updates
- **GameEngine**: Created `core/game-engine.js`
  - Thin coordinator that delegates to subsystems
  - Event-driven architecture

### Changed - Phase 1 Complete (Foundation)
- **EventBus**: Created `core/event-bus.js`
  - Central publish/subscribe system
  - Loose coupling between subsystems
- **GameState**: Created `core/game-state.js`
  - Single source of truth for game data
  - Automatic persistence to localStorage
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
