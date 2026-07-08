# Word Racing

Vocabulary learning game that combines adaptive quiz practice with F1-style racing. Built for 6th graders, works on PC and tablet.

## Features

- **Adaptive Learning System** — Daily 3-quiz goal, word mastery tracking across 5 levels, auto-selection of words you need to practice
- **3D Racing Tracks** — Shanghai, Monaco, and Silverstone circuits rendered with Three.js
- **Dual Currency** — Fuel Coins (quiz rewards) and Gear Coins (accuracy bonus) with separate uses
- **Multi-User Support** — Each player has their own progress, coins, and word data
- **Achievement System** — 20+ milestones for words mastered, quizzes completed, tracks unlocked
- **Progress Report** — Word-by-word mastery overview, review list, and daily summary
- **Garage** — Buy nitro boosts and unlock new tracks
- **Quiz Modes** — Basic (multiple choice) and Advanced (typing), with "I'm not sure" learning panel
- **Touch Controls** — Mobile/tablet friendly on-screen controls for racing

## How to Play

1. **Practice** — Complete daily quizzes to earn Fuel Coins and Gear Coins
   - Correct answer: +Fuel Coins, +Gear Coins (accuracy streak)
   - Wrong or "I'm not sure": opens learning panel with word details
   - Wrong words come back for re-testing in the same session
2. **Garage** — Spend Gear Coins on nitro, unlock new tracks with Fuel Coins
3. **Race** — Pick a track and race! Arrow keys or touch controls
4. **Report** — Track your progress and review problem words

## Getting Started

You need a local HTTP server because the game uses ES Modules.

### Option 1: Python (works everywhere)

```bash
python -m http.server 3000
# Open http://localhost:3000
```

### Option 2: Node.js

```bash
npx serve . -p 3000
# Open http://localhost:3000
```

### Option 3: Double-click (Windows)

Double-click `启动游戏.bat` — requires Node.js installed.

## Project Structure

```
word-racing/
├── index.html              # Main entry point
├── js/                     # Core game logic (Game, Car, Track, Quiz)
├── core/                   # Shared infrastructure
│   ├── event-bus.js        # Pub/sub event system
│   ├── game-state.js       # Single source of truth for all state
│   ├── user-manager.js     # Multi-user creation and switching
│   ├── validators.js       # Input validation layer
│   └── track-interface.js  # Track abstraction contract
├── learning/               # Adaptive learning system
│   ├── learning-controller.js  # Main orchestrator
│   ├── daily-manager.js        # Daily 3-quiz enforcement
│   ├── progress-tracker.js     # Word mastery tracking
│   ├── quiz-session.js         # Session state management
│   └── adaptive-selector.js    # Smart word selection algorithm
├── views/                  # Page-level UI components
│   ├── view-manager.js     # Page navigation coordinator
│   ├── home-view.js        # Dashboard with daily progress
│   ├── quiz-view.js        # Quiz interface
│   ├── shop-view.js        # Garage (items + track unlock)
│   ├── race-view.js        # Race setup and launch
│   ├── report-view.js      # Progress report with word details
│   └── settings-view.js    # Reset options
├── ui/                     # Reusable UI widgets
├── 3d/                     # 3D racing (Three.js)
│   ├── core/               # Scene, car physics, track data
│   ├── runtime/            # Race session orchestrator
│   ├── controllers/        # Camera and AI
│   ├── rendering/          # Track mesh builder
│   └── models/             # Car, building, tree models
├── systems/                # Game systems (shop, achievements, unlocks)
├── config/                 # Configuration files
├── data/                   # Word lists, track data
├── css/                    # Stylesheets
└── tests/                  # Test suite (Vitest)
```

## Tech Stack

- **Frontend**: HTML5, CSS3, ES6 Modules (no framework, no build step)
- **Graphics**: Canvas 2D (racing), Three.js via CDN (3D tracks)
- **Storage**: localStorage (multi-user keyed)
- **Testing**: Vitest + jsdom
- **Dependencies**: Three.js 0.184 (loaded via CDN, no npm install needed to play)

## Development

```bash
npm install          # Install dev dependencies (vitest, jsdom)
npx vitest run       # Run test suite
npx vitest --watch   # Watch mode
```

See `CLAUDE.md` for development constraints and `ISSUE_LOG.md` for issue history.
