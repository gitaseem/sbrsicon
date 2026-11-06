/** Hero backdrop: glassy cells and small molecules drawn in code, echoing the conference flyer. */
(function(){
"use strict";
var S = window.SBRS || {}, cv = document.getElementById("heroField");
if(!cv || !cv.getContext) return;
var hero = cv.parentElement, ctx = cv.getContext("2d"), RM = !!S.reducedMotion;
var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
var w = 0, h = 0, base = 0, dpr = 1, running = false, onScreen = true, born = null;
var aim = { x:0, y:0 }, look = { x:0, y:0 };

// Evenly spread points on a unit sphere: the membrane texture each cell turns.
function sphere(n){
  var pts = [], g = Math.PI * (3 - Math.sqrt(5));
  for(var i = 0; i < n; i++){
    var y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - y * y), a = i * g;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return pts;
}

// Positions are fractions of the hero, sizes a fraction of its scale, depth runs from far (0) to near (1).
// The two large cells are backdrop. Small cells and molecules try their spots in order and take the first
// clear of text, controls, the globe and each other; with no clear spot they are left out.
var CELLS = [
  { x:.93, y:.05, s:.16,  d:.55, spin:.05,  n:560 },
  { s:.034, d:.9,  spin:.12, n:140, spots:[[.53,.70],[.62,.62],[.88,.64],[.9,.36],[.84,.4]] },
  { x:-.04,y:.88, s:.12,  d:.35, spin:-.04, n:420 },
  { s:.022, d:.8,  spin:.15, n:90,  spots:[[.46,.95],[.7,.93],[.3,.97],[.93,.72]] },
  { s:.027, d:.25, spin:-.1, n:110, spots:[[.83,.5],[.95,.55],[.7,.12],[.9,.08]] }
];
var MOLS = [
  { s:.036, d:.75, spin:.16, spots:[[.9,.4],[.86,.3],[.78,.13],[.92,.6],[.82,.36],[.84,.2]],
    atoms:[[0,0,0],[1,.25,.3],[1.75,-.55,-.2],[.45,-1,.45],[-.95,.6,-.3],[-1.7,-.05,.5]],
    bonds:[[0,1],[1,2],[0,3],[0,4],[4,5]] },
  { s:.026, d:.5, spin:-.2, spots:[[.52,.06],[.66,.08],[.75,.04],[.86,.9],[.88,.68]],
    atoms:[[0,0,0],[1,.4,0],[-.85,.7,.3],[.2,-1,-.4]],
    bonds:[[0,1],[0,2],[0,3]] },
  { s:.028, d:.3, spin:.13, spots:[[.42,.86],[.55,.9],[.85,.95],[.15,.97],[.88,.73]],
    atoms:[[0,0,0],[1.05,0,.2],[1.6,.85,-.3],[-.9,-.5,.2]],
    bonds:[[0,1],[1,2],[0,3]] }
];
CELLS.forEach(function(c){ c.pts = sphere(c.n); c.reach = c.s; });
MOLS.forEach(function(m){ m.reach = m.s * 2.1; });

// What the shapes must stay clear of, in hero coordinates: lines of text, the controls, and the globe as a circle.
function keepOut(){
  var hb = hero.getBoundingClientRect(), boxes = [], rounds = [];
  // Inline boxes reach well above and below the glyphs, so text lines are trimmed to roughly their ink.
  function add(r, trim){
    if(!r.width || !r.height) return;
    var cut = r.height * (trim || 0);
    boxes.push({ l:r.left - hb.left, t:r.top - hb.top + cut, r:r.right - hb.left, b:r.bottom - hb.top - cut });
  }
  function lines(el){
    var range = document.createRange(); range.selectNodeContents(el);
    Array.prototype.forEach.call(range.getClientRects(), function(r){ add(r, .16); });
  }
  if(document.createRange){
    // Block-level children (the italic line, the venue line) are measured by their own text, not their full width.
    Array.prototype.forEach.call(hero.querySelectorAll(".hero-mark,.hero-kicker,.hero-when,.hero-theme"), function(el){
      Array.prototype.forEach.call(el.childNodes, function(node){
        if(node.nodeType === 3){ var range = document.createRange(); range.selectNodeContents(node); Array.prototype.forEach.call(range.getClientRects(), function(r){ add(r, .16); }); }
        // Skip line breaks and the screen-reader copy of the title, which is invisible but reports a wide box.
        else if(node.nodeType === 1 && node.tagName !== "BR" && !node.classList.contains("vh")) lines(node);
      });
    });
  }
  Array.prototype.forEach.call(hero.querySelectorAll(".hero-pill,.hero-cta .btn,.hero-go"), function(el){ add(el.getBoundingClientRect()); });
  var stage = hero.querySelector(".hero-stage");
  if(stage){
    var g = stage.getBoundingClientRect();
    if(g.width) rounds.push({ x:g.left + g.width / 2 - hb.left, y:g.top + g.height / 2 - hb.top, r:g.width / 2 });
  }
  return { boxes:boxes, rounds:rounds };
}
function settle(){
  var clear = keepOut(), boxes = clear.boxes, room = 12, placed = clear.rounds.map(function(c){ return { x:c.x, y:c.y, r:c.r + room }; });
  CELLS.concat(MOLS).forEach(function(item){
    if(!item.spots){ item.off = false; return; }
    var r = item.reach * base + room;
    item.off = !item.spots.some(function(spot){
      var cx = spot[0] * w, cy = spot[1] * h;
      var hit = boxes.some(function(b){
        var dx = cx - Math.max(b.l, Math.min(cx, b.r)), dy = cy - Math.max(b.t, Math.min(cy, b.b));
        return dx * dx + dy * dy < r * r;
      }) || placed.some(function(p){
        var dx = cx - p.x, dy = cy - p.y, rr = r + p.r - room;
        return dx * dx + dy * dy < rr * rr;
      });
      if(!hit){ item.x = spot[0]; item.y = spot[1]; placed.push({ x:cx, y:cy, r:r }); }
      return !hit;
    });
  });
}

function turn(p, a, tilt){
  var ca = Math.cos(a), sa = Math.sin(a), x = p[0] * ca + p[2] * sa, z = -p[0] * sa + p[2] * ca;
  var ct = Math.cos(tilt), st = Math.sin(tilt), y = p[1] * ct - z * st;
  return [x, y, p[1] * st + z * ct];
}

function place(item, t, scroll){
  var bob = RM ? 0 : Math.sin(t * 0.00035 + item.x * 9) * 7 * item.d;
  return {
    x: item.x * w + look.x * 28 * item.d,
    y: item.y * h + look.y * 18 * item.d + bob - scroll * 0.12 * item.d
  };
}

function drawCell(c, t, scroll){
  if(c.off) return;
  var at = place(c, t, scroll), R = c.s * base, fade = 0.45 + 0.55 * c.d;
  if(at.x + R < 0 || at.x - R > w || at.y + R < 0 || at.y - R > h) return;
  var body = ctx.createRadialGradient(at.x - R * .35, at.y - R * .4, R * .05, at.x, at.y, R);
  body.addColorStop(0, "rgba(255,255,255," + (.6 * fade) + ")");
  body.addColorStop(.55, "rgba(165,200,255," + (.26 * fade) + ")");
  body.addColorStop(1, "rgba(60,120,235," + (.42 * fade) + ")");
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(at.x, at.y, R, 0, 6.2832); ctx.fill();

  // Membrane: the near half of the dotted sphere, brighter and larger towards the viewer.
  var a = t * 0.0001 * c.spin * 6, dot = Math.max(.6, R * .024);
  for(var i = 0; i < c.pts.length; i++){
    var q = turn(c.pts[i], a, .38);
    if(q[2] <= 0) continue;
    ctx.globalAlpha = (.1 + .55 * q[2] * q[2]) * fade;
    ctx.beginPath(); ctx.arc(at.x + q[0] * R * .96, at.y + q[1] * R * .96, dot * (.45 + .55 * q[2]), 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = Math.max(1, R * .012);
  ctx.strokeStyle = "rgba(255,255,255," + (.75 * fade) + ")";
  ctx.beginPath(); ctx.arc(at.x, at.y, R, 3.6, 5.4); ctx.stroke();
  ctx.strokeStyle = "rgba(26,85,232," + (.22 * fade) + ")";
  ctx.beginPath(); ctx.arc(at.x, at.y, R - ctx.lineWidth, 0, 6.2832); ctx.stroke();
}

function drawMol(m, t, scroll){
  if(m.off) return;
  var at = place(m, t, scroll), k = m.s * base, a = RM ? .6 : t * 0.0001 * m.spin * 6, fade = 0.5 + 0.5 * m.d;
  var pts = m.atoms.map(function(p){ var q = turn(p, a, .5); return { x: at.x + q[0] * k, y: at.y + q[1] * k, z: q[2] }; });
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(26,85,232," + (.38 * fade) + ")";
  ctx.lineWidth = Math.max(1.2, k * .12);
  m.bonds.forEach(function(b){
    ctx.beginPath(); ctx.moveTo(pts[b[0]].x, pts[b[0]].y); ctx.lineTo(pts[b[1]].x, pts[b[1]].y); ctx.stroke();
  });
  pts.slice().sort(function(p, q){ return p.z - q.z; }).forEach(function(p){
    var r = k * .34 * (.82 + .18 * p.z);
    var g = ctx.createRadialGradient(p.x - r * .35, p.y - r * .4, r * .1, p.x, p.y, r);
    g.addColorStop(0, "rgba(255,255,255," + fade + ")");
    g.addColorStop(.45, "rgba(120,170,255," + fade + ")");
    g.addColorStop(1, "rgba(26,85,232," + fade + ")");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
  });
}

function draw(t){
  var scroll = Math.max(0, -hero.getBoundingClientRect().top);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // A short fade on first paint, so the scene settles in rather than popping.
  if(born === null) born = t;
  ctx.globalAlpha = 1;
  var intro = RM ? 1 : Math.min(1, (t - born) / 900);
  cv.style.opacity = intro;
  // Far things first so near ones overlap them.
  var all = CELLS.map(function(c){ return { d:c.d, f:drawCell, o:c }; })
    .concat(MOLS.map(function(m){ return { d:m.d, f:drawMol, o:m }; }))
    .sort(function(p, q){ return p.d - q.d; });
  all.forEach(function(e){ e.f(e.o, t, scroll); });
}

function frame(t){
  look.x += (aim.x - look.x) * .06; look.y += (aim.y - look.y) * .06;
  draw(t);
  if(running) window.requestAnimationFrame(frame);
}
function start(){
  if(RM){ draw(performance.now()); return; }
  if(running || !onScreen || document.hidden) return;
  running = true; window.requestAnimationFrame(frame);
}
function stop(){ running = false; }

function size(){
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = hero.clientWidth; h = hero.clientHeight;
  base = Math.max(w, h * .75);
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  settle();
  if(!running) draw(performance.now());
}

size();
// Web fonts change the title's shape, so measure again once they are in.
if(document.fonts && document.fonts.ready) document.fonts.ready.then(size);
if(window.ResizeObserver) new ResizeObserver(size).observe(hero);
else window.addEventListener("resize", size, { passive:true });

if(!RM){
  if(window.IntersectionObserver){
    new IntersectionObserver(function(es){ onScreen = es[0].isIntersecting; onScreen ? start() : stop(); }).observe(hero);
  }
  document.addEventListener("visibilitychange", function(){ document.hidden ? stop() : start(); });
  if(fine){
    window.addEventListener("pointermove", function(e){
      aim.x = e.clientX / window.innerWidth - .5; aim.y = e.clientY / window.innerHeight - .5;
    }, { passive:true });
  }
  start();
}
})();
