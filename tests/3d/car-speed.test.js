import { beforeEach, describe, expect, it } from 'vitest';
import { Car } from '../../js/car.js';
import { Car3D } from '../../3d/core/car-3d.js';

// An unobstructed straight isolates acceleration from corners and collisions.
const straight = {
  canvasSize: { width: 100000, height: 100000 },
  isOnTrack: () => true,
  getProgress: () => 0,
  getNearestDistance: () => 0,
};

function drive(car, seconds, fps = 60, track = straight) {
  for (let i = 0; i < Math.round(seconds * fps); i++) {
    car.update(track, 3, 1 / fps);
  }
}

function secondsToSpeed(car, targetKmh, fps = 60, maxSeconds = 60) {
  let frames = 0;
  while (car.getDisplaySpeed() < targetKmh && frames < maxSeconds * fps) {
    car.update(straight, 3, 1 / fps);
    frames++;
  }
  return frames / fps;
}

describe('3D speed tuning', () => {
  beforeEach(() => localStorage.clear());

  it.each([30, 60, 120])('reaches about 100 km/h in 3 seconds at %i fps', fps => {
    const car = new Car3D(100, 100, 0);
    car.input.up = true;
    drive(car, 3, fps);
    expect(car.x).toBeGreaterThan(100);
    expect(car.getDisplaySpeed()).toBeGreaterThanOrEqual(95);
    expect(car.getDisplaySpeed()).toBeLessThanOrEqual(107);
  });

  it.each([30, 60, 120])('accelerates progressively slower and never exceeds 300 km/h at %i fps', fps => {
    const car = new Car3D(100, 100, 0);
    car.input.up = true;
    const zeroTo100 = secondsToSpeed(car, 100, fps);
    const hundredTo200 = secondsToSpeed(car, 200, fps);
    const twoHundredTo280 = secondsToSpeed(car, 280, fps);
    expect(hundredTo200).toBeGreaterThan(zeroTo100);
    expect(twoHundredTo280).toBeGreaterThan(hundredTo200);
    drive(car, 30, fps);
    expect(car.getDisplaySpeed()).toBeGreaterThanOrEqual(298);
    expect(car.speed * 50).toBeLessThanOrEqual(300);
    expect(car.getGear()).toBe(6);
  });

  it('still slows down off the road even with full throttle', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 4;
    car.input.up = true;
    drive(car, 0.1, 60, { ...straight, isOnTrack: () => false });
    expect(car.speed).toBeLessThan(4);
  });

  it('keeps meaningful momentum when the throttle is released', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 4;
    drive(car, 1);
    expect(car.getDisplaySpeed()).toBeGreaterThan(170);
    expect(car.getDisplaySpeed()).toBeLessThan(200);
    drive(car, 5);
    expect(car.getDisplaySpeed()).toBeGreaterThan(80);
    expect(car.getDisplaySpeed()).toBeLessThan(170);
    car.input.up = true;
    drive(car, 2);
    expect(car.getDisplaySpeed()).toBeGreaterThan(150);
  });

  it('brakes to a stop without accidentally selecting reverse', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 4;
    car.input.down = true;
    drive(car, 0.1);
    expect(car.speed).toBeGreaterThan(0);
    expect(car.speed).toBeLessThan(4);
    drive(car, 2);
    expect(car.speed).toBe(0);
    drive(car, 1);
    expect(car.speed).toBe(0);
  });

  it('selects reverse only after the brake is released and pressed again', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 2;
    car.input.down = true;
    drive(car, 2);
    expect(car.speed).toBe(0);
    car.input.down = false;
    drive(car, 0.2);
    expect(car.speed).toBe(0);
    car.input.down = true;
    drive(car, 1);
    expect(car.speed).toBeLessThan(0);
    expect(car.getDisplaySpeed()).toBeLessThanOrEqual(25);
  });

  it('reduces steering authority as speed rises', () => {
    const medium = new Car3D(100, 100, 0);
    medium.speed = 2;
    medium.input.right = true;
    drive(medium, 1);

    const fast = new Car3D(100, 100, 0);
    fast.speed = 5.5;
    fast.input.right = true;
    drive(fast, 1);

    expect(fast.angle).toBeGreaterThan(0);
    expect(fast.angle).toBeLessThan(medium.angle * 0.7);
  });

  it('keeps the 400 km/h nitro ceiling and returns to 300 when it expires', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 6;
    car.nitroCharges = 1;
    car.input.up = true;
    car.input.nitro = true;
    drive(car, 2);
    expect(car.nitroCharges).toBe(0);
    expect(car.nitroActive).toBe(true);
    expect(car.getDisplaySpeed()).toBeGreaterThan(300);
    expect(car.getDisplaySpeed()).toBeLessThanOrEqual(400);
    drive(car, 3);
    expect(car.nitroActive).toBe(false);
    expect(car.getDisplaySpeed()).toBeLessThanOrEqual(300);
  });

  it('restores the normal limit after a temporary boost and after reset', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 6;
    car.input.up = true;
    car.applySpeedBoost(1.5, 6);
    drive(car, 5);
    expect(car.getDisplaySpeed()).toBeGreaterThan(380);
    expect(car.getDisplaySpeed()).toBeLessThanOrEqual(450);
    expect(car.maxSpeed).toBe(6);
    drive(car, 2);
    expect(car.getDisplaySpeed()).toBe(300);
    car.reset(100, 100, 0);
    expect(car.getDisplaySpeed()).toBe(0);
    expect(car.speedBoostTimer).toBe(0);
    drive(car, 3);
    expect(car.getDisplaySpeed()).toBeGreaterThanOrEqual(95);
    expect(car.getDisplaySpeed()).toBeLessThanOrEqual(105);
  });

  it('preserves the original 2D acceleration, friction, and ceiling', () => {
    const car = new Car(100, 100, 0);
    car.input.up = true;
    drive(car, 0.5);
    expect(car.getDisplaySpeed()).toBe(100);
    drive(car, 3);
    expect(car.maxSpeed).toBe(4);
    expect(car.speed).toBeCloseTo(3.952, 6);
    expect(car.acceleration).toBe(0.08);
  });
});
