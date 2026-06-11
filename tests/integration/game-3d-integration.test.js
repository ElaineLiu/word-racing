import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Game } from '../../js/game.js';
import { GameState } from '../../core/game-state.js';
import { EventBus, Events } from '../../core/event-bus.js';
import { FeatureFlags } from '../../config/feature-flags.js';
import { GAME } from '../../config/game-config.js';

class MockCanvas {
  constructor() {
    this.width = 920;
    this.height = 620;
    this.parentElement = { clientWidth: 920, clientHeight: 620 };
  }
  getContext() {
    const noop = () => {};
    return new Proxy({}, { get: () => noop });
  }
  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 920, height: 620 }; }
}

function createRendererFactory({ fail = false } = {}) {
  return vi.fn(() => {
    if (fail) throw new Error('Renderer failed');
    return {
      render: vi.fn(),
      dispose: vi.fn(),
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      setClearColor: vi.fn(),
    };
  });
}

function installThreeCanvas(canvas = new MockCanvas()) {
  const getElementByIdSpy = vi.spyOn(document, 'getElementById').mockImplementation((id) => {
    if (id === 'threeCanvas') return canvas;
    return document.__proto__.getElementById.call(document, id);
  });
  return () => {
    getElementByIdSpy.mockRestore();
  };
}

function createGame({ rendererFactory = createRendererFactory(), eventBus = new EventBus() } = {}) {
  const gameState = new GameState(eventBus);
  const game = new Game(new MockCanvas(), gameState, eventBus, {
    track3DOptions: { rendererFactory },
  });
  return { game, gameState, eventBus, rendererFactory };
}

describe('Game 3D integration', () => {
  let restoreGetElementById;

  beforeEach(() => {
    localStorage.clear();
    FeatureFlags.reset();
    restoreGetElementById = installThreeCanvas();
  });

  afterEach(() => {
    localStorage.clear();
    restoreGetElementById?.();
  });

  it('should use injected shared EventBus for race finish events', async () => {
    const eventBus = new EventBus();
    const finishHandler = vi.fn();
    eventBus.on(Events.RACE_FINISH, finishHandler);
    const { game, gameState } = createGame({ eventBus });

    gameState.set('fuelCoins', 100);
    gameState.set('fuel', 100);
    gameState.set('unlockedTracks', ['shanghai-2d']);
    gameState.set('selectedTrackId', 'shanghai-2d');
    await game.continueToRace();
    game.car.lap = 1;
    game.car.lastProgress = 0;
    game.car.bestLapTime = 1234;

    game._showResults();

    expect(finishHandler).toHaveBeenCalledWith(expect.objectContaining({
      trackId: 'shanghai-2d',
      trackType: '2d',
    }));
  });

  it('should prepare 2D races through async continueToRace without changing behavior', async () => {
    const { game, gameState } = createGame();
    gameState.set('fuelCoins', 100);
    gameState.set('unlockedTracks', ['shanghai-2d']);
    gameState.set('selectedTrackId', 'shanghai-2d');

    const result = game.continueToRace();

    expect(result).toBeInstanceOf(Promise);
    await result;
    expect(game.state).toBe(GAME.STATES.COUNTDOWN);
    expect(game.track.constructor.name).toBe('Track');
    expect(gameState.get('fuelCoins')).toBe(90);
  });

  it('should not double deduct while race preparation is pending', async () => {
    const { game, gameState } = createGame();
    gameState.set('fuelCoins', 100);
    gameState.set('unlockedTracks', ['shanghai-2d']);
    gameState.set('selectedTrackId', 'shanghai-2d');

    await Promise.all([game.continueToRace(), game.continueToRace()]);

    expect(gameState.get('fuelCoins')).toBe(90);
  });

  it('should prepare a 3D race with player, AI cars, ranking, and shared state', async () => {
    const { game, gameState, eventBus, rendererFactory } = createGame();
    const trackSelectedHandler = vi.fn();
    eventBus.on(Events.TRACK_SELECTED, trackSelectedHandler);
    gameState.set('fuelCoins', 100);
    gameState.set('fuel', 100);
    gameState.set('unlockedTracks', ['shanghai-2d', 'shanghai-3d']);
    gameState.set('selectedTrackId', 'shanghai-3d');

    await game.continueToRace();

    expect(game.state).toBe(GAME.STATES.COUNTDOWN);
    expect(game.getCurrentTrackType()).toBe('3d');
    expect(game.track.type).toBe('3d');
    expect(game.car.isPlayer).toBe(true);
    expect(game.car.model).toBeDefined();
    expect(game.get3DRaceSession().aiCars).toHaveLength(3);
    expect(game.get3DRaceSession().playerRank).toBeGreaterThanOrEqual(1);
    expect(gameState.get('fuelCoins')).toBe(90);
    expect(rendererFactory).toHaveBeenCalled();
    expect(trackSelectedHandler).toHaveBeenCalledWith(expect.objectContaining({
      trackId: 'shanghai-3d',
      type: '3d',
    }));
  });

  it('should update, render, and finish 3D races with ranking payload', async () => {
    const { game, gameState, eventBus } = createGame();
    const finishHandler = vi.fn();
    eventBus.on(Events.RACE_FINISH, finishHandler);
    gameState.set('fuelCoins', 100);
    gameState.set('fuel', 100);
    gameState.set('unlockedTracks', ['shanghai-2d', 'shanghai-3d']);
    gameState.set('selectedTrackId', 'shanghai-3d');
    await game.continueToRace();

    game.state = GAME.STATES.RACING;
    game.raceStartTime = Date.now() - 1000;
    game._updateRacing(1 / 60);
    game._render();
    game.car.lap = 1;
    game.car.lastProgress = 0;
    game.car.finished = true;
    game._showResults();

    expect(finishHandler).toHaveBeenCalledWith(expect.objectContaining({
      trackType: '3d',
      finalRank: expect.any(Number),
      ranking: expect.any(Array),
      exposedWords: null,
    }));
  });

  it('should block 3D race when feature flag is disabled and keep cost unchanged', async () => {
    const { game, gameState } = createGame();
    FeatureFlags.disable('3d-track');
    gameState.set('fuelCoins', 100);
    gameState.set('unlockedTracks', ['shanghai-2d', 'shanghai-3d']);
    gameState.set('selectedTrackId', 'shanghai-3d');

    await expect(game.continueToRace()).rejects.toThrow('Track not available: shanghai-3d');

    expect(gameState.get('fuelCoins')).toBe(100);
    expect(game.get3DRaceSession()).toBe(null);
  });

  it('should refund 3D race cost if renderer creation fails', async () => {
    const rendererFactory = createRendererFactory({ fail: true });
    const { game, gameState } = createGame({ rendererFactory });
    gameState.set('fuelCoins', 100);
    gameState.set('unlockedTracks', ['shanghai-2d', 'shanghai-3d']);
    gameState.set('selectedTrackId', 'shanghai-3d');

    await expect(game.continueToRace()).rejects.toThrow('Renderer failed');

    expect(gameState.get('fuelCoins')).toBe(100);
    expect(game.get3DRaceSession()).toBe(null);
  });

  it('should dispose 3D session when exiting race', async () => {
    const { game, gameState } = createGame();
    gameState.set('fuelCoins', 100);
    gameState.set('fuel', 100);
    gameState.set('unlockedTracks', ['shanghai-2d', 'shanghai-3d']);
    gameState.set('selectedTrackId', 'shanghai-3d');
    await game.continueToRace();
    const session = game.get3DRaceSession();
    const disposeSpy = vi.spyOn(session, 'dispose');

    game.exitRace();

    expect(disposeSpy).toHaveBeenCalled();
    expect(game.get3DRaceSession()).toBe(null);
    expect(game.state).toBe('HOME');
  });
});
