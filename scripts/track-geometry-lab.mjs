/** Read-only geometry exploration. Prints a candidate; never edits track data. */
import { readFileSync } from 'node:fs';

const authored = JSON.parse(readFileSync(new URL('../data/tracks/shanghai-authored-waypoints-2026-09-06.json', import.meta.url)));
const scale = Number(process.argv[2] ?? 2);
const clearance = Number(process.argv[3] ?? 130);
const original = authored.map(({ x, y }) => ({ x: x * scale + 120, y: y * scale + 90 }));
const points = original.map(point => ({ ...point }));
const n = points.length;
const project = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx*dx + dy*dy || 1)));
  return { x: a.x + dx*t, y: a.y + dy*t };
};

for (let iteration = 0; iteration < 2000; iteration++) {
  const forces = Array.from({ length: n }, () => ({ x: 0, y: 0 }));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const gap = Math.min(j - i, n - (j - i));
      if (gap < 2) continue;
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const distance = Math.hypot(dx, dy);
      if (distance >= clearance) continue;
      const length = distance || 1;
      const strength = (clearance - distance) * 0.06;
      const fx = (dx / length) * strength;
      const fy = (dy / length) * strength;
      forces[i].x += fx;
      forces[i].y += fy;
      forces[j].x -= fx;
      forces[j].y -= fy;
    }
  }
  for (let i = 0; i < n; i++) {
    const nextI = (i + 1) % n;
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      const nextJ = (j + 1) % n;
      const a = points[i], b = points[nextI], c = points[j], d = points[nextJ];
      const choices = [
        [a, project(a,c,d)], [b, project(b,c,d)],
        [project(c,a,b), c], [project(d,a,b), d],
      ];
      const closest = choices.reduce((best,pair) => {
        const distance = Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);
        return distance < best.distance ? { pair, distance } : best;
      }, { distance: Infinity });
      if (closest.distance >= clearance) continue;
      let dx = closest.pair[0].x - closest.pair[1].x;
      let dy = closest.pair[0].y - closest.pair[1].y;
      let length = Math.hypot(dx,dy);
      if (length < 1e-6) {
        dx = -(b.y-a.y); dy = b.x-a.x; length = Math.hypot(dx,dy) || 1;
      }
      const strength = (clearance - closest.distance) * 0.014;
      const fx = dx / length * strength;
      const fy = dy / length * strength;
      forces[i].x += fx; forces[nextI].x += fx;
      forces[i].y += fy; forces[nextI].y += fy;
      forces[j].x -= fx; forces[nextJ].x -= fx;
      forces[j].y -= fy; forces[nextJ].y -= fy;
    }
  }
  for (let i = 0; i < n; i++) {
    points[i].x += forces[i].x + (original[i].x - points[i].x) * 0.003;
    points[i].y += forces[i].y + (original[i].y - points[i].y) * 0.003;
  }
}

const cross = (a, b, c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
let crossings = [];
let minimum = Infinity;
let segmentMinimum = { distance: Infinity, pair: null };
const pointSegmentDistance = (p,a,b) => {
  const dx=b.x-a.x, dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
};
for (let i = 0; i < n; i++) {
  for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    const a = points[i], b = points[(i + 1) % n];
    const c = points[j], d = points[(j + 1) % n];
    if (cross(a,b,c)*cross(a,b,d) < 0 && cross(c,d,a)*cross(c,d,b) < 0) crossings.push([i,j]);
    minimum = Math.min(minimum, Math.hypot(a.x-c.x, a.y-c.y));
    const distance = Math.min(
      pointSegmentDistance(a,c,d), pointSegmentDistance(b,c,d),
      pointSegmentDistance(c,a,b), pointSegmentDistance(d,a,b),
    );
    if (distance < segmentMinimum.distance) segmentMinimum = { distance, pair: [i,j] };
  }
}
const bounds = points.reduce((b,p) => ({
  minX: Math.min(b.minX,p.x), maxX: Math.max(b.maxX,p.x),
  minY: Math.min(b.minY,p.y), maxY: Math.max(b.maxY,p.y),
}), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

console.log(JSON.stringify({ scale, clearance, crossings, minimum, segmentMinimum, bounds, points: points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })) }, null, 2));
