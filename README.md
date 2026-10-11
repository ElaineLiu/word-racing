# Word Racing

Vocabulary learning game that combines adaptive practice with F1-style racing, using the Shanghai exam vocabulary for learners including seventh graders. Works on PC and tablet.

## Features

- **Adaptive Learning System** — Daily 45-word goal, three long-term states, new-word learning before practice, and independent verification with scheduled review
- **3D Racing Tracks** — Shanghai, Monaco, and Silverstone circuits rendered with Three.js
- **Dual Currency** — Fuel Coins (completed-word rewards) and Gear Coins (independent verification rewards) with separate uses
- **Multi-User Support** — Each player has their own progress, coins, and word data
- **Achievement System** — 20+ milestones for words mastered, quizzes completed, tracks unlocked
- **Progress Report** — Word-by-word mastery overview, review list, and daily summary
- **Garage** — Buy nitro boosts and unlock new tracks
- **Automatic Tasks** — Bidirectional meaning questions, learning cards, and eligible context practice, selected by learning progress
- **Touch Controls** — Mobile/tablet friendly on-screen controls for racing

## How to Play

1. **Practice** — Complete 45 distinct words, in rounds of up to 10
   - New words start with learning; previously encountered words can be independently verified
   - Completing both directions earns 2 Fuel Coins per word; 45 completed words earn another 10, totaling 100 fuel
   - Every 5 independently passed words earn 1 Gear Coin, capped at 2 per day
   - Help and same-day practice do not certify a word as learned; verification happens on a later date
2. **Garage** — Spend Gear Coins on nitro, unlock new tracks with Fuel Coins
3. **Race** — Pick a track and race! Arrow keys or touch controls
4. **Report** — Track your progress and review problem words

## Getting Started

### Offline release (no installation required)

Extract `word-racing-v2.2.0-offline.zip` and double-click `word-racing/index.html` in Chrome or Edge. On Windows, `启动游戏.bat` also opens the game. Vocabulary and Three.js are bundled; no server, Node.js, or network connection is required. Export your old save before upgrading and import it on the new page: file-based and localhost pages have separate browser storage.

Build the Windows ZIP with `npm run pack:zip`; it creates a versioned archive and SHA256 checksum in `dist/`.

### Source checkout

The source checkout uses ES Modules and needs a local HTTP server.

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
│   ├── learning-route.js       # Three-state route, daily tasks and reward receipts
│   ├── daily-manager.js        # Legacy quiz history compatibility
│   ├── progress-tracker.js     # Historical word progress and migration
│   ├── quiz-session.js         # Session state management
│   └── adaptive-selector.js    # Smart word selection algorithm
├── views/                  # Page-level UI components
│   ├── view-manager.js     # Page navigation coordinator
│   ├── home-view.js        # Dashboard with daily progress
│   ├── learning-view.js    # Adaptive learning interface
│   ├── quiz-view.js        # Legacy quiz compatibility
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

- **Frontend**: HTML5, CSS3, ES6 Modules (no framework), optional esbuild offline bundle
- **Graphics**: Canvas 2D (racing), Three.js (bundled offline; CDN in source preview)
- **Storage**: localStorage (multi-user keyed)
- **Testing**: Vitest + jsdom
- **Dependencies**: Three.js 0.184; offline releases need no npm installation

## Development

```bash
npm install          # Install dev dependencies (vitest, jsdom)
npx vitest run       # Run test suite
npx vitest --watch   # Watch mode
```

See `CLAUDE.md` for development constraints and `ISSUE_LOG.md` for issue history.
