import { describe, it, expect } from 'vitest';
import { createMockGameState } from '../../3d/utils/test-fixtures.js';

describe('createMockGameState', () => {
  it('returns a mock GameState shaped like the real one', () => {
    const s = createMockGameState();

    expect(typeof s.fuel).toBe('number');
    expect(typeof s.fuelCoins).toBe('number');
    expect(typeof s.gearCoins).toBe('number');
    expect(s.upgrades).toMatchObject({ engine: expect.any(Number), tire: expect.any(Number), body: expect.any(Number) });
    expect(s.learning).toBeDefined();
    expect(Array.isArray(s.unlockedTracks)).toBe(true);
  });

  it('meets the 3D track unlock threshold (mastery >= 200)', () => {
    const s = createMockGameState();
    expect(s.learning.totalWordsMastered).toBeGreaterThanOrEqual(200);
  });

  it('has enough fuel for a race', () => {
    const s = createMockGameState();
    expect(s.fuel).toBeGreaterThan(0);
    expect(s.fuelCoins).toBeGreaterThan(0);
  });

  it('exposes the 3D track as already unlocked', () => {
    const s = createMockGameState();
    expect(s.unlockedTracks).toContain('shanghai-3d');
  });

  it('provides at least 30 words in wordsFixture', () => {
    const s = createMockGameState();
    expect(s.wordsFixture.length).toBeGreaterThanOrEqual(30);
  });

  it('wordsFixture covers every status the bubble system needs', () => {
    const s = createMockGameState();
    const statuses = new Set(s.wordsFixture.map(w => w.status));
    expect(statuses.has('exposed')).toBe(true);
    expect(statuses.has('simple_passed')).toBe(true);
    expect(statuses.has('complex_passed')).toBe(true);
    expect(statuses.has('mastered')).toBe(true);
  });

  it('each word has the required fields with exposureCount initialized to 0', () => {
    const s = createMockGameState();
    for (const w of s.wordsFixture) {
      expect(w).toMatchObject({
        id: expect.any(Number),
        en: expect.any(String),
        zh: expect.any(String),
        status: expect.any(String),
        exposureCount: 0,
      });
    }
  });

  it('returns a fresh object on each call (no shared mutable state)', () => {
    const a = createMockGameState();
    const b = createMockGameState();
    a.fuelCoins = 9999;
    a.wordsFixture[0].exposureCount = 42;
    expect(b.fuelCoins).not.toBe(9999);
    expect(b.wordsFixture[0].exposureCount).toBe(0);
  });
});
