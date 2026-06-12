import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Minimap } from '../../ui/hud-3d/minimap.js';

function createContextSpy() {
  return {
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    strokeText: vi.fn(),
    set fillStyle(value) { this._fillStyle = value; },
    get fillStyle() { return this._fillStyle; },
    set strokeStyle(value) { this._strokeStyle = value; },
    get strokeStyle() { return this._strokeStyle; },
    set lineWidth(value) { this._lineWidth = value; },
    get lineWidth() { return this._lineWidth; },
  };
}

describe('Minimap', () => {
  let originalGetContext;
  let ctx;

  beforeEach(() => {
    document.body.innerHTML = '';
    ctx = createContextSpy();
    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx);
  });

  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    document.body.innerHTML = '';
  });

  it('应使用 3D 赛车的 x/y 坐标绘制玩家位置', () => {
    const parent = document.createElement('div');
    document.body.appendChild(parent);
    const minimap = new Minimap(parent, {
      centerline: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 },
      ],
    });

    minimap.update({
      playerPos: { x: 50, y: 50 },
      aiPositions: [],
    });

    expect(ctx.arc).toHaveBeenCalledWith(80, 60, 5, 0, Math.PI * 2);

    minimap.destroy();
  });
});
