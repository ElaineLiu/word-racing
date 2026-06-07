import * as THREE from 'three';

const CHASE_DISTANCE = 50;
const CHASE_HEIGHT = 20;
const COCKPIT_FORWARD = 1;
const COCKPIT_HEIGHT = 3;

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

  update(car) {
    this._targetPositionFor(this._mode, car, _target);
    this._camera.position.lerp(_target, this._lerp);

    _lookAt.set(car.x, 0, car.y);
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
