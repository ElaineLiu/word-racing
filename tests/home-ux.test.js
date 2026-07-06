import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

function readIndexHtml() {
  return fs.readFileSync(path.join(root, 'index.html'), 'utf-8');
}

describe('Home UX information architecture', () => {
  it('uses a redesigned Home shell with one primary practice action', () => {
    const html = readIndexHtml();

    expect(html).toContain('class="home-hero"');
    expect(html).toContain('class="home-primary-action"');
    expect(html).toContain('Start Today\'s Practice');
    expect(html).toContain('Daily goal: 3 quizzes');
    expect(html).toContain('Earn fuel from practice, then spend it on the track.');
  });

  it('groups Home information into progress and race readiness cards', () => {
    const html = readIndexHtml();

    expect(html).toContain('class="home-dashboard"');
    expect(html).toContain('class="home-card home-progress-card"');
    expect(html).toContain('class="home-card home-race-card"');
    expect(html).not.toContain('class="home-secondary-grid"');
    expect(html).toContain('id="top-settings-btn"');
  });

  it('removes old duplicate Home stat wrappers from the static shell', () => {
    const html = readIndexHtml();

    expect(html).not.toContain('id="home-progress" class="progress-card"');
    expect(html).not.toContain('id="home-stats" class="stats-container"');
  });

  it('has settings button in top navigation', () => {
    const html = readIndexHtml();

    expect(html).toContain('id="top-settings-btn"');
    expect(html).toContain('id="settings-dropdown"');
  });
});
