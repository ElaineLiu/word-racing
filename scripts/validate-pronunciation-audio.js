import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const voice = 'en-GB-RyanNeural';
const folder = join(root, 'assets', 'audio', 'words', voice);
const words = JSON.parse(readFileSync(join(root, 'data', 'words-shanghai-zhongkao.json'), 'utf8')).words;
const errors = [];
let manifest;
try { manifest = JSON.parse(readFileSync(join(folder, 'manifest.json'), 'utf8')); }
catch (error) { errors.push(`manifest: ${error.message}`); }

if (manifest) {
  if (manifest.voice !== voice) errors.push(`manifest voice must be ${voice}`);
  if (manifest.total !== words.length) errors.push(`manifest total ${manifest.total} does not match ${words.length}`);
  const byId = new Map((manifest.entries || []).map(entry => [entry.id, entry]));
  for (const word of words) {
    const filename = `${String(word.id).padStart(4, '0')}.mp3`;
    const entry = byId.get(word.id);
    if (!entry || entry.word !== word.word || entry.file !== filename) errors.push(`manifest mismatch for ${word.id} ${word.word}`);
    const path = join(folder, filename);
    if (!existsSync(path)) errors.push(`missing ${filename} for ${word.word}`);
    else if (statSync(path).size <= 1000) errors.push(`invalid ${filename} for ${word.word}`);
  }
}

if (errors.length) {
  console.error(errors.slice(0, 30).join('\n'));
  if (errors.length > 30) console.error(`...and ${errors.length - 30} more`);
  process.exit(1);
}
console.log(`Pronunciation audio valid: ${words.length} words, ${voice}`);
