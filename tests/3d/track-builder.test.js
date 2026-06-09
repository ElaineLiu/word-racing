import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TrackBuilder } from '../../3d/rendering/track-builder.js';

const TEST_WAYPOINTS = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

const TEST_TRACK_WIDTH = 20;

describe('TrackBuilder', () => {
  it('should accept a THREE.Scene in constructor', () => {
    const scene = new THREE.Scene();
    const builder = new TrackBuilder(scene);
    expect(builder).toBeDefined();
  });

  describe('buildTrack', () => {
    it('should add a road mesh named track-road', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, TEST_TRACK_WIDTH);

      const road = scene.getObjectByName('track-road');
      expect(road).toBeDefined();
      expect(road.type).toBe('Mesh');
    });

    it('should use MeshStandardMaterial with dark color and flatShading', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, TEST_TRACK_WIDTH);

      const road = scene.getObjectByName('track-road');
      expect(road.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(road.material.color.getHex()).toBe(0x2D2D2D);
      expect(road.material.flatShading).toBe(true);
    });

    it('should generate closed-loop geometry', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, TEST_TRACK_WIDTH);

      const road = scene.getObjectByName('track-road');
      const pos = road.geometry.attributes.position;
      // Closed loop: first and last vertex pair should be near each other
      const firstLeft = new THREE.Vector3(pos.getX(0), pos.getY(0), pos.getZ(0));
      const firstRight = new THREE.Vector3(pos.getX(1), pos.getY(1), pos.getZ(1));
      const lastLeft = new THREE.Vector3(
        pos.getX(pos.count - 2),
        pos.getY(pos.count - 2),
        pos.getZ(pos.count - 2)
      );
      const lastRight = new THREE.Vector3(
        pos.getX(pos.count - 1),
        pos.getY(pos.count - 1),
        pos.getZ(pos.count - 1)
      );
      expect(firstLeft.distanceTo(lastLeft)).toBeLessThan(0.1);
      expect(firstRight.distanceTo(lastRight)).toBeLessThan(0.1);
    });
  });

  describe('addBarriers', () => {
    it('should add barrier meshes', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, TEST_TRACK_WIDTH);
      builder.addBarriers();

      const barriers = scene.children.filter(
        c => c.type === 'Mesh' && c.name === 'barrier'
      );
      expect(barriers.length).toBeGreaterThan(0);
    });
  });

  describe('addKerbs', () => {
    it('should add kerb meshes', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, TEST_TRACK_WIDTH);
      builder.addKerbs();

      const kerbs = scene.children.filter(
        c => c.type === 'Mesh' && c.name === 'kerb'
      );
      expect(kerbs.length).toBeGreaterThan(0);
    });
  });

  describe('addStartFinishLine', () => {
    it('should add start-finish meshes', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, TEST_TRACK_WIDTH);
      builder.addStartFinishLine();

      const startFinish = scene.children.filter(
        c => c.type === 'Mesh' && c.name === 'start-finish'
      );
      expect(startFinish.length).toBeGreaterThan(0);
    });
  });

  describe('update', () => {
    it('should not throw', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      expect(() => builder.update(0.016)).not.toThrow();
    });
  });
});