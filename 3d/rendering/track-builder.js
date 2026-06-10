import * as THREE from 'three';
import { createTreeModel } from '../models/tree-model.js';

const SAMPLES_PER_SEGMENT = 24;
const KERB_ANGLE_THRESHOLD = 0.26;

export class TrackBuilder {
  constructor(scene) {
    if (!scene) throw new Error('Scene is required');
    this.scene = scene;
    this.waypoints = [];
    this.trackWidth = 0;
    this.centerPoints = [];
    this.edgePoints = [];
    this.objects = [];
  }

  buildTrack(waypoints, trackWidth) {
    this.waypoints = waypoints.map(wp => ({ ...wp }));
    this.trackWidth = trackWidth;
    this.centerPoints = generateSmoothCurve(this.waypoints, SAMPLES_PER_SEGMENT);
    this.edgePoints = buildEdgePoints(this.centerPoints, this.trackWidth);

    const positions = [];
    for (const edge of this.edgePoints) {
      positions.push(edge.left.x, 0, edge.left.y);
      positions.push(edge.right.x, 0, edge.right.y);
    }

    const first = this.edgePoints[0];
    positions.push(first.left.x, 0, first.left.y);
    positions.push(first.right.x, 0, first.right.y);

    const indices = [];
    for (let i = 0; i < this.edgePoints.length; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x2D2D2D,
      roughness: 0.9,
      flatShading: true,
    });
    const road = new THREE.Mesh(geometry, material);
    road.name = 'track-road';
    this._add(road);
    return road;
  }

  addBarriers() {
    this._requireTrack();
    const geometry = new THREE.BoxGeometry(8, 4, 4);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    for (let i = 0; i < this.edgePoints.length; i += 2) {
      if (this._isStartFinishClearZone(i)) continue;
      const edge = this.edgePoints[i];
      this._addBox('barrier', geometry, material, edge.left.x, 2, edge.left.y);
      this._addBox('barrier', geometry, material, edge.right.x, 2, edge.right.y);
    }
  }

  addKerbs() {
    this._requireTrack();
    const geometry = new THREE.BoxGeometry(6, 1, 6);
    const red = new THREE.MeshStandardMaterial({ color: 0xe53935, flatShading: true });
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    for (let i = 0; i < this.centerPoints.length; i += 4) {
      if (this._isStartFinishClearZone(i)) continue;
      const prev = this.centerPoints[(i - 3 + this.centerPoints.length) % this.centerPoints.length];
      const curr = this.centerPoints[i];
      const next = this.centerPoints[(i + 3) % this.centerPoints.length];
      const diff = angleDiff(
        Math.atan2(curr.y - prev.y, curr.x - prev.x),
        Math.atan2(next.y - curr.y, next.x - curr.x),
      );
      if (diff <= KERB_ANGLE_THRESHOLD) continue;
      const edge = this.edgePoints[i];
      const material = Math.floor(i / 8) % 2 === 0 ? red : white;
      this._addBox('kerb', geometry, material, edge.left.x, 0.5, edge.left.y);
      this._addBox('kerb', geometry, material, edge.right.x, 0.5, edge.right.y);
    }
  }

  addStartFinishLine() {
    this._requireTrack();
    const start = this.centerPoints[0];
    const next = this.centerPoints[1];
    const tangent = normalize(next.x - start.x, next.y - start.y);
    const normal = { x: -tangent.y, y: tangent.x };
    const halfWidth = this.trackWidth / 2;
    const halfDepth = 9;

    const vertices = [];
    const uvs = [];
    const indices = [];

    // 4 corners along normal + tangent: TL → TR → BR → BL
    const corners = [
      { x: start.x - normal.x * halfWidth - tangent.x * halfDepth, y: start.y - normal.y * halfWidth - tangent.y * halfDepth },
      { x: start.x + normal.x * halfWidth - tangent.x * halfDepth, y: start.y + normal.y * halfWidth - tangent.y * halfDepth },
      { x: start.x + normal.x * halfWidth + tangent.x * halfDepth, y: start.y + normal.y * halfWidth + tangent.y * halfDepth },
      { x: start.x - normal.x * halfWidth + tangent.x * halfDepth, y: start.y - normal.y * halfWidth + tangent.y * halfDepth },
    ];

    for (const p of corners) {
      vertices.push(p.x, 0.35, p.y);
    }
    for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
      uvs.push(u, v);
    }
    for (const [a, b, c] of [[0, 1, 2], [0, 2, 3]]) {
      indices.push(a, b, c);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshBasicMaterial({
      map: createStartFinishTexture(),
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'start-finish';
    this._add(mesh);
  }

  addDecorations() {
    this._requireTrack();
    const half = this.trackWidth / 2;
    const total = this.centerPoints.length;

    // Trees: 70 instances, placed outside track edges
    const treeStep = Math.max(1, Math.floor(total / 70));
    for (let i = treeStep; i < total; i += treeStep) {
      if (i < total * 0.08 || i > total * 0.92) continue;
      const edge = this.edgePoints[i];
      const offset = half + 2 + seededRandom(i + 1) * 6;
      const side = i % 2 === 0 ? 1 : -1;
      const point = side > 0 ? edge.left : edge.right;
      const dx = (point.x - this.centerPoints[i].x);
      const dy = (point.y - this.centerPoints[i].y);
      const len = Math.sqrt(dx * dx + dy * dy) || 1;

      const tree = createTreeModel();
      const scale = 1 + seededRandom(i + 100) * 2;
      tree.scale.set(scale, scale, scale);
      tree.position.set(
        this.centerPoints[i].x + (dx / len) * offset,
        0,
        this.centerPoints[i].y + (dy / len) * offset,
      );
      this._add(tree);
    }

    // Streetlights: ~25 instances, placed along track edges
    const lightCount = 25;
    const lightStep = Math.max(1, Math.floor(total / lightCount));
    let lightIdx = 0;
    for (let i = lightStep; i < total && lightIdx < lightCount; i += lightStep, lightIdx++) {
      if (i < total * 0.08 || i > total * 0.92) continue;
      const edge = this.edgePoints[i];
      const side = i % 2 === 0 ? 'left' : 'right';
      const point = edge[side];

      const group = new THREE.Group();
      group.name = 'streetlight-decoration';
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 2, 4),
        new THREE.MeshStandardMaterial({ color: 0x9e9e9e, flatShading: true }),
      );
      pole.position.y = 1;
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 4, 4),
        new THREE.MeshStandardMaterial({ color: 0xffeb3b, emissive: 0xffeb3b, emissiveIntensity: 0.5 }),
      );
      bulb.position.y = 2.1;
      group.position.set(point.x, 0, point.y);
      group.add(pole);
      group.add(bulb);
      this._add(group);
    }
  }

  update(_deltaTime) {}

  dispose() {
    for (const obj of this.objects) {
      this.scene.remove(obj);
      obj.geometry?.dispose?.();
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose?.());
      } else {
        obj.material?.dispose?.();
      }
    }
    this.objects = [];
  }

  _add(obj) {
    this.scene.add(obj);
    this.objects.push(obj);
  }

  _addBox(name, geometry, material, x, y, z) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.set(x, y, z);
    this._add(mesh);
    return mesh;
  }

  _requireTrack() {
    if (this.centerPoints.length === 0) throw new Error('buildTrack must be called first');
  }

  _isStartFinishClearZone(index) {
    const point = this.centerPoints[index];
    const start = this.centerPoints[0];
    return Math.hypot(point.x - start.x, point.y - start.y) < this.trackWidth;
  }
}

function createStartFinishTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext?.('2d');
  const square = 16;

  if (ctx) {
    for (let y = 0; y < canvas.height; y += square) {
      for (let x = 0; x < canvas.width; x += square) {
        ctx.fillStyle = ((x / square + y / square) % 2 === 0) ? '#ffffff' : '#222222';
        ctx.fillRect(x, y, square, square);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function seededRandom(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function generateSmoothCurve(waypoints, samplesPerSegment) {
  const points = [];
  const n = waypoints.length;
  for (let i = 0; i < n; i++) {
    const p0 = waypoints[(i - 1 + n) % n];
    const p1 = waypoints[i];
    const p2 = waypoints[(i + 1) % n];
    const p3 = waypoints[(i + 2) % n];
    for (let j = 0; j < samplesPerSegment; j++) {
      const t = j / samplesPerSegment;
      points.push({
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
      });
    }
  }
  return points;
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t3
  );
}

function buildEdgePoints(points, trackWidth) {
  const half = trackWidth / 2;
  return points.map((point, i) => {
    const prev = points[(i - 1 + points.length) % points.length];
    const next = points[(i + 1) % points.length];
    const tangent = normalize(next.x - prev.x, next.y - prev.y);
    const normal = { x: -tangent.y, y: tangent.x };
    return {
      left: { x: point.x + normal.x * half, y: point.y + normal.y * half },
      right: { x: point.x - normal.x * half, y: point.y - normal.y * half },
    };
  });
}

function normalize(x, y) {
  const len = Math.sqrt(x * x + y * y) || 1;
  return { x: x / len, y: y / len };
}

function angleDiff(a, b) {
  let diff = Math.abs(b - a);
  if (diff > Math.PI) diff = 2 * Math.PI - diff;
  return diff;
}