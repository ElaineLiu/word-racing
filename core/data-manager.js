/**
 * DataManager - 用户数据文件持久化管理
 *
 * 两种模式：
 *   file-system: 使用 File System Access API 自动读写本地 JSON 文件
 *   localStorage: 传统 localStorage（降级方案）
 *
 * 导出/导入在所有模式下都可用。
 */

const DB_NAME = 'word-racing-fs';
const DB_VERSION = 1;
const STORE_NAME = 'handles';
const HANDLE_KEY = 'data-file';
const DATA_PREFIX = 'wr_';

export class DataManager {
  #eventBus;
  #fileHandle = null;
  #mode = 'localStorage'; // 'file-system' | 'localStorage'
  #saveScheduled = false;
  #saveTimer = null;

  constructor(eventBus) {
    this.#eventBus = eventBus;
  }

  get mode() { return this.#mode; }
  get isFileSystemMode() { return this.#mode === 'file-system'; }

  // ─── 初始化 ──────────────────────────────────────────────────

  async init() {
    await this.#restoreHandle();

    if (this.#fileHandle) {
      const loaded = await this.#loadFromHandle();
      if (loaded) {
        this.#mode = 'file-system';
      } else {
        this.#fileHandle = null;
        await this.#removeHandle();
        this.#mode = 'localStorage';
      }
    }

    this.#eventBus.emit('data:mode-changed', { mode: this.#mode });
    this.#setupAutoSave();
  }

  // ─── File System Access API ──────────────────────────────────

  static isFileSystemAPISupported() {
    return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
  }

  /** 获取 index.html 所在目录路径（用于提示用户保存位置） */
  static getAppDirectory() {
    try {
      const url = new URL(window.location.href);
      const path = url.pathname; // /D:/path/to/index.html on file://
      const dir = path.replace(/\/[^/]*$/, '');
      if (url.protocol === 'file:') {
        // Windows: /D:/path → D:/path
        return dir.replace(/^\//, '');
      }
      return dir;
    } catch { return ''; }
  }

  /**
   * 首次设置引导：弹出确认框 → 打开保存对话框
   * @returns {boolean} 是否设置成功
   */
  async requestAutoSaveSetup() {
    if (!DataManager.isFileSystemAPISupported()) return false;

    const dir = DataManager.getAppDirectory();
    const dirHint = dir ? `\n\nSuggested location: ${dir}/word-racing-data.json` : '';

    const ok = confirm(
      `Save game data to a file?\n\n` +
      `Once set up, your progress will be automatically saved each time you play.` +
      `${dirHint}\n\n` +
      `Click OK and choose where to save the file.` +
      `\n\n(You can change or disable this later in Settings)`
    );

    if (!ok) return false;

    try {
      return await this.enableAutoSave();
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error('Auto-save setup failed:', e);
      }
      return false;
    }
  }

  async enableAutoSave() {
    if (!DataManager.isFileSystemAPISupported()) {
      throw new Error('Browser does not support File System Access API');
    }

    const handle = await window.showSaveFilePicker({
      suggestedName: 'word-racing-data.json',
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    });

    // 写入初始数据
    const data = this.#collectData();
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();

    this.#fileHandle = handle;
    await this.#storeHandle(handle);
    this.#mode = 'file-system';
    this.#eventBus.emit('data:mode-changed', { mode: 'file-system' });
    return true;
  }

  async disableAutoSave() {
    this.#fileHandle = null;
    this.#mode = 'localStorage';
    await this.#removeHandle();
    this.#eventBus.emit('data:mode-changed', { mode: 'localStorage' });
  }

  // ─── 保存 ────────────────────────────────────────────────────

  async save() {
    if (this.#mode === 'file-system' && this.#fileHandle) {
      await this.#saveToHandle();
    }
  }

  /** 延迟保存（合并多次调用，在关键操作后调用避免频繁写入） */
  scheduleSave() {
    if (this.#mode !== 'file-system' || !this.#fileHandle) return;
    if (this.#saveScheduled) return;
    this.#saveScheduled = true;
    this.#saveTimer = setTimeout(async () => {
      this.#saveScheduled = false;
      try { await this.#saveToHandle(); } catch (e) { /* 静默 */ }
    }, 1000);
  }

  // ─── 手动导出/导入 ───────────────────────────────────────────

  exportData() {
    const data = this.#collectData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `word-racing-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async importData(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          this.#populateData(data);
          if (this.#mode === 'file-system' && this.#fileHandle) {
            this.scheduleSave();
          }
          resolve(true);
        } catch (e) {
          reject(new Error('Invalid data file: ' + e.message));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // ─── Internal: 数据收集/还原 ──────────────────────────────────

  #collectData() {
    const keys = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DATA_PREFIX)) {
        keys[key] = localStorage.getItem(key);
      }
    }
    return { version: 1, exportedAt: new Date().toISOString(), keys };
  }

  #populateData(data) {
    if (!data?.keys) throw new Error('Invalid data format: missing keys');

    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DATA_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));

    for (const [key, value] of Object.entries(data.keys)) {
      localStorage.setItem(key, value);
    }
  }

  // ─── Internal: 文件读写 ──────────────────────────────────────

  async #saveToHandle() {
    if (!this.#fileHandle) return;
    const data = this.#collectData();
    const json = JSON.stringify(data, null, 2);

    const perm = await this.#fileHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      const req = await this.#fileHandle.requestPermission({ mode: 'readwrite' });
      if (req !== 'granted') throw new Error('Write permission denied');
    }

    const writable = await this.#fileHandle.createWritable();
    await writable.write(json);
    await writable.close();
  }

  async #loadFromHandle() {
    try {
      const perm = await this.#fileHandle.queryPermission({ mode: 'read' });
      if (perm !== 'granted') {
        const req = await this.#fileHandle.requestPermission({ mode: 'read' });
        if (req !== 'granted') return false;
      }

      const file = await this.#fileHandle.getFile();
      const text = await file.text();
      this.#populateData(JSON.parse(text));
      return true;
    } catch (e) {
      console.error('DataManager: Failed to load from file:', e);
      return false;
    }
  }

  // ─── Internal: IndexedDB (存储 FileSystemFileHandle) ──────────

  async #restoreHandle() {
    try {
      const handle = await this.#idbGet(HANDLE_KEY);
      if (!handle) return;

      const perm = await handle.queryPermission({ mode: 'read' });
      if (perm === 'granted') {
        this.#fileHandle = handle;
      } else {
        const req = await handle.requestPermission({ mode: 'read' });
        if (req === 'granted') {
          this.#fileHandle = handle;
        } else {
          await this.#idbDelete(HANDLE_KEY);
        }
      }
    } catch (e) {
      // IndexedDB 不可用（隐私模式等），静默降级
    }
  }

  async #storeHandle(handle) {
    await this.#idbPut(HANDLE_KEY, handle);
  }

  async #removeHandle() {
    await this.#idbDelete(HANDLE_KEY);
  }

  #idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async #idbGet(key) {
    try {
      const db = await this.#idbOpen();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
      });
    } catch { return null; }
  }

  async #idbPut(key, value) {
    try {
      const db = await this.#idbOpen();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(value, key);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); resolve(); };
      });
    } catch { /* 静默 */ }
  }

  async #idbDelete(key) {
    try {
      const db = await this.#idbOpen();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(key);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); resolve(); };
      });
    } catch { /* 静默 */ }
  }

  // ─── Internal: 自动保存 ──────────────────────────────────────

  #hasData() {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DATA_PREFIX)) return true;
    }
    return false;
  }

  #setupAutoSave() {
    // 自动保存模式：退出前静默写入文件
    window.addEventListener('beforeunload', () => {
      if (this.#mode === 'file-system' && this.#fileHandle) {
        this.#saveToHandle().catch(() => {});
      }
    });

    // 页面切后台时也保存（移动端浏览器可能在后台杀死页面）
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.#mode === 'file-system' && this.#fileHandle) {
        this.#saveToHandle().catch(() => {});
        if (this.#saveTimer) clearTimeout(this.#saveTimer);
        this.#saveScheduled = false;
      }
    });

    // 未设置自动保存 + 有数据时：关闭前弹出浏览器提醒
    window.addEventListener('beforeunload', (e) => {
      if (this.#mode === 'localStorage' && this.#hasData()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
}
