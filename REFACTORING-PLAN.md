# Word Racing Refactoring Plan

> Created: 2026-05-15
> Updated: 2026-05-20
> Status: **Architecture Integration Complete**
> Game class: 995 lines → 552 lines (-44%)

## Refactoring Summary

| Phase | Status | Lines Changed |
|-------|--------|---------------|
| Phase 0: Testing Infrastructure | ✅ Complete | +800 |
| Phase 1: Foundation (Config + Modules + EventBus + GameState) | ✅ Complete | +1200 |
| Phase 2: Split God Class | ✅ Complete | -400 |
| Phase 3: View Layer Separation | ✅ Complete | +1400 |
| Phase 4: Data-Driven Design | ✅ Complete | +400 |
| Phase 5: Robustness Layer | ✅ Complete | +600 |
| **Architecture Integration** | ✅ Complete | -460 |

### Integrated Subsystems

| Subsystem | Status | Impact |
|-----------|--------|--------|
| ShopSystem | ✅ Integrated | Shop logic centralized |
| RenderSystem | ✅ Integrated | 400+ lines removed from Game |
| QuizEngine | ⏭️ Skipped | Thin wrapper, low value |
| UpgradeSystem | ⏭️ Skipped | Needs Car refactoring |

## Current Architecture Assessment

| Problem | Before | After |
|---------|--------|-------|
| **God Class** | Game: 995 lines | Game: 552 lines |
| **Module system** | window.* globals | ES6 modules |
| **Event system** | Callbacks | EventBus |
| **View layer** | Inline scripts | ViewManager + 4 Views |
| **Shop logic** | Split across files | ShopSystem |
| **Rendering** | Inline in Game | RenderSystem |

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           index.html                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  HomeView   │  │  QuizView   │  │  ShopView   │  │  RaceView  │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘ │
└─────────┼────────────────┼────────────────┼────────────────┼────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                          ┌─────────▼─────────┐
                          │   EventBus        │  ← Central pub/sub
                          │  (state changes,  │
                          │   game events)    │
                          └─────────┬─────────┘
                                    │
    ┌───────────────────────────────┼───────────────────────────────┐
    │                               │                               │
┌───▼────────────┐  ┌──────────────▼──────────────┐  ┌─────────────▼───────┐
│  GameState     │  │  GameEngine                 │  │  RenderSystem       │
│  (single source│  │  - update(dt)               │  │  - track renderer   │
│   of truth)    │  │  - physics step             │  │  - car renderer     │
│  - resources   │  │  - collision                │  │  - HUD renderer     │
│  - upgrades    │  │  - lap detection            │  │  - effects          │
│  - quiz state  │  │                             │  │                     │
└────────────────┘  └─────────────────────────────┘  └─────────────────────┘
          │                       │                          │
          │         ┌─────────────┴─────────────┐            │
          │         │                           │            │
    ┌─────▼────┐  ┌─▼──────────┐  ┌────────────▼───┐  ┌─────▼─────┐
    │ QuizEngine│  │ CarPhysics │  │ TrackPhysics   │  │ ShopSystem│
    │ - modes   │  │ - movement │  │ - collision    │  │ - items   │
    │ - rewards │  │ - nitro    │  │ - progress     │  │ - buy     │
    │ - review  │  │ - upgrades │  │                │  │           │
    └───────────┘  └────────────┘  └────────────────┘  └───────────┘
          │
    ┌─────▼─────────┐
    │ QuestionFactory│
    │ - 5 modes      │
    │ - distractors  │
    └────────────────┘
```

---

## Phase 0: Testing Infrastructure ✅ COMPLETE

**Goal:** Establish test suite to catch regressions during refactoring.

### Completed Tasks
- [x] Create `package.json` with Vitest
- [x] Create `vitest.config.js` with jsdom environment
- [x] Create `tests/setup.js` with browser mocks
- [x] Create `tests/car.test.js` - 25+ physics tests
- [x] Create `tests/track.test.js` - 15+ geometry tests
- [x] Create `tests/quiz.test.js` - 30+ quiz logic tests
- [x] Create `tests/game.test.js` - 25+ state/economy tests
- [x] Create `tests/README.md` - documentation
- [x] Create `CHANGELOG.md` - track changes

### How to Run Tests
```bash
npm install          # First time only
npm test             # Run all tests
npm run test:car     # Run car tests only
```

---

## Phase 1: Foundation (No Feature Changes)

**Goal:** Establish clean architecture without breaking existing functionality.

### 1.1 Config Extraction ✅ COMPLETE

**Created:** `config/game-config.js`

**Create:** `config/game-config.js`

```js
export const PHYSICS = {
  BASE_MAX_SPEED: 4.0,
  BASE_ACCELERATION: 0.08,
  BASE_BRAKE_FORCE: 0.15,
  BASE_FRICTION: 0.988,
  BASE_OFF_TRACK_FRICTION: 0.96,
  BASE_TURN_SPEED: 0.045,
  NITRO_DURATION: 180,
  NITRO_MAX_SPEED: 8.0,
  NITRO_ACCEL: 0.2,
  STOP_THRESHOLD: 0.05,
  REVERSE_MAX_SPEED: -1.5,
};

export const ECONOMY = {
  MAX_FUEL: 100,
  FUEL_PER_LAP: 20,
  SHOP_ITEMS: [
    { id: 'fuel20', label: 'Fuel +20', cost: 15, currency: 'fuel', effect: { fuel: 20 } },
    { id: 'fuel50', label: 'Fuel +50', cost: 30, currency: 'fuel', effect: { fuel: 50 } },
    { id: 'nitro1', label: 'Nitro x1', cost: 20, currency: 'gear', effect: { nitro: 1 } },
    { id: 'nitro3', label: 'Nitro x3', cost: 50, currency: 'gear', effect: { nitro: 3 } },
    { id: 'engine1', label: 'Engine Lv.2', cost: 100, currency: 'gear', upgrade: 'engine' },
    { id: 'tire1', label: 'Tire Lv.2', cost: 80, currency: 'gear', upgrade: 'tire' },
    { id: 'body1', label: 'Body Lv.2', cost: 120, currency: 'gear', upgrade: 'body' },
  ],
  REWARDS: {
    PIT_BOARD: { fuel: 10, gear: 0 },
    RADIO_MSG: { fuel: 10, gear: 0 },
    STRATEGY: { fuel: 15, gear: 0 },
    QUALIFYING: { fuel: 0, gear: 15 },
    LAP_REVIEW: { fuel: 0, gear: 5 },
    COMBO_BONUS: { gear: 5, threshold: 3 },
  },
};

export const UPGRADES = {
  engine: { maxLevel: 4, multiplier: 0.10 },
  tire: { maxLevel: 4, multiplier: 0.10 },
  body: { maxLevel: 4, multiplier: 0.05 },
};

export const TRACK = {
  WIDTH: 76,
  WAYPOINTS: [
    { x: 180, y: 180 },
    { x: 350, y: 160 },
    // ... all 18 waypoints
  ],
  SAMPLES_PER_SEGMENT: 200,
};

export const DISPLAY = {
  CANVAS_WIDTH: 920,
  CANVAS_HEIGHT: 620,
  SPEED_MULTIPLIER: 50,  // speed * 50 = km/h display
};
```

**Modify:** `js/car.js` - import and use config constants

**Tests to run after:** `npm run test:car`

---

### 1.2 Module System (ES6) ✅ COMPLETE

**Goal:** Convert from `window.Car = Car` to `export class Car`

**Steps:**
1. Add `export` to each class in all JS files
2. Add `import` statements where dependencies exist
3. Create `js/main.js` as single entry point
4. Change `index.html` to use `<script type="module" src="js/main.js"></script>`

**File dependencies (load order):**
```
question-factory.js  (no deps)
     ↓
quiz.js              (imports QuestionFactory)
     ↓
track.js             (no deps)
     ↓
car.js               (imports config)
     ↓
game.js              (imports Track, Car, Quiz, config)
     ↓
nav.js               (imports Game)
     ↓
main.js              (entry point, initializes everything)
```

**Tests to run after:** `npm test`

---

### 1.3 EventBus ✅ COMPLETE

**Created:** `core/event-bus.js`

```js
export class EventBus {
  #listeners = new Map();

  on(event, callback) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, []);
    }
    this.#listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    const callbacks = this.#listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    const callbacks = this.#listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

// Event types:
export const Events = {
  RESOURCE_CHANGED: 'resource:changed',
  QUIZ_COMPLETE: 'quiz:complete',
  RACE_START: 'race:start',
  RACE_FINISH: 'race:finish',
  SHOP_PURCHASE: 'shop:purchase',
  UPGRADE_CHANGED: 'upgrade:changed',
  STATE_CHANGED: 'state:changed',
};
```

**Tests to run after:** `npm test`

---

### 1.4 GameState (Single Source of Truth) ✅ COMPLETE

**Created:** `core/game-state.js`

```js
import { EventBus, Events } from './event-bus.js';

export class GameState {
  #state = {
    fuel: 0,
    fuelCoins: 0,
    gearCoins: 0,
    nitroCharges: 0,
    upgrades: { engine: 1, tire: 1, body: 1 },
    wrongWords: [],
    leaderboard: [],
    quizMode: 'basic',
    maxLevel: 3,
  };
  
  #eventBus;

  constructor(eventBus) {
    this.#eventBus = eventBus;
    this.#load();
  }

  get(path) {
    const keys = path.split('.');
    let value = this.#state;
    for (const key of keys) {
      value = value?.[key];
    }
    return value;
  }

  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.#state;
    for (const key of keys) {
      target = target[key];
    }
    target[lastKey] = value;
    this.#save();
    this.#eventBus.emit(Events.RESOURCE_CHANGED, { path, value });
  }

  serialize() {
    return JSON.stringify(this.#state);
  }

  deserialize(data) {
    this.#state = { ...this.#state, ...JSON.parse(data) };
  }

  #load() {
    try {
      const saved = localStorage.getItem('wr_game_state');
      if (saved) this.deserialize(saved);
    } catch (e) {
      console.warn('Failed to load game state:', e);
    }
  }

  #save() {
    try {
      localStorage.setItem('wr_game_state', this.serialize());
    } catch (e) {
      console.warn('Failed to save game state:', e);
    }
  }
}
```

**Tests to run after:** `npm test`

---

## Phase 2: Split God Class

**Goal:** Break `Game` into focused subsystems.

### 2.1 Extract RenderSystem ✅ COMPLETE
- Created `rendering/render-system.js`
- Moved all `_render*` methods from `game.js`
- Tests: `npm test` ✅

### 2.2 Extract ShopSystem ✅ COMPLETE
- Created `systems/shop-system.js`
- Moved `_shopItems` and `_executeShopAction`
- Tests: `npm test` ✅

### 2.3 Extract QuizEngine ✅ COMPLETE
- Created `systems/quiz-engine.js`
- Moved quiz state machine logic
- Tests: `npm test` ✅

### 2.4 Slim GameEngine ✅ COMPLETE
- Created `core/game-engine.js` as thin coordinator
- Tests: `npm test` ✅

---

## Phase 3: View Layer Separation

**Goal:** Clean UI components with event-driven updates.

### 3.1 Base View Class ✅ COMPLETE
- Created `views/base-view.js` with lifecycle methods

### 3.2 Concrete Views ✅ COMPLETE
- Created `views/home-view.js`
- Created `views/shop-view.js`
- Created `views/quiz-view.js`
- Created `views/race-view.js`

### 3.3 View Manager ✅ COMPLETE
- Created `views/view-manager.js`

### 3.4 Browser Integration ⏳ PENDING
- Views created, need browser testing with main-v2.js
- Tests: `npm test` ✅ (99 passed)

---

## Phase 4: Data-Driven Design

**Goal:** Add content without code changes.

### 4.1 Question Mode Registry ✅ COMPLETE
- Created `quiz/mode-registry.js`
- Adding modes is now a config change
- Tests: `npm test` ✅

### 4.2 Upgrade System ✅ COMPLETE
- Created `systems/upgrade-system.js`
- Upgrade effects are configurable
- Tests: `npm test` ✅

### 4.3 Track Data Format ✅ COMPLETE
- Created `data/tracks.json`
- Supports multiple tracks (oval, figure8)
- Tests: `npm test` ✅

---

## Phase 5: Robustness Layer

**Goal:** Prevent bugs, enable debugging.

### 5.1 Input Validation ✅ COMPLETE
- Created `core/validators.js`
- Type validators, range validators, game-specific validators
- Sanitization functions for game state

### 5.2 Storage Migration ✅ COMPLETE
- Created `core/storage.js` with versioning
- Automatic migration from legacy formats
- Export/import for backup

### 5.3 Error Boundaries ✅ COMPLETE
- Created `core/error-handler.js`
- GameError class with severity levels
- Error boundaries for subsystems
- Graceful degradation

### 5.4 Debug Panel ✅ COMPLETE
- Created `debug/debug-panel.js`
- FPS counter, state inspector
- Physics overlay (F4)
- Toggle with F3

---

## File Structure After Refactoring

```
word-racing/
├── index.html
├── package.json
├── vitest.config.js
├── CHANGELOG.md
├── REFACTORING-PLAN.md          ← This file
├── config/
│   ├── game-config.js           # All constants
│   └── words-config.js
├── core/
│   ├── event-bus.js             # Pub/sub system
│   ├── game-state.js            # Single source of truth
│   ├── game-engine.js           # Main loop coordinator
│   ├── storage.js               # Save/load with migration
│   └── validators.js            # Input validation
├── systems/
│   ├── physics-engine.js        # Car + track physics
│   ├── quiz-engine.js           # Quiz state machine
│   ├── shop-system.js           # Purchases, validation
│   └── upgrade-system.js        # Upgrade logic
├── physics/
│   ├── car-physics.js           # Movement, nitro
│   └── track-physics.js         # Collision, progress
├── quiz/
│   ├── question-factory.js      # Question generation
│   ├── distractor-engine.js     # Smart distractors
│   └── mode-registry.js         # Mode definitions
├── rendering/
│   ├── render-system.js         # Canvas coordinator
│   ├── track-renderer.js
│   ├── car-renderer.js
│   └── hud-renderer.js
├── views/
│   ├── base-view.js
│   ├── home-view.js
│   ├── quiz-view.js
│   ├── shop-view.js
│   ├── race-view.js
│   └── view-manager.js
├── data/
│   ├── words.json
│   ├── words-f1.json
│   └── tracks.json
├── tests/
│   ├── setup.js
│   ├── car.test.js
│   ├── track.test.js
│   ├── quiz.test.js
│   ├── game.test.js
│   └── README.md
├── debug/
│   └── debug-panel.js
└── js/                          # Old files (delete after migration)
    ├── car.js
    ├── track.js
    ├── game.js
    ├── quiz.js
    ├── question-factory.js
    └── nav.js
```

---

## Migration Strategy

| Phase | Duration | Risk | Can Ship Between? |
|-------|----------|------|-------------------|
| 0. Testing | Done | Low | ✅ Yes |
| 1. Foundation | 2-3 days | Low | ✅ Yes, after each sub-phase |
| 2. Split God Class | 3-4 days | Medium | ✅ Yes, after each extraction |
| 3. View Layer | 2-3 days | Medium | ✅ Yes, after each view |
| 4. Data-Driven | 2-3 days | Low | ✅ Yes |
| 5. Robustness | 2-3 days | Low | ✅ Yes |

---

## Resume Instructions

When restarting Claude Code, say:

> "Resume Word Racing refactoring from REFACTORING-PLAN.md. Current status: Phase 0 complete. Start Phase 1.1 Config Extraction."

---

## Checklist for Each Change

1. [ ] Run `npm test` - all tests should pass
2. [ ] Make the change
3. [ ] Run `npm test` - all tests should still pass
4. [ ] Update tests if behavior changed intentionally
5. [ ] Update CHANGELOG.md
6. [ ] Test in browser manually
