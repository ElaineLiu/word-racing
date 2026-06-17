import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ACHIEVEMENTS } from '../config/achievements.js';
import { TRACK_REGISTRY } from '../config/track-registry.js';

const root = path.resolve(__dirname, '..');
const hanRegex = /[\p{Script=Han}]/u;

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('English UI copy', () => {
  it('uses English labels in the static page shell', () => {
    const html = readProjectFile('index.html');

    expect(html).toContain('Garage');
    expect(html).toContain("Start Today's Practice");
    expect(html).toContain('Progress Report');
    expect(html).toContain('Achievements');
    expect(html).toContain("I'm not sure");
    expect(html).toContain('Got it. Continue');

    [
      '成就',
      '重置每日答题限制',
      '学习进度报告',
      '累计统计',
      '今日进度',
      '错词列表',
      '单词详情',
    ].forEach(copy => {
      expect(html).not.toContain(copy);
    });
  });

  it('uses English achievement display copy', () => {
    Object.values(ACHIEVEMENTS).forEach(achievement => {
      expect(achievement.name).not.toMatch(hanRegex);
      expect(achievement.description).not.toMatch(hanRegex);
    });
  });

  it('uses English track display copy', () => {
    Object.values(TRACK_REGISTRY).forEach(track => {
      expect(track.name).not.toMatch(hanRegex);
      expect(track.description).not.toMatch(hanRegex);
    });
  });

  it('keeps Garage track state copy in English', () => {
    const source = readProjectFile('views/shop-view.js');

    ['Locked', 'Selected', 'Select', 'Fuel Coins'].forEach(copy => {
      expect(source).toContain(copy);
    });

    ["'未解锁'", "'已选择'", "'选择'"].forEach(copy => {
      expect(source).not.toContain(copy);
    });
  });
});
