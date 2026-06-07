import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { Scene3D } from '../../3d/core/scene-3d.js';

function makeFakeRenderer() {
  return {
    setSize: vi.fn(),
    render: vi.fn(),
    dispose: vi.fn(),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    domElement: document.createElement('canvas'),
  };
}

// Helper that builds a Scene3D wired with a fake renderer.
function build(config = {}) {
  const factory = vi.fn(makeFakeRenderer);
  const scene = new Scene3D(config, { rendererFactory: factory });
  return { scene, factory };
}

describe('Scene3D', () => {
  it('exposes a THREE.Scene', () => {
    const { scene } = build();
    expect(scene.scene).toBeInstanceOf(THREE.Scene);
  });

  it('exposes a THREE.PerspectiveCamera honoring config (fov/near/far)', () => {
    const { scene } = build({
      camera: { fov: 75, near: 0.5, far: 2000, position: [1, 2, 3] },
    });
    expect(scene.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(scene.camera.fov).toBe(75);
    expect(scene.camera.near).toBe(0.5);
    expect(scene.camera.far).toBe(2000);
    expect(scene.camera.position.x).toBeCloseTo(1);
    expect(scene.camera.position.y).toBeCloseTo(2);
    expect(scene.camera.position.z).toBeCloseTo(3);
  });

  it('falls back to sensible defaults when no config given', () => {
    const { scene } = build();
    expect(scene.camera.fov).toBeGreaterThan(0);
    expect(scene.camera.near).toBeGreaterThan(0);
    expect(scene.camera.far).toBeGreaterThan(scene.camera.near);
  });

  it('adds at least one AmbientLight and one DirectionalLight', () => {
    const { scene } = build();
    const lights = scene.scene.children.filter((c) => c.isLight);
    const ambient = lights.filter((l) => l.isAmbientLight);
    const directional = lights.filter((l) => l.isDirectionalLight);
    expect(ambient.length).toBeGreaterThanOrEqual(1);
    expect(directional.length).toBeGreaterThanOrEqual(1);
  });

  it('uses the injected rendererFactory exactly once', () => {
    const { factory } = build();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('render() delegates to renderer.render(scene, camera)', () => {
    const { scene } = build();
    scene.render();
    expect(scene.renderer.render).toHaveBeenCalledTimes(1);
    expect(scene.renderer.render).toHaveBeenCalledWith(scene.scene, scene.camera);
  });

  it('resize(w, h) updates camera.aspect and calls renderer.setSize', () => {
    const { scene } = build();
    scene.resize(800, 400);
    expect(scene.camera.aspect).toBeCloseTo(2);
    expect(scene.renderer.setSize).toHaveBeenCalledWith(800, 400, false);
  });

  it('update(deltaTime) is a no-op placeholder that does not throw', () => {
    const { scene } = build();
    expect(() => scene.update(1 / 60)).not.toThrow();
  });

  it('dispose() calls renderer.dispose() and clears the scene graph', () => {
    const { scene } = build();
    scene.scene.add(new THREE.Object3D());
    const before = scene.scene.children.length;
    expect(before).toBeGreaterThan(0);

    scene.dispose();
    expect(scene.renderer.dispose).toHaveBeenCalledTimes(1);
    expect(scene.scene.children.length).toBe(0);
  });
});
