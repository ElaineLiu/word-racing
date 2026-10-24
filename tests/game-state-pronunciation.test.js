import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '../core/event-bus.js';
import { GameState } from '../core/game-state.js';

describe('pronunciation preference migration', () => {
  beforeEach(() => localStorage.clear());

  it('defaults new users to automatic pronunciation and version 5', () => {
    const state = new GameState(new EventBus(), 'new-user');
    expect(state.get('version')).toBe(5);
    expect(state.get('preferences.autoPronunciation')).toBe(true);
  });

  it('adds the preference to old saves without changing resources', () => {
    localStorage.setItem('wr_game_state_child', JSON.stringify({ version: 4, fuelCoins: 83, gearCoins: 4 }));
    const state = new GameState(new EventBus(), 'child');
    expect(state.get('version')).toBe(5);
    expect(state.get('preferences.autoPronunciation')).toBe(true);
    expect(state.get('fuelCoins')).toBe(83);
    expect(state.get('gearCoins')).toBe(4);
  });

  it('keeps each user setting isolated and preserves it through replace', () => {
    const bus = new EventBus();
    const a = new GameState(bus, 'a');
    const b = new GameState(bus, 'b');
    a.set('preferences.autoPronunciation', false);
    expect(new GameState(bus, 'a').get('preferences.autoPronunciation')).toBe(false);
    expect(b.get('preferences.autoPronunciation')).toBe(true);
    a.replace({ ...a.getAll(), preferences: { autoPronunciation: false } });
    expect(a.get('preferences.autoPronunciation')).toBe(false);
  });
});
