import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PronunciationPlayer } from '../audio/pronunciation-player.js';
import { audioPathForWord } from '../audio/audio-path.js';

function audioHarness() {
  const instances = [];
  const factory = src => {
    const audio = {
      src,
      preload: '',
      currentTime: 9,
      pause: vi.fn(),
      play: vi.fn().mockResolvedValue(undefined),
    };
    instances.push(audio);
    return audio;
  };
  return { factory, instances };
}

describe('PronunciationPlayer', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('builds a stable offline path from the word id', () => {
    expect(audioPathForWord({ id: 7, word: 'close' }))
      .toBe('assets/audio/words/en-GB-RyanNeural/0007.mp3');
  });

  it('plays only once for the same automatic render key', async () => {
    const h = audioHarness();
    const player = new PronunciationPlayer({ audioFactory: h.factory });
    await player.play({ id: 7, word: 'close' }, { automatic: true, dedupeKey: 'task-1:intro' });
    await player.play({ id: 7, word: 'close' }, { automatic: true, dedupeKey: 'task-1:intro' });
    expect(h.instances).toHaveLength(1);
    expect(h.instances[0].preload).toBe('none');
    expect(h.instances[0].play).toHaveBeenCalledTimes(1);
  });

  it('lets manual playback repeat and stops the previous clip', async () => {
    const h = audioHarness();
    const player = new PronunciationPlayer({ audioFactory: h.factory });
    await player.play({ id: 7, word: 'close' }, { automatic: false });
    await player.play({ id: 7, word: 'close' }, { automatic: false });
    expect(h.instances).toHaveLength(2);
    expect(h.instances[0].pause).toHaveBeenCalledTimes(1);
    expect(h.instances[0].currentTime).toBe(0);
  });

  it('reports playback errors without throwing into the learning flow', async () => {
    const onError = vi.fn();
    const player = new PronunciationPlayer({
      audioFactory: src => ({ src, pause: vi.fn(), play: vi.fn().mockRejectedValue(new Error('blocked')) }),
      onError,
    });
    await expect(player.play({ id: 1, word: 'apple' }, { automatic: true, dedupeKey: 'a' }))
      .resolves.toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('uses the browser Audio implementation and default warning handler', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('Audio', vi.fn(() => ({ pause: vi.fn(), play: vi.fn().mockRejectedValue(new Error('media')) })));
    const player = new PronunciationPlayer();
    await expect(player.play({ id: 2, word: 'able' })).resolves.toBe(false);
    expect(Audio).toHaveBeenCalledWith('assets/audio/words/en-GB-RyanNeural/0002.mp3');
    expect(warn).toHaveBeenCalledWith('[Pronunciation]', expect.any(Error));
  });

  it('rejects invalid word ids before creating an audio element', () => {
    expect(() => audioPathForWord({ id: 0, word: 'invalid' })).toThrow('positive word id');
  });
});
