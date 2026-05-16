/**
 * Test Setup - Mock browser globals for unit tests
 * This allows us to test car.js, game.js, quiz.js without a real browser
 *
 * Updated for ES6 modules (Phase 1.2)
 */

// Mock localStorage
class MockLocalStorage {
  constructor() {
    this._store = {};
  }
  getItem(key) {
    return this._store[key] || null;
  }
  setItem(key, value) {
    this._store[key] = String(value);
  }
  removeItem(key) {
    delete this._store[key];
  }
  clear() {
    this._store = {};
  }
}

// Set up global mocks
global.localStorage = new MockLocalStorage();

// Mock fetch for words.json
global.fetch = async (url) => {
  if (url.includes('words.json')) {
    return {
      json: async () => ({
        words: [
          { id: 1, word: 'speed', meaning_cn: '速度', meaning_en: 'how fast something goes', phonetic: '/spiːd/', sentence: 'The speed of the car was amazing.', level: 2, category: 'abstract' },
          { id: 2, word: 'brake', meaning_cn: '刹车', meaning_en: 'to make a vehicle stop', phonetic: '/breɪk/', sentence: 'The driver hit the brake before the corner.', level: 2, category: 'transport' },
          { id: 3, word: 'champion', meaning_cn: '冠军', meaning_en: 'the winner of a competition', phonetic: '/ˈtʃæmpiən/', sentence: 'The champion lifted the trophy.', level: 3, category: 'sports' },
          { id: 4, word: 'engine', meaning_cn: '引擎', meaning_en: 'the part that makes a machine go', phonetic: '/ˈendʒɪn/', sentence: 'The engine roared as the race started.', level: 3, category: 'transport' },
          { id: 5, word: 'trophy', meaning_cn: '奖杯', meaning_en: 'a prize you win', phonetic: '/ˈtroʊfi/', sentence: 'The trophy was made of gold.', level: 2, category: 'objects' },
        ]
      })
    };
  }
  throw new Error(`Unknown URL: ${url}`);
};

// Mock window
global.window = {
  localStorage: global.localStorage,
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  cancelAnimationFrame: (id) => clearTimeout(id),
  Date: Date,
  Math: Math,
  console: console,
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  navigator: { maxTouchPoints: 0 },
};

// Mock document
global.document = {
  createElement: (tagName) => ({
    tagName: tagName.toUpperCase(),
    className: '',
    innerHTML: '',
    textContent: '',
    style: {},
    children: [],
    parentElement: null,
    appendChild(child) { this.children.push(child); return child; },
    removeChild(child) { const idx = this.children.indexOf(child); if (idx >= 0) this.children.splice(idx, 1); },
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    setAttribute: () => {},
    getAttribute: () => null,
    dataset: {},
  }),
  getElementById: () => ({
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    querySelectorAll: () => [],
    style: {},
  }),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  readyState: 'complete',
  body: { appendChild: () => {}, style: {} },
  documentElement: {},
};

// Export for use in tests
export { MockLocalStorage };
