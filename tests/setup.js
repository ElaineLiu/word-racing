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
    return this._store.hasOwnProperty(key) ? this._store[key] : null;
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
  get length() {
    return Object.keys(this._store).length;
  }
  key(index) {
    return Object.keys(this._store)[index] || null;
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

// Mock window (补充 jsdom 不提供的属性)
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = window.requestAnimationFrame || ((cb) => setTimeout(cb, 16));
  window.cancelAnimationFrame = window.cancelAnimationFrame || ((id) => clearTimeout(id));
}

// Mock Canvas getContext for jsdom
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function(contextType) {
    if (contextType === '2d') {
      return {
        clearRect: () => {},
        fillRect: () => {},
        strokeRect: () => {},
        beginPath: () => {},
        closePath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        save: () => {},
        restore: () => {},
        translate: () => {},
        rotate: () => {},
        scale: () => {},
        fillText: () => {},
        strokeText: () => {},
        measureText: () => ({ width: 0 }),
        createLinearGradient: () => ({
          addColorStop: () => {},
        }),
        createRadialGradient: () => ({
          addColorStop: () => {},
        }),
        drawImage: () => {},
        getImageData: () => ({ data: [] }),
        putImageData: () => {},
        createImageData: () => ({ data: [] }),
        setTransform: () => {},
        font: '',
        textAlign: '',
        textBaseline: '',
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 1,
        globalAlpha: 1,
      };
    }
    return null;
  };
}

// Export for use in tests
export { MockLocalStorage };
