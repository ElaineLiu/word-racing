import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RenderSystem } from '../../rendering/render-system.js';

function createContextSpy() {
  const ctx = {
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
  };
  return ctx;
}

describe('RenderSystem results panel', () => {
  let originalGetContext;
  let ctx;

  beforeEach(() => {
    document.body.innerHTML = '<div id="page-race" class="active"></div>';
    ctx = createContextSpy();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx);
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    document.body.innerHTML = '';
  });

  it('3D 完赛面板不显示词汇和测验分数，并显示 Best Lap', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 920;
    canvas.height = 620;
    const renderSystem = new RenderSystem(canvas);
    renderSystem.setTrack({ type: '3d' });

    renderSystem.render('RESULTS', {
      trackType: '3d',
      finalRank: 4,
      raceTime: 84500,
      bestLapTime: Infinity,
      raceScore: 0,
      quizScore: 0,
      fuel: 34,
      maxFuel: 100,
      ranking: [
        { isPlayer: false, rank: 1 },
        { isPlayer: false, rank: 2 },
        { isPlayer: false, rank: 3 },
        { isPlayer: true, rank: 4 },
      ],
    });

    const labels = ctx.fillText.mock.calls.map(call => call[0]);
    expect(labels).toContain('Best Lap');
    expect(labels).toContain('1:24.50');
    expect(labels).not.toContain('Word Score');
    expect(labels).not.toContain('Quiz Score');
    expect(labels).not.toContain('Total Score');
  });
});
