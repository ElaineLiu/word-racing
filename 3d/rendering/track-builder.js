import * as THREE from 'three';
import { createTreeModel } from '../models/tree-model.js';
import { Track } from '../../js/track.js';

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

  buildTrack(waypoints, trackWidth, samplesPerSegment = SAMPLES_PER_SEGMENT) {
    this.waypoints = waypoints.map(wp => ({ ...wp }));
    this.trackWidth = trackWidth;
    // Reuse the same centripetal spline implementation as collision/progress.
    // Clone the controls so 3D keeps its own boundary response policy.
    this.centerPoints = new Track(this.waypoints, trackWidth, samplesPerSegment).centerline;
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
    const chevronMaterials = createBarrierChevronMaterials();
    this._addBarrierInstances('left', chevronMaterials.left);
    this._addBarrierInstances('right', chevronMaterials.right);
  }

  addKerbs() {
    this._requireTrack();
    // Kerbs are painted low-profile road plates, not collision blocks.
    const geometry = new THREE.BoxGeometry(6, 0.2, 6);
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
      this._addBox('kerb', geometry, material, edge.left.x, 0.1, edge.left.y);
      this._addBox('kerb', geometry, material, edge.right.x, 0.1, edge.right.y);
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
    const disposedGeometries = new Set();
    const disposedMaterials = new Set();
    for (const obj of this.objects) {
      this.scene.remove(obj);
      if (obj.geometry && !disposedGeometries.has(obj.geometry)) {
        obj.geometry.dispose?.();
        disposedGeometries.add(obj.geometry);
      }
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        if (!material || disposedMaterials.has(material)) continue;
        material.map?.dispose?.();
        material.dispose?.();
        disposedMaterials.add(material);
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

  _addBarrierInstances(side, materials) {
    const geometry = new THREE.BoxGeometry(1, 4, 4);
    const mesh = new THREE.InstancedMesh(geometry, materials, this.edgePoints.length);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const validSegments = buildValidEdgeSegmentMask(
      this.centerPoints, this.edgePoints, side, this.trackWidth
    );
    let count = 0;
    let skippedInvalid = 0;

    for (let i = 0; i < this.edgePoints.length; i++) {
      const nextIndex = (i + 1) % this.edgePoints.length;
      if (this._isStartFinishClearZone(i) || this._isStartFinishClearZone(nextIndex)) continue;
      if (!validSegments[i]) {
        skippedInvalid++;
        continue;
      }
      const start = this.edgePoints[i][side];
      const end = this.edgePoints[nextIndex][side];
      const dx = end.x - start.x;
      const dz = end.y - start.y;
      const length = Math.hypot(dx, dz);
      if (length < 1e-6) continue;

      position.set((start.x + end.x) / 2, 2, (start.y + end.y) / 2);
      rotation.setFromAxisAngle(up, -Math.atan2(dz, dx));
      // A small overlap closes floating-point cracks without protruding into
      // the road like the old fixed-size blocks did at sharp corners.
      scale.set(length + 0.35, 1, 1);
      matrix.compose(position, rotation, scale);
      mesh.setMatrixAt(count++, matrix);
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = 'barrier';
    mesh.userData.chevronSide = side;
    mesh.userData.continuousEdgeSegments = true;
    mesh.userData.skippedInvalidSegments = skippedInvalid;
    this._add(mesh);
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

function createBarrierChevronMaterials() {
  const base = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
  const forward = new THREE.MeshBasicMaterial({ map: createChevronTexture(false) });
  forward.userData.chevronDirection = 'forward';
  const mirrored = new THREE.MeshBasicMaterial({ map: createChevronTexture(true) });
  mirrored.userData.chevronDirection = 'mirrored';

 

  return {
  
    left: [base, base, base, base, mirrored, forward],                                                                                                                                                                       
    right: [base, base, base, base, mirrored, forward],
  };
}

function createChevronTexture(mirrored = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext?.('2d');

  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 10;
    ctx.lineCap = 'square';

    if (mirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    for (const x of [32, 76]) {
      ctx.beginPath();
      ctx.moveTo(x + 18, 10);
      ctx.lineTo(x - 8, 32);
      ctx.lineTo(x + 18, 54);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
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

function buildEdgePoints(points, trackWidth) {
  const half = trackWidth / 2;
  const n = points.length;
  const edgePoints = new Array(n);

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];
    // Use the same centred tangent as Track.getBoundaryContact(). A fixed
    // normal offset keeps both visible edges exactly half a track width from
    // the collision centerline and cannot create miter spikes at tight bends.
    const tangent = normalize(next.x - prev.x, next.y - prev.y);
    const normal = { x: -tangent.y, y: tangent.x };
    edgePoints[i] = {
      left: { x: curr.x + normal.x * half, y: curr.y + normal.y * half },
      right: { x: curr.x - normal.x * half, y: curr.y - normal.y * half },
    };
  }

  return edgePoints;
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

function buildValidEdgeSegmentMask(centerPoints, edgePoints, side, trackWidth) {
  const count = centerPoints.length;
  const valid = new Array(count).fill(true);

  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    const centerDx = centerPoints[next].x - centerPoints[i].x;
    const centerDy = centerPoints[next].y - centerPoints[i].y;
    const edgeDx = edgePoints[next][side].x - edgePoints[i][side].x;
    const edgeDy = edgePoints[next][side].y - edgePoints[i][side].y;
    const centerLength = Math.hypot(centerDx, centerDy);
    const edgeLength = Math.hypot(edgeDx, edgeDy);
    const directionDot = centerLength > 1e-6 && edgeLength > 1e-6
      ? (centerDx * edgeDx + centerDy * edgeDy) / (centerLength * edgeLength)
      : -1;

    // An offset curve folds back when the inner radius is smaller than half
    // the road width. Do not bridge that fold with a giant crossing barrier.
    const innerBoundary = isInnerBoundary(centerPoints, side, i);
    if (innerBoundary
        && (directionDot < 0.15 || edgeLength > Math.max(12, centerLength * 3))) {
      valid[i] = false;
    }
  }

  // Offset boundaries can also intersect a later part of the same hairpin
  // even when each individual segment still points forward. Reject both
  // sides of those crossings so no guardrail is drawn across the road.
  const localExclusion = 12;
  const cellSize = Math.max(20, trackWidth);
  const spatialIndex = new Map();
  for (const indexedSide of ['left', 'right']) {
    for (let index = 0; index < count; index++) {
      const start = edgePoints[index][indexedSide];
      const end = edgePoints[(index + 1) % count][indexedSide];
      const minCellX = Math.floor(Math.min(start.x, end.x) / cellSize);
      const maxCellX = Math.floor(Math.max(start.x, end.x) / cellSize);
      const minCellY = Math.floor(Math.min(start.y, end.y) / cellSize);
      const maxCellY = Math.floor(Math.max(start.y, end.y) / cellSize);
      const segment = { side: indexedSide, index, start, end };
      for (let x = minCellX; x <= maxCellX; x++) {
        for (let y = minCellY; y <= maxCellY; y++) {
          const key = `${x},${y}`;
          if (!spatialIndex.has(key)) spatialIndex.set(key, []);
          spatialIndex.get(key).push(segment);
        }
      }
    }
  }

  for (let i = 0; i < count; i++) {
    const a1 = edgePoints[i][side];
    const a2 = edgePoints[(i + 1) % count][side];
    const candidates = new Map();
    const minCellX = Math.floor(Math.min(a1.x, a2.x) / cellSize);
    const maxCellX = Math.floor(Math.max(a1.x, a2.x) / cellSize);
    const minCellY = Math.floor(Math.min(a1.y, a2.y) / cellSize);
    const maxCellY = Math.floor(Math.max(a1.y, a2.y) / cellSize);
    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        for (const candidate of spatialIndex.get(`${x},${y}`) || []) {
          candidates.set(`${candidate.side}:${candidate.index}`, candidate);
        }
      }
    }

    for (const candidate of candidates.values()) {
      const j = candidate.index;
      const cyclicDistance = Math.min(Math.abs(j - i), count - Math.abs(j - i));
      if (cyclicDistance <= localExclusion) continue;
      if (segmentsIntersect(a1, a2, candidate.start, candidate.end)) {
        if (isInnerBoundary(centerPoints, side, i)) valid[i] = false;
        if (candidate.side === side && isInnerBoundary(centerPoints, side, j)) valid[j] = false;
      }
    }
  }

  // Give a folded cusp a short clear transition instead of leaving a fan of
  // converging blocks around the single rejected segment.
  const invalid = valid.map(value => !value);
  const padding = 6;
  for (let i = 0; i < count; i++) {
    if (!invalid[i]) continue;
    for (let offset = -padding; offset <= padding; offset++) {
      valid[(i + offset + count) % count] = false;
    }
  }
  return valid;
}

function isInnerBoundary(centerPoints, side, index) {
  const count = centerPoints.length;
  const previous = centerPoints[(index - 2 + count) % count];
  const current = centerPoints[index];
  const next = centerPoints[(index + 2) % count];
  const incomingX = current.x - previous.x;
  const incomingY = current.y - previous.y;
  const outgoingX = next.x - current.x;
  const outgoingY = next.y - current.y;
  const turn = incomingX * outgoingY - incomingY * outgoingX;
  if (Math.abs(turn) < 1e-6) return false;
  return turn > 0 ? side === 'left' : side === 'right';
}

function segmentsIntersect(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  const epsilon = 1e-7;
  return ((abC > epsilon && abD < -epsilon) || (abC < -epsilon && abD > epsilon))
    && ((cdA > epsilon && cdB < -epsilon) || (cdA < -epsilon && cdB > epsilon));
}
