export const PRONUNCIATION_VOICE = 'en-GB-RyanNeural';
export const PRONUNCIATION_RATE = '-10%';

export function audioFilenameForWord(word) {
  const id = Number(word?.id);
  if (!Number.isInteger(id) || id < 1) throw new Error('Pronunciation audio requires a positive word id');
  return `${String(id).padStart(4, '0')}.mp3`;
}

export function audioPathForWord(word) {
  return `assets/audio/words/${PRONUNCIATION_VOICE}/${audioFilenameForWord(word)}`;
}
