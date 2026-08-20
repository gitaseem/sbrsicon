/* Precompute the dotted-globe payload so the page needs no d3 and no runtime GeoJSON fetch. */
const fs = require('fs');
const land = JSON.parse(fs.readFileSync('land.json', 'utf8'));

// ---- geometry helpers -------------------------------------------------
function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function inFeature(x, y, coords) {
  if (!inRing(x, y, coords[0])) return false;
  for (let i = 1; i < coords.length; i++) if (inRing(x, y, coords[i])) return false;
  return true;
}
// bbox cache so we skip 126 polygons per point
const polys = land.features.map(f => {
  const c = f.geometry.coordinates;
  let minX = 180, minY = 90, maxX = -180, maxY = -90;
  for (const p of c[0]) {
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
  }
  return { c, minX, minY, maxX, maxY };
});
function isLand(x, y) {
  for (const p of polys) {
    if (x < p.minX || x > p.maxX || y < p.minY || y > p.maxY) continue;
    if (inFeature(x, y, p.c)) return true;
  }
  return false;
}

// ---- equal-area dot lattice ------------------------------------------
const STEP = 2.0;                        // degrees of latitude between dot rows
const dots = [];
for (let lat = -84; lat <= 84.001; lat += STEP) {
  const n = Math.max(1, Math.round((360 * Math.cos(lat * Math.PI / 180)) / STEP));
  for (let i = 0; i < n; i++) {
    const lng = -180 + (i * 360) / n;
    if (isLand(lng, lat)) dots.push([lng, lat]);
  }
}

// ---- coastline outlines, Douglas-Peucker simplified -------------------
function perp(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (!dx && !dy) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const cx = a[0] + t * dx, cy = a[1] + t * dy;
  return Math.hypot(p[0] - cx, p[1] - cy);
}
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  let idx = 0, max = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perp(pts[i], pts[0], pts[pts.length - 1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max > tol) {
    const l = simplify(pts.slice(0, idx + 1), tol), r = simplify(pts.slice(idx), tol);
    return l.slice(0, -1).concat(r);
  }
  return [pts[0], pts[pts.length - 1]];
}
const rings = [];
for (const f of land.features) {
  for (const ring of f.geometry.coordinates) {
    const s = simplify(ring, 0.7);
    if (s.length > 3) rings.push(s);
  }
}

// ---- base36 packing ---------------------------------------------------
// lng/lat quantised to 0.25 deg -> single int -> fixed 4-char base36
const enc = ([lng, lat]) => {
  const li = Math.round((lng + 180) * 4), la = Math.round((lat + 90) * 4);
  return (Math.min(1440, Math.max(0, li)) * 721 + Math.min(720, Math.max(0, la)))
    .toString(36).padStart(4, '0');
};
const dotStr = dots.map(enc).join('');
const ringStr = rings.map(r => r.map(enc).join('')).join(' ');

const out = `var GLOBE_DOTS=${JSON.stringify(dotStr)};\nvar GLOBE_RINGS=${JSON.stringify(ringStr)};\n`;
fs.writeFileSync('globe-payload.js', out);
console.log('dots      :', dots.length, '->', (dotStr.length / 1024).toFixed(1), 'KB');
console.log('rings     :', rings.length, 'pts', rings.reduce((a, r) => a + r.length, 0),
            '->', (ringStr.length / 1024).toFixed(1), 'KB');
console.log('payload   :', (out.length / 1024).toFixed(1), 'KB');
