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

describe('3D speed tuning', () => {
  beforeEach(() => localStorage.clear());

  it.each([30, 60, 120])('starts and reaches 100 km/h in 3 seconds at %i fps', fps => {
    const car = new Car3D(100, 100, 0);
    car.input.up = true;
    drive(car, 1, fps);
    expect(car.x).toBeGreaterThan(100);
    expect(car.getDisplaySpeed()).toBe(33);
    drive(car, 1, fps);
    expect(car.getDisplaySpeed()).toBe(67);
    drive(car, 1, fps);
    expect(car.speed * 50).toBeCloseTo(100, 6);
  });

  it.each([30, 60, 120])('reaches and holds 300 km/h at %i fps', fps => {
    const car = new Car3D(100, 100, 0);
    car.input.up = true;
    drive(car, 6, fps);
    expect(car.getDisplaySpeed()).toBe(200);
    drive(car, 3, fps);
    expect(car.getDisplaySpeed()).toBe(300);
    drive(car, 3, fps);
    expect(car.speed * 50).toBeCloseTo(300, 6);
    expect(car.getGear()).toBe(6);
    expect(car.getRPM()).toBeCloseTo(8000);
  });

  it('still slows down off the road even with full throttle', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 4;
    car.input.up = true;
    drive(car, 0.1, 60, { ...straight, isOnTrack: () => false });
    expect(car.speed).toBeLessThan(4);
  });

  it('coasts to a complete stop and can start again', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 6;
    drive(car, 1);
    expect(car.speed).toBe(0);
    car.input.up = true;
    drive(car, 3);
    expect(car.getDisplaySpeed()).toBe(100);
  });

  it('brakes and reverses without exceeding the existing reverse limit', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 6;
    car.input.down = true;
    drive(car, 0.1);
    expect(car.speed).toBeGreaterThan(0);
    expect(car.speed).toBeLessThan(6);
    drive(car, 2);
    expect(car.speed).toBeLessThan(0);
    expect(car.speed).toBeGreaterThanOrEqual(-1.5);
  });

  it('keeps the 400 km/h nitro ceiling and returns to 300 when it expires', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 6;
    car.nitroCharges = 1;
    car.input.up = true;
    car.input.nitro = true;
    drive(car, 1);
    expect(car.nitroCharges).toBe(0);
    expect(car.nitroActive).toBe(true);
    expect(car.getDisplaySpeed()).toBe(400);
    drive(car, 3);
    expect(car.nitroActive).toBe(false);
    expect(car.getDisplaySpeed()).toBe(300);
  });

  it('restores the normal limit after a temporary boost and after reset', () => {
    const car = new Car3D(100, 100, 0);
    car.speed = 6;
    car.input.up = true;
    car.applySpeedBoost(1.5, 6);
    drive(car, 5);
    expect(car.getDisplaySpeed()).toBe(450);
    expect(car.maxSpeed).toBe(6);
    drive(car, 2);
    expect(car.getDisplaySpeed()).toBe(300);
    car.reset(100, 100, 0);
    expect(car.getDisplaySpeed()).toBe(0);
    expect(car.speedBoostTimer).toBe(0);
    drive(car, 3);
    expect(car.getDisplaySpeed()).toBe(100);
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
