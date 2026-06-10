import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TrackBuilder } from '../../3d/rendering/track-builder.js';
import { createTreeModel } from '../../3d/models/tree-model.js';
import { createBuildingModel } from '../../3d/models/building-model.js';

const TEST_WAYPOINTS = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
  { x: 0, y: 100 },
];

describe('3D decorations', () => {
  describe('createTreeModel', () => {
    it('should return a low-poly tree group', () => {
      const tree = createTreeModel();

      expect(tree).toBeInstanceOf(THREE.Group);
      expect(tree.children.length).toBe(2);
      expect(tree.children[0].geometry).toBeInstanceOf(THREE.CylinderGeometry);
      expect(tree.children[1].geometry).toBeInstanceOf(THREE.ConeGeometry);
    });
  });

  describe('createBuildingModel', () => {
    it('should return a low-poly building group', () => {
      const building = createBuildingModel({ height: 2 });

      expect(building).toBeInstanceOf(THREE.Group);
      expect(building.children.length).toBeGreaterThan(0);
      expect(building.children[0].geometry).toBeInstanceOf(THREE.BoxGeometry);
    });
  });

  describe('TrackBuilder.addDecorations', () => {
    it('should add tree instances and streetlights without building blocks', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, 20);
      builder.addDecorations();

      const trees = scene.children.filter(c => c.name === 'tree-decoration');
      const buildings = scene.children.filter(c => c.name === 'building-decoration');
      const streetlights = scene.children.filter(c => c.name === 'streetlight-decoration');

      expect(trees.length).toBeGreaterThanOrEqual(50);
      expect(trees.length).toBeLessThanOrEqual(100);
      expect(buildings).toHaveLength(0);
      expect(streetlights.length).toBeGreaterThanOrEqual(20);
      expect(streetlights.length).toBeLessThanOrEqual(30);
    });

    it('should place decorations away from origin', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, 20);
      builder.addDecorations();

      const decorations = scene.children.filter(c => c.name.endsWith('-decoration'));
      const distinctPositions = new Set(
        decorations.map(d => `${Math.round(d.position.x)},${Math.round(d.position.z)}`)
      );

      expect(distinctPositions.size).toBeGreaterThan(10);
      expect(decorations.some(d => d.position.length() > 0)).toBe(true);
    });
  });
});