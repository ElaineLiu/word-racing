import { describe, expect, it } from 'vitest';
import {
  calculateAccuracyBonus,
  calculateQuestionReward,
  getMasteryGroup,
} from '../config/reward-policy.js';

describe('reward and mastery policy', () => {
  it.each([
    ['PIT_BOARD', 'simple', 3],
    ['STRATEGY', 'simple', 3],
    ['RADIO_MSG', 'complex', 5],
    ['QUALIFYING', 'complex', 5],
  ])('maps %s to %s with %i fuel', (mode, group, fuel) => {
    expect(getMasteryGroup(mode)).toBe(group);
    expect(calculateQuestionReward({ mode })).toEqual({ fuel, gear: 0 });
  });

  it('uses originalMode for LAP_REVIEW', () => {
    expect(getMasteryGroup('LAP_REVIEW', 'RADIO_MSG')).toBe('complex');
    expect(calculateQuestionReward({ mode: 'LAP_REVIEW', originalMode: 'RADIO_MSG' }))
      .toEqual({ fuel: 5, gear: 0 });
  });

  it('does not reward unknown modes', () => {
    expect(getMasteryGroup('UNKNOWN')).toBeNull();
    expect(calculateQuestionReward({ mode: 'UNKNOWN' })).toEqual({ fuel: 0, gear: 0 });
  });

  it.each([
    [0, 0, 0], [5, 10, 0], [6, 10, 1], [7, 10, 1],
    [8, 10, 2], [9, 10, 2], [10, 10, 3],
  ])('awards accuracy bonus for %i/%i', (correct, total, gear) => {
    expect(calculateAccuracyBonus(correct, total)).toEqual({ fuel: 0, gear });
  });
});
