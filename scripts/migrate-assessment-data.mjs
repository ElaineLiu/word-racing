import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { migrateProgress } from '../learning/assessment-policy.js';

// Writes a new backup; the source and historical evidence are never overwritten.
const [input, output] = process.argv.slice(2);
if (!input || !output || resolve(input) === resolve(output) || existsSync(output)) {
  throw new Error('Usage: node scripts/migrate-assessment-data.mjs INPUT.json NEW_OUTPUT.json (output must not exist)');
}
const words = JSON.parse(readFileSync(new URL('../data/words-shanghai-zhongkao.json', import.meta.url), 'utf8')).words;
const backup = JSON.parse(readFileSync(input, 'utf8'));
if (!backup.keys || typeof backup.keys !== 'object') throw new Error('Invalid backup: missing keys');
const summaries = [];
for (const key of Object.keys(backup.keys).filter(key => key.startsWith('wr_word_progress_'))) {
  const stored = JSON.parse(backup.keys[key]);
  const before = stored.progress || {};
  stored.progress = migrateProgress(before, words);
  stored.assessmentVersion = 1;
  const userId = key.slice('wr_word_progress_'.length);
  const rows = Object.values(stored.progress);
  const stateKey = `wr_game_state_${userId}`;
  if (backup.keys[stateKey]) {
    const state = JSON.parse(backup.keys[stateKey]);
    state.learning ??= {};
    state.learning.totalWordsMastered = rows.filter(p => p.status === 'mastered').length;
    backup.keys[stateKey] = JSON.stringify(state);
  }
  backup.keys[key] = JSON.stringify(stored);
  summaries.push({ userId, records: rows.length,
    remapped: rows.filter(p => p.available && p.legacyEvidence?.wordId !== p.wordId).length,
    archived: rows.filter(p => !p.available).length,
    pending: rows.filter(p => p.available && p.pendingVerification).length,
    stableMastery: rows.filter(p => p.status === 'mastered').length });
}
backup.assessmentMigration = { version: 1, migratedAt: new Date().toISOString(),
  sourceFile: input, summaries };
writeFileSync(output, JSON.stringify(backup, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ output, summaries }, null, 2));
