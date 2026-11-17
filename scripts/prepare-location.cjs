// Offline OSM extract -> small local-metre scene. No random roads/buildings.
const fs = require('node:fs');
const raw = fs.readFileSync('assets/map/nexus/osm-source.osm', 'utf8');
const destination = JSON.parse(fs.readFileSync('assets/map/nexus/destination-verification.json', 'utf8'));
const R = 6378137, rad = Math.PI / 180;
const project = (lon, lat) => [(lon - destination.longitude) * rad * R * Math.cos(destination.latitude * rad), -(lat - destination.latitude) * rad * R];
const round = p => p.map(n => +n.toFixed(3));
const attrs = text => Object.fromEntries([...text.matchAll(/([\w:]+)="([^"]*)"/g)].map(m => [m[1], m[2].replaceAll('&amp;', '&').replaceAll('&quot;', '"')]));
const nodes = new Map([...raw.matchAll(/<node\b([^>]*)/g)].map(m => { const a = attrs(m[1]); return [a.id, project(+a.lon, +a.lat)]; }));
const ways = [...raw.matchAll(/<way\b([^>]*)>([\s\S]*?)<\/way>/g)].map(m => ({ id: +attrs(m[1]).id, tags: Object.fromEntries([...m[2].matchAll(/<tag\b([^>]*)\/>/g)].map(t => { const a = attrs(t[1]); return [a.k, a.v]; })), points: [...m[2].matchAll(/<nd ref="(\d+)"/g)].map(n => nodes.get(n[1])).filter(Boolean) }));
// Liang–Barsky clips long OSM ways without changing their actual alignment.
function clip(a, b) { let lo = 0, hi = 1; const dx = b[0] - a[0], dz = b[1] - a[1]; for (const [p,q] of [[-dx,a[0]+520],[dx,520-a[0]],[-dz,a[1]+520],[dz,520-a[1]]]) { if (!p && q < 0) return null; if (!p) continue; const r = q / p; if (p < 0) lo = Math.max(lo,r); else hi = Math.min(hi,r); if (lo > hi) return null; } return [[a[0]+dx*lo,a[1]+dz*lo],[a[0]+dx*hi,a[1]+dz*hi]]; }
const roads = [];
for (const way of ways.filter(w => w.tags.highway && !['proposed','construction'].includes(w.tags.highway))) {
  const segments = [];
  for (let i = 1; i < way.points.length; i++) { const segment = clip(way.points[i-1],way.points[i]); if (segment) segments.push(segment.map(round)); }
  if (segments.length) roads.push({ id: way.id, name: way.tags.name || '', kind: way.tags.highway, segments, width: ({ secondary: 10, tertiary: 8, residential: 5, service: 3, footway: 1.5 })[way.tags.highway] || 4 });
}
const inside = (p, ring) => { let result = false; for (let i=0,j=ring.length-1;i<ring.length;j=i++) if ((ring[i][1]>p[1]) !== (ring[j][1]>p[1]) && p[0] < (ring[j][0]-ring[i][0])*(p[1]-ring[i][1])/(ring[j][1]-ring[i][1])+ring[i][0]) result = !result; return result; };
const buildings = ways.filter(w => w.tags.building && w.points.length >= 4 && w.points.every(p => Math.abs(p[0]) <= 520 && Math.abs(p[1]) <= 520)).map(w => {
  const actual = Number.parseFloat(w.tags.height), levels = Number.parseFloat(w.tags['building:levels']);
  return { id: w.id, name: w.tags.name || '', footprint: w.points.map(round), height: actual > 0 ? Math.min(actual,100) : levels > 0 ? Math.min(levels*3,100) : 8, heightSource: actual > 0 ? 'osm-height' : levels > 0 ? 'osm-levels-estimate' : 'neutral-stylized', containsDestination: inside([0,0],w.points) };
});
// Illustrative reveal along the actual Dhebar Road way; not turn-by-turn routing.
const approach = roads.find(r => r.id === 312472093);
if (!approach) throw new Error('Verified nearby Dhebar Road way missing');
let path = [approach.segments[0][0], ...approach.segments.map(s=>s[1])];
if (Math.hypot(...path[0]) < Math.hypot(...path.at(-1))) path.reverse();
let best = { distance: Infinity, index: 0, point: path[0] };
for (let i=1;i<path.length;i++) { const a=path[i-1], b=path[i], dx=b[0]-a[0], dz=b[1]-a[1], t=Math.max(0,Math.min(1,-(a[0]*dx+a[1]*dz)/(dx*dx+dz*dz))); const point=[a[0]+dx*t,a[1]+dz*t], distance=Math.hypot(...point); if(distance<best.distance)best={distance,index:i,point}; }
path = [...path.slice(0,best.index),round(best.point)];
const result = { version:1, projection:'Local equirectangular metres; X east, Z south; origin is the provider POI', center:{ latitude:destination.latitude,longitude:destination.longitude }, extent:520, attribution:'© OpenStreetMap contributors', license:'ODbL-1.0', source:'https://api.openstreetmap.org/api/0.6/map?bbox=70.7948,22.2748,70.8054,22.2845', retrievedAt:new Date().toISOString(), destinationSource:destination.url, destinationBuildingId:null, roads, buildings, approach:{ osmWayId:approach.id, points:path, distanceToPoiMetres:+best.distance.toFixed(1), navigableRoute:false }, accuracy:'OSM footprints are incomplete. Untagged heights are uniform 8m stylized masses; tagged levels use an approximate 3m per level. Road widths are visual estimates. No Avadh Complex exterior or independently identified building footprint was verified.' };
fs.mkdirSync('public/maps/nexus',{recursive:true}); fs.writeFileSync('public/maps/nexus/map.json',JSON.stringify(result));
fs.copyFileSync('assets/map/nexus/osm-source.osm','public/maps/nexus/osm-source.osm');
console.log(JSON.stringify({roads:roads.length,buildings:buildings.length,heights:buildings.reduce((a,b)=>(a[b.heightSource]=(a[b.heightSource]||0)+1,a),{}),poiContainingFootprints:buildings.filter(b=>b.containsDestination).map(b=>b.id),approachMetres:best.distance,bytes:fs.statSync('public/maps/nexus/map.json').size},null,2));
