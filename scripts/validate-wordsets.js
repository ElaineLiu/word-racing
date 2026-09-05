import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(ROOT, 'data', 'wordsets-config.json');
const DEFAULT_ID = 'shanghai-zhongkao';
const EXPECTED_FILE = normalize('data/words-shanghai-zhongkao.json');
const EXPECTED_COUNT = 1639;
const REQUIRED_FIELDS = ['id', 'word', 'meaning_cn', 'phonetic', 'level', 'category', 'pos', 'source2025'];
const errors = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    errors.push(`${path}: ${error.message}`);
    return null;
  }
}

const config = readJson(CONFIG_PATH);
if (config) {
  const sets = Array.isArray(config.wordSets) ? config.wordSets : [];

  if (config.defaultWordSet !== DEFAULT_ID) {
    errors.push(`defaultWordSet must be ${DEFAULT_ID}`);
  }
  if (sets.length !== 1) {
    errors.push(`wordSets must contain exactly one entry, found ${sets.length}`);
  }

  const set = sets[0];
  if (set) {
    if (set.id !== DEFAULT_ID) errors.push(`runtime wordset id must be ${DEFAULT_ID}`);
    if (normalize(set.file || '') !== EXPECTED_FILE) {
      errors.push(`runtime wordset file must be ${EXPECTED_FILE}`);
    }
    if (set.totalWords !== EXPECTED_COUNT) {
      errors.push(`configured totalWords must be ${EXPECTED_COUNT}`);
    }

    const dataPath = join(ROOT, set.file || '');
    if (!set.file || !existsSync(dataPath)) {
      errors.push(`missing runtime wordset file: ${set.file}`);
    } else {
      const data = readJson(dataPath);
      const words = data?.words;
      if (!Array.isArray(words)) {
        errors.push(`${set.id}: data.words must be an array`);
      } else {
        if (words.length !== EXPECTED_COUNT) {
          errors.push(`${set.id}: expected ${EXPECTED_COUNT} words, found ${words.length}`);
        }

        const ids = new Set();
        const exactWords = new Set();
        words.forEach((word, index) => {
          if (ids.has(word.id)) errors.push(`${set.id}: duplicate word id ${word.id} at index ${index}`);
          ids.add(word.id);
          if (exactWords.has(word.word)) errors.push(`${set.id}: duplicate exact word ${word.word} at index ${index}`);
          exactWords.add(word.word);
          for (const field of REQUIRED_FIELDS) {
            const value = word[field];
            if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
              errors.push(`${set.id}: missing ${field} at index ${index}`);
            }
          }
        });
        if (data?.meta?.total_words !== EXPECTED_COUNT) {
          errors.push(`${set.id}: meta.total_words must be ${EXPECTED_COUNT}`);
        }
      }
    }
  }
}

for (const error of errors) console.error(`[wordsets] ERROR: ${error}`);
if (errors.length) process.exitCode = 1;
else console.log(`[wordsets] Validation passed: ${DEFAULT_ID} (${EXPECTED_COUNT} words, unique IDs).`);
