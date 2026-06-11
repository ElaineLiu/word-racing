/**
 * Track3D - 3D 赛道实现
 *
 * 实现 TrackInterface，提供 3D 赛道渲染和几何查询。
 * 几何查询复用了 2D Track 的 Catmull-Rom 逻辑。
 */

import { TrackInterface } from '../../core/track-interface.js';
import { Track } from '../../js/track.js';
import { Scene3D } from './scene-3d.js';
import { TrackBuilder } from '../rendering/track-builder.js?v=epic5-fixed-right-chevron-v3';
import { Events } from '../../core/event-bus.js';

export class Track3D extends TrackInterface {
  #trackData;
  #eventBus;
  #gameState;
  #geometryTrack;
  #scene3d;
  #builder;

  constructor(trackData, eventBus, gameState, { rendererFactory } = {}) {
    super();

    if (!trackData || !trackData.waypoints) throw new Error('Invalid track data');
    if (!eventBus) throw new Error('EventBus is required');
    if (!gameState) throw new Error('GameState is required');

    this.#trackData = trackData;
    this.#eventBus = eventBus;
    this.#gameState = gameState;

    // Reuse 2D Track for geometry queries (Catmull-Rom, collision, progress)
    this.#geometryTrack = new Track(trackData.waypoints, trackData.trackWidth);

    // Build 3D scene
    this.#scene3d = new Scene3D(trackData.sceneConfig || {}, { rendererFactory });

    // Build track geometry in the scene
    this.#builder = new TrackBuilder(this.#scene3d.scene);
    this.#builder.buildTrack(trackData.waypoints, trackData.trackWidth);
    this.#builder.addBarriers();
    this.#builder.addKerbs();
    this.#builder.addStartFinishLine();
    this.#builder.addDecorations();

    // Emit after full initialization (per #011 prevention)
    eventBus.emit(Events.TRACK_SELECTED, {
      trackId: this.id,
      track: this,
      type: '3d',
    });
  }

  // ========== TrackInterface metadata ==========

  get id() { return this.#trackData.id; }
  get name() { return this.#trackData.name; }
  get type() { return '3d'; }
  get description() { return this.#trackData.description; }
  get cost() { return this.#trackData.cost; }

  // ========== Track data ==========

  get startPos() { return { ...this.#geometryTrack.startPos }; }
  get waypoints() { return this.#trackData.waypoints.map(wp => ({ ...wp })); }
  get centerline() { return this.#geometryTrack.centerline; }
  get trackWidth() { return this.#trackData.trackWidth; }

  // ========== Three.js accessors ==========

  get scene() { return this.#scene3d.scene; }
  get camera() { return this.#scene3d.camera; }
  get renderer() { return this.#scene3d.renderer; }

  // ========== Rendering ==========

  render(ctx, car, gameState) {
    // Ignore canvas ctx for 3D, delegate to Scene3D
    this.#scene3d.render();
  }

  update(deltaTime) {
    this.#scene3d.update(deltaTime);
    this.#builder.update(deltaTime);
  }

  // ========== Geometry queries (delegated to 2D Track) ==========

  isOnTrack(carOrX, y) {
    const c = this._normalizeCoords(carOrX, y);
    return this.#geometryTrack.isOnTrack(c.x, c.y);
  }

  getNearestDistance(x, y) {
    return this.#geometryTrack.getNearestDistance(x, y);
  }

  getProgress(carOrX, y) {
    const c = this._normalizeCoords(carOrX, y);
    return this.#geometryTrack.getProgress(c.x, c.y);
  }

  getTrackNormal(carOrX, y) {
    const c = this._normalizeCoords(carOrX, y);
    return this.#geometryTrack.getTrackNormal(c.x, c.y);
  }

  checkCollision(car) {
    return this.getNearestDistance(car.x, car.y) >= this.trackWidth / 2;
  }

  dispose() {
    if (this.#builder) this.#builder.dispose();
    if (this.#scene3d) this.#scene3d.dispose();
  }

  // ========== Helpers ==========

  _normalizeCoords(carOrX, y) {
    if (typeof carOrX === 'object' && carOrX !== null) {
      return { x: carOrX.x, y: carOrX.y };
    }
    return { x: carOrX, y };
  }
}