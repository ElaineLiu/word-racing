import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../../3d/controllers/camera-controller.js';

function makeCamera() {
  return new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
}

// Run update many times so lerp converges close to target.
function settle(controller, car, iterations = 200) {
  for (let i = 0; i < iterations; i++) controller.update(car);
}

describe('CameraController', () => {
  let camera;
  let controller;

  beforeEach(() => {
    camera = makeCamera();
    controller = new CameraController(camera);
  });

  it('defaults to chase mode', () => {
    expect(controller.mode).toBe('chase');
  });

  it('toggleMode() flips between chase and cockpit', () => {
    expect(controller.mode).toBe('chase');
    controller.toggleMode();
    expect(controller.mode).toBe('cockpit');
    controller.toggleMode();
    expect(controller.mode).toBe('chase');
  });

  it('setMode("cockpit") switches mode; setMode("invalid") throws', () => {
    controller.setMode('cockpit');
    expect(controller.mode).toBe('cockpit');
    controller.setMode('chase');
    expect(controller.mode).toBe('chase');
    expect(() => controller.setMode('invalid')).toThrow();
  });

  it('chase mode converges camera behind and above the car', () => {
    // car at origin facing +x (angle 0 means heading along +x axis)
    const car = { x: 0, y: 0, angle: 0 };
    settle(controller, car);

    // Expected chase target: 50 units behind car (opposite of heading),
    // 20 units above. With car facing +x (heading +x), behind is -x.
    // 2D y maps to 3D z.
    expect(camera.position.x).toBeCloseTo(-50, 0);
    expect(camera.position.y).toBeCloseTo(20, 0);
    expect(camera.position.z).toBeCloseTo(0, 0);
  });

  it('cockpit mode converges camera near car position with height 3', () => {
    controller.setMode('cockpit');
    const car = { x: 0, y: 0, angle: 0 };
    settle(controller, car);

    // Cockpit: slightly in front of the car (1 unit along heading) at height 3.
    expect(camera.position.x).toBeCloseTo(1, 0);
    expect(camera.position.y).toBeCloseTo(3, 0);
    expect(camera.position.z).toBeCloseTo(0, 0);
  });

  it('update() points the camera toward (or along) the car heading', () => {
    const car = { x: 0, y: 0, angle: 0 };
    settle(controller, car);

    // After settling in chase, camera should look toward the car (origin),
    // which from (-50, 20, 0) means looking roughly +x and slightly -y.
    // Forward vector derived from camera quaternion:
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    expect(forward.x).toBeGreaterThan(0.8); // strongly +x
  });

  it('cockpit mode looks along the heading, not back at the car', () => {
    controller.setMode('cockpit');
    const car = { x: 0, y: 0, angle: 0 };
    settle(controller, car);

    // Cockpit sits at ~(1, 3, 0) facing along +x. The forward vector
    // must point ahead (+x), NOT back at the chassis (-x). The bug
    // that caused the box to fill the screen was: forward.x < 0.
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    expect(forward.x).toBeGreaterThan(0.9);
    expect(Math.abs(forward.y)).toBeLessThan(0.1); // roughly horizontal
  });

  it('a single update does not snap to target (lerp factor applies)', () => {
    const car = { x: 0, y: 0, angle: 0 };
    // Move camera to a known non-target spot first
    camera.position.set(0, 0, 0);
    controller.update(car);

    // Target in chase is (-50, 20, 0). After ONE update with lerp 0.1,
    // camera should have moved only a fraction toward the target.
    expect(camera.position.x).toBeGreaterThan(-50);
    expect(camera.position.x).toBeLessThan(0);
    expect(camera.position.y).toBeGreaterThan(0);
    expect(camera.position.y).toBeLessThan(20);
  });

  it('snapTo() immediately positions camera at target (no lerp)', () => {
    const car = { x: 0, y: 0, angle: 0 };
    // Move camera to a known non-target spot first
    camera.position.set(0, 0, 0);

    // snapTo should immediately jump to target position
    controller.snapTo(car);

    // In chase mode: 50 units behind, 20 units high
    expect(camera.position.x).toBeCloseTo(-50, 0);
    expect(camera.position.y).toBeCloseTo(20, 0);
    expect(camera.position.z).toBeCloseTo(0, 0);
  });

  it('snapTo() works in cockpit mode', () => {
    controller.setMode('cockpit');
    const car = { x: 0, y: 0, angle: 0 };
    camera.position.set(0, 0, 0);

    controller.snapTo(car);

    // Cockpit: 1 unit ahead, height 3
    expect(camera.position.x).toBeCloseTo(1, 0);
    expect(camera.position.y).toBeCloseTo(3, 0);
    expect(camera.position.z).toBeCloseTo(0, 0);
  });
});
