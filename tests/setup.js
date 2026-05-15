/**
 * Test Setup - Mock browser globals for unit tests
 * This allows us to test car.js, game.js, quiz.js without a real browser
 */

// Mock canvas context
class MockCanvasContext {
  constructor() {
    this.fillStyle = '';
    this.strokeStyle = '';
    this.lineWidth = 0;
    this.globalAlpha = 1;
    this.font = '';
    this.textAlign = '';
    this.textBaseline = '';
    this._calls = [];
  }

  fillRect() { this._calls.push(['fillRect', ...arguments]); }
  strokeRect() { this._calls.push(['strokeRect', ...arguments]); }
  fillText() { this._calls.push(['fillText', ...arguments]); }
  beginPath() { this._calls.push(['beginPath']); }
  closePath() { this._calls.push(['closePath']); }
  moveTo() { this._calls.push(['moveTo', ...arguments]); }
  lineTo() { this._calls.push(['lineTo', ...arguments]); }
  arc() { this._calls.push(['arc', ...arguments]); }
  ellipse() { this._calls.push(['ellipse', ...arguments]); }
  fill() { this._calls.push(['fill']); }
  stroke() { this._calls.push(['stroke']); }
  save() { this._calls.push(['save']); }
  restore() { this._calls.push(['restore']); }
  translate() { this._calls.push(['translate', ...arguments]); }
  rotate() { this._calls.push(['rotate', ...arguments]); }
  scale() { this._calls.push(['scale', ...arguments]); }
  setLineDash() { this._calls.push(['setLineDash', ...arguments]); }
  quadraticCurveTo() { this._calls.push(['quadraticCurveTo', ...arguments]); }
  createLinearGradient() { return { addColorStop: () => {} }; }
  measureText() { return { width: 10 }; }
  getImageData() { return { data: new Uint8ClampedArray(4) }; }
  putImageData() {}
  drawImage() {}
  clearRect() {}
}

// Mock canvas element
class MockCanvas {
  constructor(width = 920, height = 620) {
    this.width = width;
    this.height = height;
    this._context = new MockCanvasContext();
  }
  getContext(type) {
    return this._context;
  }
  addEventListener() {}
  removeEventListener() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, width: this.width, height: this.height };
  }
}

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

// Mock HTMLElement
class MockHTMLElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.className = '';
    this.innerHTML = '';
    this.textContent = '';
    this.style = {};
    this.children = [];
    this.parentElement = null;
  }
  appendChild(child) {
    this.children.push(child);
    child.parentElement = this;
    return child;
  }
  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) this.children.splice(idx, 1);
  }
  querySelectorAll(selector) {
    return [];
  }
  querySelector(selector) {
    return null;
  }
  addEventListener() {}
  removeEventListener() {}
  classList = {
    add: () => {},
    remove: () => {},
    contains: () => false,
    toggle: () => {},
  };
  setAttribute() {}
  getAttribute() { return null; }
}

// Set up global mocks
global.localStorage = new MockLocalStorage();
global.HTMLCanvasElement = MockCanvas;

// Mock document
global.document = {
  createElement: (tagName) => new MockHTMLElement(tagName),
  getElementById: () => new MockHTMLElement('div'),
  querySelectorAll: () => [],
  querySelector: () => null,
  addEventListener: () => {},
  removeEventListener: () => {},
  readyState: 'complete',
  body: new MockHTMLElement('body'),
  documentElement: new MockHTMLElement('html'),
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

// Export for use in tests
export { MockCanvas, MockCanvasContext, MockLocalStorage, MockHTMLElement };
