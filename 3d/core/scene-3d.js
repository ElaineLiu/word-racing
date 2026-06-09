import * as THREE from 'three';

const DEFAULTS = Object.freeze({
  camera: {
    fov: 60,
    near: 0.1,
    far: 1000,
    position: [0, 5, 10],
    aspect: 16 / 9,
  },
  lighting: {
    ambientColor: 0x404060,
    ambientIntensity: 1.0,
    directionalColor: 0xffffff,
    directionalIntensity: 1.0,
    directionalPosition: [3, 5, 4],
  },
  clearColor: 0x228B22,
  alpha: true,
});

function defaultRendererFactory(config) {
  const renderer = new THREE.WebGLRenderer({
    alpha: config.alpha,
    antialias: true,
  });
  renderer.setPixelRatio(
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
  );
  renderer.setClearColor(config.clearColor, config.alpha ? 0 : 1);
  return renderer;
}

/**
 * Wraps Three.js scene/camera/renderer/lighting behind a small API so
 * downstream code (TrackBuilder, Car3D, HUD, ...) never touches Three.js
 * setup directly. The renderer is injectable so unit tests can run in
 * jsdom (where WebGLRenderer cannot instantiate).
 */
export class Scene3D {
  constructor(config = {}, { rendererFactory } = {}) {
    this._config = mergeConfig(DEFAULTS, config);
    this._scene = new THREE.Scene();
    this._camera = this._buildCamera(this._config.camera);
    this._renderer = (rendererFactory || defaultRendererFactory)(this._config);
    this._setupLights(this._config.lighting);
  }

  get scene() { return this._scene; }
  get camera() { return this._camera; }
  get renderer() { return this._renderer; }

  render() {
    this._renderer.render(this._scene, this._camera);
  }

  // Placeholder for per-frame logic (animation mixers, particles, ...).
  // Intentionally a no-op for Epic 1 so callers can wire it in early.
  update(_deltaTime) {}

  resize(width, height) {
    this._camera.aspect = width / height;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(width, height, false);
  }

  dispose() {
    this._renderer.dispose();
    while (this._scene.children.length > 0) {
      this._scene.remove(this._scene.children[0]);
    }
  }

  _buildCamera(cfg) {
    const cam = new THREE.PerspectiveCamera(cfg.fov, cfg.aspect, cfg.near, cfg.far);
    const [x, y, z] = cfg.position;
    cam.position.set(x, y, z);
    return cam;
  }

  _setupLights(cfg) {
    const ambient = new THREE.AmbientLight(cfg.ambientColor, cfg.ambientIntensity);
    this._scene.add(ambient);

    const directional = new THREE.DirectionalLight(cfg.directionalColor, cfg.directionalIntensity);
    const [x, y, z] = cfg.directionalPosition;
    directional.position.set(x, y, z);
    this._scene.add(directional);
  }
}

// Shallow merge per top-level key; nested objects merged one level deep.
// Arrays replace wholesale.
function mergeConfig(base, override) {
  const out = {};
  for (const key of Object.keys(base)) {
    const b = base[key];
    const o = override[key];
    if (o === undefined) {
      out[key] = b;
    } else if (isPlainObject(b) && isPlainObject(o)) {
      out[key] = { ...b, ...o };
    } else {
      out[key] = o;
    }
  }
  for (const key of Object.keys(override)) {
    if (!(key in out)) out[key] = override[key];
  }
  return out;
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
