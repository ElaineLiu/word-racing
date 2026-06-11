import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RaceSession3D } from '../../3d/runtime/race-session-3d.js';
import { EventBus } from '../../core/event-bus.js';
import { GameState } from '../../core/game-state.js';
import { TRACK_REGISTRY } from '../../config/track-registry.js';

function createRendererFactory() {
  return vi.fn(() => ({
    render: vi.fn(),
    dispose: vi.fn(),
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
  }));
}

function createCanvas() {
  return {
    width: 920,
    height: 620,
    clientWidth: 920,
    clientHeight: 620,
  };
}

function createSession(options = {}) {
  const eventBus = new EventBus();
  const gameState = new GameState(eventBus);
  const rendererFactory = createRendererFactory();
  const canvas = createCanvas();
  const session = new RaceSession3D({
    trackData: TRACK_REGISTRY['shanghai-3d'],
    canvas,
    eventBus,
    gameState,
    rendererFactory,
    ...options,
  });

  return { session, eventBus, gameState, rendererFactory, canvas };
}

describe('RaceSession3D', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should require trackData, canvas, eventBus, and gameState', () => {
    const eventBus = new EventBus();
    const gameState = new GameState(eventBus);
    const canvas = createCanvas();

    expect(() => new RaceSession3D({ canvas, eventBus, gameState }))
      .toThrow('trackData is required');
    expect(() => new RaceSession3D({ trackData: TRACK_REGISTRY['shanghai-3d'], eventBus, gameState }))
      .toThrow('canvas is required');
    expect(() => new RaceSession3D({ trackData: TRACK_REGISTRY['shanghai-3d'], canvas, gameState }))
      .toThrow('EventBus is required');
    expect(() => new RaceSession3D({ trackData: TRACK_REGISTRY['shanghai-3d'], canvas, eventBus }))
      .toThrow('GameState is required');
  });

  it('should create track, player car, AI cars, ranking, and camera', () => {
    const { session } = createSession();

    expect(session.track.type).toBe('3d');
    expect(session.track.id).toBe('shanghai-3d');
    expect(session.playerCar.isPlayer).toBe(true);
    expect(session.playerCar.model).toBeDefined();
    expect(session.aiCars).toHaveLength(3);
    expect(session.cars).toHaveLength(4);
    expect(session.aiCars.every(car => car.isPlayer === false)).toBe(true);
    expect(session.playerRank).toBeGreaterThanOrEqual(1);
  });

  it('should use injected eventBus for 3D events', () => {
    const eventBus = new EventBus();
    const handler = vi.fn();
    eventBus.on('rank:changed', handler);

    const session = new RaceSession3D({
      trackData: TRACK_REGISTRY['shanghai-3d'],
      canvas: createCanvas(),
      eventBus,
      gameState: new GameState(eventBus),
      rendererFactory: createRendererFactory(),
    });

    session.update({ up: true, down: false, left: false, right: false, nitro: false }, 1 / 60, 1);

    expect(handler).toHaveBeenCalled();
  });

  it('should update player input, AI cars, ranking, camera, and track', () => {
    const { session } = createSession();
    const initialCameraX = session.track.camera.position.x;

    session.update({ up: true, down: false, left: true, right: false, nitro: true }, 1 / 60, 1);

    expect(session.playerCar.input.up).toBe(true);
    expect(session.playerCar.input.left).toBe(true);
    expect(session.playerCar.input.nitro).toBe(true);
    expect(session.playerRank).toBeGreaterThanOrEqual(1);
    expect(session.track.camera.position.x).not.toBe(initialCameraX);
  });

  it('should render through the 3D renderer', () => {
    const { session, rendererFactory } = createSession();
    const renderer = rendererFactory.mock.results[0].value;

    session.render();

    expect(renderer.render).toHaveBeenCalledWith(session.track.scene, session.track.camera);
  });

  it('should resize the 3D renderer and camera', () => {
    const { session, rendererFactory } = createSession();
    const renderer = rendererFactory.mock.results[0].value;

    session.resize(1200, 800);

    expect(renderer.setSize).toHaveBeenCalledWith(1200, 800, false);
    expect(session.track.camera.aspect).toBeCloseTo(1.5);
  });

  it('should return serializable race result data', () => {
    const { session } = createSession();

    const result = session.getResult();

    expect(result.trackType).toBe('3d');
    expect(result.finalRank).toBeGreaterThanOrEqual(1);
    expect(result.ranking).toHaveLength(4);
    expect(result.ranking[0]).toMatchObject({
      rank: expect.any(Number),
      lap: expect.any(Number),
      progress: expect.any(Number),
      isPlayer: expect.any(Boolean),
    });
    expect(result.ranking[0].car).toBeUndefined();
  });

  it('should rank cars by raceProgress in real time', () => {
    const { session } = createSession();
    session.playerCar.raceProgress = 0.2;
    session.aiCars[0].raceProgress = 0.8;

    const result = session.getResult();

    expect(result.finalRank).toBeGreaterThan(1);
    expect(result.ranking[0].isPlayer).toBe(false);
  });

  it('should preserve finish order in final result', () => {
    const { session } = createSession();
    session.aiCars[0].raceProgress = 1;
    session.aiCars[0].finished = true;
    session.aiCars[0].finishOrder = 1;
    session.playerCar.raceProgress = 1;
    session.playerCar.finished = true;
    session.playerCar.finishOrder = 2;

    const result = session.getResult();

    expect(result.finalRank).toBe(2);
    expect(result.ranking[0].isPlayer).toBe(false);
    expect(result.ranking[1].isPlayer).toBe(true);
  });

  it('should dispose safely more than once', () => {
    const { session, rendererFactory } = createSession();
    const renderer = rendererFactory.mock.results[0].value;

    expect(() => session.dispose()).not.toThrow();
    expect(() => session.dispose()).not.toThrow();
    expect(renderer.dispose).toHaveBeenCalled();
  });
});
