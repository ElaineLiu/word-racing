import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { TrackBuilder } from '../../3d/rendering/track-builder.js';
import { TRACK_REGISTRY } from '../../config/track-registry.js';

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

    it('should leave the start-finish area clear on closed tracks', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      const track = TRACK_REGISTRY['shanghai-3d'];
      builder.buildTrack(track.waypoints, track.trackWidth);
      builder.addBarriers();

      const start = new THREE.Vector2(track.waypoints[0].x, track.waypoints[0].y);
      const barriersNearStart = scene.children.filter(c => {
        if (c.type !== 'Mesh' || c.name !== 'barrier') return false;
        return new THREE.Vector2(c.position.x, c.position.z).distanceTo(start) < track.trackWidth;
      });

      expect(barriersNearStart).toHaveLength(0);
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

    it('should leave the start-finish area clear of kerb blocks on closed tracks', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      const track = TRACK_REGISTRY['shanghai-3d'];
      builder.buildTrack(track.waypoints, track.trackWidth);
      builder.addKerbs();

      const start = new THREE.Vector2(track.waypoints[0].x, track.waypoints[0].y);
      const kerbsNearStart = scene.children.filter(c => {
        if (c.type !== 'Mesh' || c.name !== 'kerb') return false;
        return new THREE.Vector2(c.position.x, c.position.z).distanceTo(start) < track.trackWidth;
      });

      expect(kerbsNearStart).toHaveLength(0);
    });
  });

  describe('addStartFinishLine', () => {
    it('should add one textured start-finish mesh above the road', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, TEST_TRACK_WIDTH);
      builder.addStartFinishLine();

      const startFinish = scene.children.filter(
        c => c.type === 'Mesh' && c.name === 'start-finish'
      );
      expect(startFinish).toHaveLength(1);
      expect(startFinish[0].material.map).toBeInstanceOf(THREE.CanvasTexture);

      const positions = startFinish[0].geometry.attributes.position;
      expect(positions.getY(0)).toBeGreaterThan(0.2);
      const firstEdge = new THREE.Vector2(
        positions.getX(1) - positions.getX(0),
        positions.getZ(1) - positions.getZ(0)
      ).normalize();
      expect(Math.abs(firstEdge.y)).toBeGreaterThan(0.7);
    });
  });

  describe('barrier chevrons', () => {
    it('should render chevrons as barrier material, not standalone scene objects', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, TEST_TRACK_WIDTH);
      builder.addBarriers();

      const standaloneDirections = scene.children.filter(c => c.name.includes('chevron') || c.name.includes('direction'));
      const barriers = scene.children.filter(c => c.name === 'barrier');
      const texturedBarriers = barriers.filter(c => Array.isArray(c.material));

      expect(standaloneDirections).toHaveLength(0);
      expect(texturedBarriers).toHaveLength(barriers.length);
      expect(texturedBarriers[0].material.some(m => m.map instanceof THREE.CanvasTexture)).toBe(true);
    });
    it('should orient both left and right inner chevrons toward track forward direction', () => {
      const scene = new THREE.Scene();
      const builder = new TrackBuilder(scene);
      builder.buildTrack(TEST_WAYPOINTS, TEST_TRACK_WIDTH);
      builder.addBarriers();

      const barriers = scene.children.filter(c => c.name === 'barrier' && c.userData.chevronSide);
      const left = barriers.find(b => b.userData.chevronSide === 'left');
      const right = barriers.find(b => b.userData.chevronSide === 'right');

      expect(left).toBeDefined();
      expect(right).toBeDefined();
      expect(left.userData.chevronForwardAngle).toBeCloseTo(left.userData.trackForwardAngle, 6);
      expect(right.userData.chevronForwardAngle).toBeCloseTo(right.userData.trackForwardAngle, 6);

      // 护栏箭头贴在Z面上（索引4=+Z, 索引5=-Z）
      // 左侧护栏：玩家看到-Z面（索引5），应为forward
      // 右侧护栏：玩家看到+Z面（索引4），应为forward
      // 由于纹理坐标系统，左侧需要用mirrored来实现正确的前向箭头
      expect(left.material[4].userData.chevronDirection).toBe('mirrored');
      expect(left.material[5].userData.chevronDirection).toBe('forward');
      expect(right.material[4].userData.chevronDirection).toBe('mirrored');
      expect(right.material[5].userData.chevronDirection).toBe('forward');
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