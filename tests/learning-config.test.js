import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUESTION_MODES,
  QUESTION_MODES,
  isComplexMode,
  isSimpleMode,
} from '../config/learning-config.js';

describe('learning-config - mastery and default distribution separation', () => {
  it('classifies all supported mastery modes', () => {
    expect(QUESTION_MODES.SIMPLE).toEqual(['PIT_BOARD', 'STRATEGY']);
    expect(QUESTION_MODES.COMPLEX).toEqual(['RADIO_MSG', 'QUALIFYING']);
    expect(isSimpleMode('STRATEGY')).toBe(true);
    expect(isComplexMode('QUALIFYING')).toBe(true);
  });

  it('keeps QUALIFYING out of the default adaptive distribution', () => {
    expect(DEFAULT_QUESTION_MODES.COMPLEX).toEqual(['RADIO_MSG']);
    expect(DEFAULT_QUESTION_MODES.COMPLEX).not.toContain('QUALIFYING');
  });
});
