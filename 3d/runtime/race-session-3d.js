import * as THREE from 'three';
import { Track3D } from '../core/track-3d.js';
import { Car3D } from '../core/car-3d.js';
import { CameraController } from '../controllers/camera-controller.js';
import { AIController } from '../controllers/ai-controller.js';
import { RankingSystem } from '../systems/ranking-system.js';
import { AI_CONFIG } from '../../config/ai-config.js';

const AI_PERSONALITIES = ['aggressive', 'balanced', 'conservative'];
const AI_COLORS = [0xff4444, 0x44ff44, 0x4444ff];

export class RaceSession3D {
  #track;
  #playerCar;
  #aiCars;
  #aiControllers;
  #rankingSystem;
  #cameraController;
  #finishOrder = 0;
  #disposed = false;

  constructor({ trackData, canvas, eventBus, gameState, rendererFactory } = {}) {
    if (!trackData) throw new Error('trackData is required');
    if (!canvas) throw new Error('canvas is required');
    if (!eventBus) throw new Error('EventBus is required');
    if (!gameState) throw new Error('GameState is required');

    const factory = rendererFactory || ((cfg) => {
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setSize(canvas.clientWidth || canvas.width, canvas.clientHeight || canvas.height, false);
      renderer.setClearColor(cfg.clearColor, 1);
      return renderer;
    });

    this.#track = new Track3D(trackData, eventBus, gameState, { rendererFactory: factory });
    this.#playerCar = new Car3D(
      this.#track.startPos.x,
      this.#track.startPos.y,
      this.#track.startPos.angle,
      this.#track.scene
    );
    this.#playerCar.eventBus = eventBus;
    this.#playerCar.isPlayer = true;
    this.#playerCar.nitroCharges = gameState.get('nitroCharges') || 0;

    this.#aiCars = AI_PERSONALITIES.map((personalityName, index) => {
      const car = new Car3D(
        this.#track.startPos.x + (index + 1) * 20,
        this.#track.startPos.y,
        this.#track.startPos.angle,
        this.#track.scene
      );
      car.eventBus = eventBus;
      car.isPlayer = false;
      this.#setCarColor(car, AI_COLORS[index]);
      return car;
    });

    this.#aiControllers = this.#aiCars.map((car, index) => (
      new AIController(car, this.#track, AI_CONFIG.PERSONALITIES[AI_PERSONALITIES[index]])
    ));
    this.#rankingSystem = new RankingSystem(this.cars, eventBus);
    this.#cameraController = new CameraController(this.#track.camera);

    // Snap camera to initial position immediately (skip lerp)
    this.#cameraController.snapTo(this.#playerCar);

    this.cars.forEach(car => {
      car.raceProgress = 0;
      car._lastRaceProgress = this.#track.getProgress(car);
    });
    this.#rankingSystem.update();
  }

  get track() { return this.#track; }
  get playerCar() { return this.#playerCar; }
  get aiCars() { return this.#aiCars; }
  get cars() { return [this.#playerCar, ...this.#aiCars]; }
  get playerRank() { return this.#rankingSystem.getPlayerRank(); }

  update(input, deltaTime = 1 / 60, totalLaps = 3) {
    if (this.#disposed) return;

    this.#playerCar.input = { ...input };
    this.#aiControllers.forEach(controller => controller.update(deltaTime));
    this.cars.forEach(car => car.update(this.#track, totalLaps, deltaTime));
    this.cars.forEach(car => this.#updateRaceProgress(car, totalLaps));
    this.#rankingSystem.update();
    this.#cameraController.update(this.#playerCar);
    this.#track.update(deltaTime);
  }

  render() {
    if (this.#disposed) return;
    this.#track.render(null, this.#playerCar, null);
  }

  resize(width, height) {
    if (this.#disposed) return;
    this.#track.renderer.setSize(width, height, false);
    this.#track.camera.aspect = width / height;
    this.#track.camera.updateProjectionMatrix();
  }

  getResult() {
    const ranking = this.#rankingSystem.calculateRanking().map(entry => ({
      rank: entry.rank,
      lap: entry.lap,
      progress: entry.progress ?? 0,
      isPlayer: entry.car.isPlayer === true,
    }));

    return {
      trackType: '3d',
      finalRank: this.#rankingSystem.getPlayerRank(),
      ranking,
      exposedWords: null,
    };
  }

  getDebugObjectCounts() {
    const counts = {};
    this.#track.scene.traverse(obj => {
      if (!obj.name) return;
      counts[obj.name] = (counts[obj.name] || 0) + 1;
    });
    return counts;
  }

  dispose() {
    if (this.#disposed) return;
    this.#track.dispose();
    this.#disposed = true;
  }

  #updateRaceProgress(car, totalLaps) {
    const currentProgress = this.#track.getProgress(car);
    const previousProgress = car._lastRaceProgress ?? currentProgress;
    let delta = currentProgress - previousProgress;

    if (delta < -0.5) delta += 1;
    if (delta > 0.5) delta -= 1;

    if (delta > 0 && !car.finished) {
      car.raceProgress = (car.raceProgress || 0) + delta;
      car.lap = Math.floor(car.raceProgress);
      car.lastProgress = car.raceProgress % 1;
    }

    car._lastRaceProgress = currentProgress;

    if ((car.raceProgress || 0) >= totalLaps && !car.finishOrder) {
      car.finished = true;
      car.finishOrder = ++this.#finishOrder;
      car.lap = totalLaps;
      car.lastProgress = 0;
      car.speed *= 0.5;
    } else if (!car.finishOrder) {
      car.finished = false;
    }
  }

  #setCarColor(car, color) {
    car.carModel.mesh.traverse((child) => {
      if (child.isMesh && child.material?.name === 'body') {
        child.material.color.setHex(color);
      }
    });
  }
}
