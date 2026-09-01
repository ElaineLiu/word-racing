import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_PATH = join(ROOT, 'data', 'wordsets-config.json');
const strict = process.argv.includes('--strict');
const errors = [];
const warnings = [];

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
  const ids = new Set();

  if (!sets.length) errors.push('wordSets must contain at least one entry');
  if (!sets.some(set => set.id === config.defaultWordSet)) {
    errors.push(`defaultWordSet does not exist: ${config.defaultWordSet}`);
  }

  for (const set of sets) {
    if (!set.id || ids.has(set.id)) errors.push(`duplicate or empty wordset id: ${set.id}`);
    ids.add(set.id);

    const dataPath = join(ROOT, set.file || '');
    if (!set.file || !existsSync(dataPath)) {
      const message = `missing wordset file for ${set.id}: ${set.file}`;
      (strict ? errors : warnings).push(message);
      continue;
    }

    const data = readJson(dataPath);
    if (!data) continue;
    if (!Array.isArray(data.words)) {
      errors.push(`${set.id}: data.words must be an array`);
      continue;
    }
    if (data.words.length !== set.totalWords) {
      errors.push(`${set.id}: expected ${set.totalWords} words, found ${data.words.length}`);
    }
  }
}

for (const warning of warnings) console.warn(`[wordsets] WARNING: ${warning}`);
for (const error of errors) console.error(`[wordsets] ERROR: ${error}`);

if (errors.length) process.exitCode = 1;
else console.log(`[wordsets] Validation passed${warnings.length ? ` with ${warnings.length} warning(s)` : ''}.`);
