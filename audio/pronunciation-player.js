import { audioPathForWord } from './audio-path.js';

/** Owns the single active pronunciation clip. Learning state never depends on playback. */
export class PronunciationPlayer {
  #audioFactory;
  #onError;
  #current = null;
  #automaticKeys = new Set();

  constructor({ audioFactory = src => new Audio(src), onError = error => console.warn('[Pronunciation]', error) } = {}) {
    this.#audioFactory = audioFactory;
    this.#onError = onError;
  }

  async play(word, { automatic = false, dedupeKey = null } = {}) {
    if (automatic && dedupeKey && this.#automaticKeys.has(dedupeKey)) return false;
    if (automatic && dedupeKey) this.#automaticKeys.add(dedupeKey);
    this.stop();
    try {
      const audio = this.#audioFactory(audioPathForWord(word));
      audio.preload = 'none';
      this.#current = audio;
      await audio.play();
      return true;
    } catch (error) {
      this.#current = null;
      this.#onError(error, word);
      return false;
    }
  }

  stop() {
    if (!this.#current) return;
    this.#current.pause();
    try { this.#current.currentTime = 0; } catch { /* Some browsers reject seeking before metadata. */ }
    this.#current = null;
  }
}
