import * as THREE from 'three';

const CHASE_DISTANCE = 50;
const CHASE_HEIGHT = 20;
const COCKPIT_FORWARD = 1;
const COCKPIT_HEIGHT = 3;
const LOOK_AHEAD_DISTANCE = 50;

const VALID_MODES = ['chase', 'cockpit'];

const _target = new THREE.Vector3();
const _lookAt = new THREE.Vector3();

/**
 * Smoothly follows a car-like object ({x, y, angle}) in two modes:
 * 'chase'   — behind and above the car
 * 'cockpit' — slightly in front of the car at driver height
 *
 * 2D y maps to 3D z (Three.js is Y-up).
 */
export class CameraController {
  constructor(camera, { positionLerpFactor = 0.1 } = {}) {
    this._camera = camera;
    this._lerp = positionLerpFactor;
    this._mode = 'chase';
  }

  get mode() {
    return this._mode;
  }

  setMode(mode) {
    if (!VALID_MODES.includes(mode)) {
      throw new Error(`CameraController: invalid mode "${mode}"`);
    }
    this._mode = mode;
  }

  toggleMode() {
    this._mode = this._mode === 'chase' ? 'cockpit' : 'chase';
  }

  /**
   * Immediately snap camera to target position (skip lerp)
   * @param {Object} car - car-like object with {x, y, angle}
   */
  snapTo(car) {
    this._targetPositionFor(this._mode, car, _target);
    this._camera.position.copy(_target);

    if (this._mode === 'cockpit') {
      const cos = Math.cos(car.angle);
      const sin = Math.sin(car.angle);
      _lookAt.set(
        car.x + cos * LOOK_AHEAD_DISTANCE,
        COCKPIT_HEIGHT,
        car.y + sin * LOOK_AHEAD_DISTANCE,
      );
    } else {
      _lookAt.set(car.x, 0, car.y);
    }
    this._camera.lookAt(_lookAt);
  }

  update(car) {
    this._targetPositionFor(this._mode, car, _target);
    this._camera.position.lerp(_target, this._lerp);

    // Chase: look at the car. Cockpit: look ahead along the heading
    // (otherwise a camera placed inside the car ends up looking back
    // at the chassis, which fills the screen).
    if (this._mode === 'cockpit') {
      const cos = Math.cos(car.angle);
      const sin = Math.sin(car.angle);
      _lookAt.set(
        car.x + cos * LOOK_AHEAD_DISTANCE,
        COCKPIT_HEIGHT,
        car.y + sin * LOOK_AHEAD_DISTANCE,
      );
    } else {
      _lookAt.set(car.x, 0, car.y);
    }
    this._camera.lookAt(_lookAt);
  }

  _targetPositionFor(mode, car, out) {
    const cos = Math.cos(car.angle);
    const sin = Math.sin(car.angle);

    if (mode === 'chase') {
      // behind the car (opposite of heading) at chase height
      out.set(
        car.x - cos * CHASE_DISTANCE,
        CHASE_HEIGHT,
        car.y - sin * CHASE_DISTANCE,
      );
    } else {
      // just ahead of the car at driver height
      out.set(
        car.x + cos * COCKPIT_FORWARD,
        COCKPIT_HEIGHT,
        car.y + sin * COCKPIT_FORWARD,
      );
    }
    return out;
  }
}
