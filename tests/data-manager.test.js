/**
 * DataManager 单元测试
 *
 * 覆盖：模式检测、导入/导出、数据还原、模式切换、事件
 * 通过 public API 测试（私有方法通过 importData/exportData 间接验证）
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DataManager } from '../core/data-manager.js';
import { EventBus } from '../core/event-bus.js';

describe('DataManager', () => {
  let dm;
  let eventBus;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    eventBus = new EventBus();
    dm = new DataManager(eventBus);
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ─── 模式检测 ─────────────────────────────────────────────────

  describe('mode detection', () => {
    it('should default to localStorage mode', () => {
      expect(dm.mode).toBe('localStorage');
      expect(dm.isFileSystemMode).toBe(false);
    });

    it('should detect File System API support availability', () => {
      const supported = DataManager.isFileSystemAPISupported();
      expect(typeof supported).toBe('boolean');
    });
  });

  // ─── 导入/导出（数据收集与还原的间接验证）───────────────────

  describe('export and import', () => {
    it('should import data into localStorage and clear old wr_ keys', async () => {
      localStorage.setItem('wr_game_state_001', 'old data');
      localStorage.setItem('wr_word_progress_001', 'old progress');
      localStorage.setItem('wr_legacy_key', 'should be removed');
      localStorage.setItem('keep_this', 'keep');

      await dm.init();

      const importData = {
        version: 1,
        exportedAt: '2026-07-15T00:00:00.000Z',
        keys: {
          'wr_new_key': 'fresh data',
          'wr_game_state_default': JSON.stringify({ fuel: 200 }),
        },
      };

      const file = new File([JSON.stringify(importData)], 'data.json', { type: 'application/json' });
      await dm.importData(file);

      // 新数据写入
      expect(localStorage.getItem('wr_new_key')).toBe('fresh data');
      expect(localStorage.getItem('wr_game_state_default')).toBe(JSON.stringify({ fuel: 200 }));
      // 旧 wr_ 键清除
      expect(localStorage.getItem('wr_game_state_001')).toBeNull();
      expect(localStorage.getItem('wr_word_progress_001')).toBeNull();
      expect(localStorage.getItem('wr_legacy_key')).toBeNull();
      // 非 wr_ 键保留
      expect(localStorage.getItem('keep_this')).toBe('keep');
    });

    it('should reject invalid JSON file', async () => {
      await dm.init();
      const badFile = new File(['not json'], 'bad.json', { type: 'application/json' });
      await expect(dm.importData(badFile)).rejects.toThrow();
    });

    it('should reject file without keys field', async () => {
      await dm.init();
      const missingKeys = new File(
        [JSON.stringify({ version: 1 })],
        'missing.json',
        { type: 'application/json' }
      );
      await expect(dm.importData(missingKeys)).rejects.toThrow('Invalid data format');
    });

    it('should not leak non-wr keys on import', async () => {
      localStorage.setItem('keep_me', 'preserved');
      await dm.init();

      const importData = {
        version: 1,
        keys: { 'wr_only': 'data' },
      };
      const file = new File([JSON.stringify(importData)], 'd.json', { type: 'application/json' });
      await dm.importData(file);

      expect(localStorage.getItem('wr_only')).toBe('data');
      expect(localStorage.getItem('keep_me')).toBe('preserved');
    });
  });

  // ─── File System API ──────────────────────────────────────────

  describe('File System API (mocked)', () => {
    let mockHandle;
    let mockWritable;

    beforeEach(() => {
      mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      mockHandle = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
        getFile: vi.fn(),
        queryPermission: vi.fn().mockResolvedValue('granted'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
      };

      window.showSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);
    });

    afterEach(() => {
      delete window.showSaveFilePicker;
    });

    it('should detect File System API when showSaveFilePicker exists', () => {
      expect(DataManager.isFileSystemAPISupported()).toBe(true);
    });

    it('should enable auto-save mode', async () => {
      localStorage.setItem('wr_test', 'data');
      await dm.init();
      const result = await dm.enableAutoSave();

      expect(result).toBe(true);
      expect(dm.mode).toBe('file-system');
      expect(dm.isFileSystemMode).toBe(true);
      expect(mockHandle.createWritable).toHaveBeenCalled();
      expect(mockWritable.write).toHaveBeenCalled();
    });

    it('should disable auto-save and return to localStorage mode', async () => {
      localStorage.setItem('wr_test', 'data');
      await dm.enableAutoSave();
      expect(dm.mode).toBe('file-system');

      await dm.disableAutoSave();
      expect(dm.mode).toBe('localStorage');
      expect(dm.isFileSystemMode).toBe(false);
    });

    it('should write current data when enabling auto-save', async () => {
      localStorage.setItem('wr_game_state', JSON.stringify({ fuel: 50 }));
      localStorage.setItem('wr_word_progress', JSON.stringify({ words: 10 }));
      localStorage.setItem('ignore_this', 1);
      await dm.init();
      await dm.enableAutoSave();

      // 验证写入的数据只包含 wr_ 键
      const writtenJson = mockWritable.write.mock.calls[0][0];
      const written = JSON.parse(writtenJson);
      expect(written.keys).toHaveProperty('wr_game_state');
      expect(written.keys).toHaveProperty('wr_word_progress');
      expect(written.keys).not.toHaveProperty('ignore_this');
    });
  });

  // ─── 模式变更事件 ─────────────────────────────────────────────

  describe('events', () => {
    it('should emit data:mode-changed on init', async () => {
      const spy = vi.fn();
      eventBus.on('data:mode-changed', spy);
      await dm.init();
      expect(spy).toHaveBeenCalledWith({ mode: 'localStorage' });
    });

    it('should emit data:mode-changed when enabling auto-save', async () => {
      window.showSaveFilePicker = vi.fn().mockResolvedValue({
        createWritable: vi.fn().mockResolvedValue({
          write: vi.fn().mockResolvedValue(),
          close: vi.fn().mockResolvedValue(),
        }),
        queryPermission: vi.fn().mockResolvedValue('granted'),
        requestPermission: vi.fn().mockResolvedValue('granted'),
      });

      localStorage.setItem('wr_test', '1');
      const spy = vi.fn();
      eventBus.on('data:mode-changed', spy);
      await dm.init();
      spy.mockClear();

      await dm.enableAutoSave();
      expect(spy).toHaveBeenCalledWith({ mode: 'file-system' });
      delete window.showSaveFilePicker;
    });
  });

  // ─── scheduleSave ─────────────────────────────────────────────

  describe('scheduleSave', () => {
    it('should not throw when called in localStorage mode', () => {
      expect(() => dm.scheduleSave()).not.toThrow();
    });
  });
});
