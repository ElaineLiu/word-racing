import { Track } from '../js/track.js';
import { SHANGHAI_2D_WAYPOINTS as waypoints } from '../config/tracks/shanghai-2d.js';

const track = new Track(waypoints, 90, 24);
const points = track.points;
const n = points.length;
const controlCount = waypoints.length;
const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const projectedDistance = (p,a,b) => {
  const dx=b.x-a.x, dy=b.y-a.y;
  const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
  return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
};
let min={distance:Infinity,pair:null};
let crossings=[];
for(let i=0;i<n;i++) {
  const a=points[i], b=points[(i+1)%n];
  for(let j=i+2;j<n;j++) {
    if(i===0&&j===n-1)continue;
    const g=Math.abs(Math.floor(i/24)-Math.floor(j/24));
    // A rounded hairpin spans up to six nearby controls; compare only
    // distinct route sections rather than neighbouring samples of one arc.
    if(Math.min(g,controlCount-g)<=6)continue;
    const c=points[j], d=points[(j+1)%n];
    if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)crossings.push([i,j]);
    const distance=Math.min(projectedDistance(a,c,d),projectedDistance(b,c,d),projectedDistance(c,a,b),projectedDistance(d,a,b));
    if(distance<min.distance)min={distance,pair:[i,j]};
  }
}
const bounds=points.reduce((v,p)=>({minX:Math.min(v.minX,p.x),maxX:Math.max(v.maxX,p.x),minY:Math.min(v.minY,p.y),maxY:Math.max(v.maxY,p.y)}),{minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity});
console.log(JSON.stringify({controlCount,centerlinePoints:n,crossings:crossings.slice(0,10),crossingCount:crossings.length,min,bounds},null,2));
