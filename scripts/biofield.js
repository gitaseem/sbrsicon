/** Hero backdrop: a field of glassy cells and small molecules drawn in code, echoing the conference flyer.
 *  The hero's one off colour, the palette green, lives only here: a spark that follows the cursor or a finger, lights up
 *  what it passes and pushes cells aside, and a pulse that ripples out from a click or tap. */
(function(){
"use strict";
var S = window.SBRS || {}, cv = document.getElementById("heroField");
if(!cv || !cv.getContext) return;
var hero = cv.parentElement, ctx = cv.getContext("2d"), RM = !!S.reducedMotion;
var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
var w = 0, h = 0, base = 0, dpr = 1, running = false, onScreen = true, born = null, greeted = false;
var aim = { x:0, y:0 }, look = { x:0, y:0 };

// The spark colour comes from --spark and --spark-deep on .hero (styles/hero.css), so it can be changed in CSS.
var GLOW = "124,203,137", GLOW_DEEP = "56,169,101";
function rgb(hex, fallback){
  var m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec((hex || "").trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)].join(",") : fallback;
}
function readColours(){
  var css = getComputedStyle(hero);
  GLOW = rgb(css.getPropertyValue("--spark"), GLOW);
  GLOW_DEEP = rgb(css.getPropertyValue("--spark-deep"), GLOW_DEEP);
}
var spark = { x:null, y:null }, reach = 160, links = [], pointer = null, pulses = [];

// Evenly spread points on a unit sphere: the membrane texture each cell turns.
function sphere(n){
  var pts = [], g = Math.PI * (3 - Math.sqrt(5));
  for(var i = 0; i < n; i++){
    var y = 1 - 2 * (i + 0.5) / n, r = Math.sqrt(1 - y * y), a = i * g;
    pts.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return pts;
}
// Seeded random numbers, so the field lands in the same places on every visit.
function seeded(seed){
  return function(){
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Positions are fractions of the hero, sizes a fraction of its scale, depth runs from far (0) to near (1).
// Two large backdrop cells sit at the corners; molecules try their spots in order; the field of smaller
// cells is scattered into whatever space is left. Nothing but the backdrop may sit on text, controls or the globe.
var BIG = [
  { x:.93, y:.05, s:.16, d:.55, spin:.05,  pts:sphere(560) },
  { x:-.04,y:.88, s:.12, d:.35, spin:-.04, pts:sphere(420) }
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
var FIELD = [];

// What the shapes must stay clear of, in hero coordinates: lines of text, the controls, and the globe as a circle.
function keepOut(){
  var hb = hero.getBoundingClientRect(), boxes = [], rounds = [];
  // Inline boxes reach well above and below the glyphs, so text lines are trimmed to roughly their ink.
  function add(r, trim){
    if(!r.width || !r.height) return;
    var cut = r.height * (trim || 0);
    boxes.push({ l:r.left - hb.left, t:r.top - hb.top + cut, r:r.right - hb.left, b:r.bottom - hb.top - cut });
  }
  function lines(node){
    var range = document.createRange(); range.selectNodeContents(node);
    Array.prototype.forEach.call(range.getClientRects(), function(r){ add(r, .16); });
  }
  if(document.createRange){
    // Block-level children (the italic line, the venue line) are measured by their own text, not their full width.
    Array.prototype.forEach.call(hero.querySelectorAll(".hero-mark,.hero-kicker,.hero-when,.hero-theme"), function(el){
      Array.prototype.forEach.call(el.childNodes, function(node){
        if(node.nodeType === 3) lines(node);
        // Skip line breaks and the screen-reader copy of the title, which is invisible but reports a wide box.
        else if(node.nodeType === 1 && node.tagName !== "BR" && !node.classList.contains("vh")) lines(node);
      });
    });
  }
  Array.prototype.forEach.call(hero.querySelectorAll(".hero-pill,.hero-count,.hero-cta .btn,.hero-go,.gl-hint"), function(el){ add(el.getBoundingClientRect()); });
  var stage = hero.querySelector(".hero-stage");
  if(stage){
    var g = stage.getBoundingClientRect();
    if(g.width) rounds.push({ x:g.left + g.width / 2 - hb.left, y:g.top + g.height / 2 - hb.top, r:g.width / 2 });
  }
  return { boxes:boxes, rounds:rounds };
}

function settle(){
  var clear = keepOut(), boxes = clear.boxes, room = 14;
  var placed = clear.rounds.map(function(c){ return { x:c.x, y:c.y, r:c.r }; });
  function free(cx, cy, r){
    return !boxes.some(function(b){
      var dx = cx - Math.max(b.l, Math.min(cx, b.r)), dy = cy - Math.max(b.t, Math.min(cy, b.b));
      return dx * dx + dy * dy < (r + room) * (r + room);
    }) && !placed.some(function(p){
      var dx = cx - p.x, dy = cy - p.y, rr = r + p.r + 6;
      return dx * dx + dy * dy < rr * rr;
    });
  }
  MOLS.forEach(function(m){
    var r = m.s * 2.1 * base;
    m.off = !m.spots.some(function(spot){
      var ok = free(spot[0] * w, spot[1] * h, r);
      if(ok){ m.x = spot[0]; m.y = spot[1]; placed.push({ x:m.x * w, y:m.y * h, r:r }); }
      return ok;
    });
  });
  // The field: about one cell per 52,000 px² of hero, smaller ones far more common than large.
  var rand = seeded(2027), want = Math.max(10, Math.min(30, Math.round(w * h / 52000)));
  var rmin = Math.max(7, base * .007), rmax = Math.max(rmin + 6, base * .03);
  FIELD = [];
  for(var tries = 0; tries < 1400 && FIELD.length < want; tries++){
    var r = rmin + (rmax - rmin) * Math.pow(rand(), 1.7);
    var cx = -r * .3 + rand() * (w + r * .6), cy = -r * .3 + rand() * (h + r * .6);
    var d = .25 + rand() * .7, spin = (rand() - .5) * .3;
    if(!free(cx, cy, r)) continue;
    placed.push({ x:cx, y:cy, r:r });
    FIELD.push({ x:cx / w, y:cy / h, s:r / base, d:d, spin:spin, a0:rand() * 6.28,
      pts:sphere(Math.max(24, Math.min(140, Math.round(r * 1.8)))), ox:0, oy:0, light:0 });
  }
}

function turn(p, a, tilt){
  var ca = Math.cos(a), sa = Math.sin(a), x = p[0] * ca + p[2] * sa, z = -p[0] * sa + p[2] * ca;
  var ct = Math.cos(tilt), st = Math.sin(tilt), y = p[1] * ct - z * st;
  return [x, y, p[1] * st + z * ct];
}

function home(item, t, scroll){
  var bob = RM ? 0 : Math.sin(t * 0.00035 + item.x * 9) * 7 * item.d;
  return {
    x: item.x * w + look.x * 28 * item.d,
    y: item.y * h + look.y * 18 * item.d + bob - scroll * 0.12 * item.d
  };
}
function place(item, t, scroll){
  var at = home(item, t, scroll);
  at.x += item.ox || 0; at.y += item.oy || 0;
  return at;
}

// Cells and molecules give way to the spark, then float back.
function push(item, t, scroll){
  var at = home(item, t, scroll), dx = at.x - spark.x, dy = at.y - spark.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;
  var zone = reach * 1.2, tx = 0, ty = 0;
  if(dist < zone){
    var k = 1 - dist / zone, shove = k * k * 34 * (.4 + .6 * item.d);
    tx = dx / dist * shove; ty = dy / dist * shove;
  }
  item.ox = (item.ox || 0) + (tx - (item.ox || 0)) * .1;
  item.oy = (item.oy || 0) + (ty - (item.oy || 0)) * .1;
}

// How strongly the pulses are lighting a point right now (0 to 1).
function pulseAt(x, y, t){
  var best = 0;
  pulses.forEach(function(p){
    var r = (t - p.t0) * .8, band = 70, life = 1 - r / p.max;
    var off = Math.abs(Math.hypot(x - p.x, y - p.y) - r);
    if(off < band && life > 0) best = Math.max(best, (1 - off / band) * life);
  });
  return best;
}

function aimSpark(t){
  var hb = hero.getBoundingClientRect(), tx, ty, follow = false;
  if(pointer && t - pointer.t < 2600){
    tx = pointer.x - hb.left; ty = pointer.y - hb.top;
    follow = tx >= 0 && ty >= 0 && tx <= w && ty <= h;
  }
  if(!follow){
    // Left alone it drifts over the cells: the right side on wide screens, the top-right cell on narrow ones, away from the text.
    var u = RM ? 0 : t, narrow = w < 700;
    tx = w * (narrow ? .86 + .08 * Math.sin(u * .00017) : .8 + .11 * Math.sin(u * .00017));
    ty = narrow ? h * .07 + h * .05 * Math.sin(u * .00029 + 1.3) : h * (.36 + .2 * Math.sin(u * .00029 + 1.3));
  }
  if(spark.x === null || RM){ spark.x = tx; spark.y = ty; return; }
  var ease = follow ? .2 : .03;
  spark.x += (tx - spark.x) * ease; spark.y += (ty - spark.y) * ease;
}

function link(x, y, k){ links.push({ x:x, y:y, k:k }); }

function drawCell(c, t, scroll){
  var at = place(c, t, scroll), R = c.s * base, fade = 0.45 + 0.55 * c.d;
  if(at.x + R < 0 || at.x - R > w || at.y + R < 0 || at.y - R > h) return;
  var flash = pulseAt(at.x, at.y, t);
  var body = ctx.createRadialGradient(at.x - R * .35, at.y - R * .4, R * .05, at.x, at.y, R);
  body.addColorStop(0, "rgba(255,255,255," + (.6 * fade) + ")");
  body.addColorStop(.55, flash > .05 ? "rgba(" + GLOW + "," + (.35 * flash * fade) + ")" : "rgba(150,196,246," + (.26 * fade) + ")");
  body.addColorStop(1, "rgba(60,120,235," + (.42 * fade) + ")");
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(at.x, at.y, R, 0, 6.2832); ctx.fill();

  // Membrane: the near half of the dotted sphere. Dots near the spark, or under a passing pulse, turn green.
  var a = (c.a0 || 0) + t * 0.0001 * c.spin * 6, dot = Math.max(.6, R * .024), lit = [], r2 = reach * reach;
  for(var i = 0; i < c.pts.length; i++){
    var q = turn(c.pts[i], a, .38);
    if(q[2] <= 0) continue;
    var px = at.x + q[0] * R * .96, py = at.y + q[1] * R * .96, size = dot * (.45 + .55 * q[2]);
    var dx = px - spark.x, dy = py - spark.y, dd = dx * dx + dy * dy;
    var glow = Math.max(dd < r2 ? 1 - Math.sqrt(dd) / reach : 0, flash);
    if(glow > .02){ lit.push([px, py, size, glow]); continue; }
    ctx.globalAlpha = (.1 + .55 * q[2] * q[2]) * fade;
    ctx.beginPath(); ctx.arc(px, py, size, 0, 6.2832); ctx.fill();
  }
  ctx.globalAlpha = 1;
  lit.forEach(function(p){
    ctx.fillStyle = "rgba(" + GLOW_DEEP + "," + (.45 + .55 * p[3]) + ")";
    ctx.beginPath(); ctx.arc(p[0], p[1], p[2] * (1 + 1.1 * p[3]), 0, 6.2832); ctx.fill();
  });
  ctx.lineWidth = Math.max(1, R * .012);
  ctx.strokeStyle = "rgba(255,255,255," + (.75 * fade) + ")";
  ctx.beginPath(); ctx.arc(at.x, at.y, R, 3.6, 5.4); ctx.stroke();
  ctx.strokeStyle = flash > .05 ? "rgba(" + GLOW_DEEP + "," + (.8 * flash) + ")" : "rgba(5,102,242," + (.22 * fade) + ")";
  ctx.beginPath(); ctx.arc(at.x, at.y, R - ctx.lineWidth, 0, 6.2832); ctx.stroke();

  var gap = Math.hypot(spark.x - at.x, spark.y - at.y), edge = gap - R;
  if(edge > 8 && edge < reach * 1.4){
    var f = R / gap;
    link(at.x + (spark.x - at.x) * f, at.y + (spark.y - at.y) * f, 1 - edge / (reach * 1.4));
  }
}

function drawMol(m, t, scroll){
  if(m.off) return;
  var at = place(m, t, scroll), k = m.s * base, a = RM ? .6 : t * 0.0001 * m.spin * 6, fade = 0.5 + 0.5 * m.d;
  var pts = m.atoms.map(function(p){ var q = turn(p, a, .5); return { x: at.x + q[0] * k, y: at.y + q[1] * k, z: q[2] }; });
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(5,102,242," + (.38 * fade) + ")";
  ctx.lineWidth = Math.max(1.2, k * .12);
  m.bonds.forEach(function(b){
    ctx.beginPath(); ctx.moveTo(pts[b[0]].x, pts[b[0]].y); ctx.lineTo(pts[b[1]].x, pts[b[1]].y); ctx.stroke();
  });
  pts.slice().sort(function(p, q){ return p.z - q.z; }).forEach(function(p){
    var r = k * .34 * (.82 + .18 * p.z);
    var near = 1 - Math.hypot(p.x - spark.x, p.y - spark.y) / (reach * 1.4);
    var g = ctx.createRadialGradient(p.x - r * .35, p.y - r * .4, r * .1, p.x, p.y, r);
    g.addColorStop(0, "rgba(255,255,255," + fade + ")");
    if(near > .35 || pulseAt(p.x, p.y, t) > .3){
      g.addColorStop(.45, "rgba(" + GLOW + "," + fade + ")");
      g.addColorStop(1, "rgba(" + GLOW_DEEP + "," + fade + ")");
      if(near > .35) link(p.x, p.y, near);
    } else {
      g.addColorStop(.45, "rgba(93,163,239," + fade + ")");
      g.addColorStop(1, "rgba(5,102,242," + fade + ")");
    }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.fill();
  });
}

function drawPulses(t){
  pulses = pulses.filter(function(p){ return (t - p.t0) * .8 < p.max; });
  pulses.forEach(function(p){
    var r = (t - p.t0) * .8, life = 1 - r / p.max;
    ctx.strokeStyle = "rgba(" + GLOW_DEEP + "," + (.55 * life) + ")";
    ctx.lineWidth = 1 + 2 * life;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.2832); ctx.stroke();
    ctx.strokeStyle = "rgba(" + GLOW + "," + (.35 * life) + ")";
    ctx.lineWidth = 6 * life;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0, r - 6), 0, 6.2832); ctx.stroke();
  });
}

function drawSpark(){
  links.sort(function(p, q){ return q.k - p.k; });
  ctx.lineCap = "round";
  links.slice(0, 7).forEach(function(l){
    ctx.strokeStyle = "rgba(" + GLOW_DEEP + "," + (.2 + .55 * l.k) + ")";
    ctx.lineWidth = 1 + l.k;
    ctx.beginPath(); ctx.moveTo(spark.x, spark.y); ctx.lineTo(l.x, l.y); ctx.stroke();
    ctx.fillStyle = "rgba(" + GLOW_DEEP + "," + (.5 + .5 * l.k) + ")";
    ctx.beginPath(); ctx.arc(l.x, l.y, 2 + 1.5 * l.k, 0, 6.2832); ctx.fill();
  });
  var glow = ctx.createRadialGradient(spark.x, spark.y, 0, spark.x, spark.y, reach * .6);
  glow.addColorStop(0, "rgba(" + GLOW + ",.42)");
  glow.addColorStop(1, "rgba(" + GLOW + ",0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(spark.x, spark.y, reach * .6, 0, 6.2832); ctx.fill();
  var core = ctx.createRadialGradient(spark.x - 2, spark.y - 2, .5, spark.x, spark.y, 7);
  core.addColorStop(0, "#FFFFFF");
  core.addColorStop(.45, "rgb(" + GLOW + ")");
  core.addColorStop(1, "rgb(" + GLOW_DEEP + ")");
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(spark.x, spark.y, 7, 0, 6.2832); ctx.fill();
}

function ripple(x, y, t){
  if(RM) return;
  pulses.push({ x:x, y:y, t0:t, max:Math.hypot(w, h) * .75 });
  if(pulses.length > 4) pulses.shift();
}

function draw(t){
  var scroll = Math.max(0, -hero.getBoundingClientRect().top);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // A short fade on first paint, so the scene settles in rather than popping.
  if(born === null) born = t;
  cv.style.opacity = RM ? 1 : Math.min(1, (t - born) / 900);
  reach = Math.max(110, Math.min(210, base * .11));
  links.length = 0;
  aimSpark(t);
  // One pulse greets the visitor shortly after load, so the click is discoverable.
  if(!greeted && !RM && t - born > 1300){ greeted = true; ripple(spark.x, spark.y, t); }
  if(!RM){
    FIELD.forEach(function(c){ push(c, t, scroll); });
    MOLS.forEach(function(m){ if(!m.off) push(m, t, scroll); });
  }
  // Far things first so near ones overlap them.
  BIG.map(function(c){ return { d:c.d, f:drawCell, o:c }; })
    .concat(FIELD.map(function(c){ return { d:c.d, f:drawCell, o:c }; }))
    .concat(MOLS.map(function(m){ return { d:m.d, f:drawMol, o:m }; }))
    .sort(function(p, q){ return p.d - q.d; })
    .forEach(function(e){ ctx.globalAlpha = 1; e.f(e.o, t, scroll); });
  ctx.globalAlpha = 1;
  drawPulses(t);
  drawSpark();
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
  readColours();
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
  // Any pointer steers the spark, a finger included; it drifts again a moment after the pointer goes quiet.
  var steer = function(e){ pointer = { x:e.clientX, y:e.clientY, t:performance.now() }; };
  window.addEventListener("pointermove", steer, { passive:true });
  window.addEventListener("pointerdown", steer, { passive:true });
  document.addEventListener("mouseleave", function(){ pointer = null; });
  // Rapid clicking would otherwise double- and triple-click the text: the browser selects a line, and the next
  // press starts a native drag of that selection, which stops pointer events, so the spark froze and pulses stopped.
  // Multi-clicks no longer select, and dragging a selection is off here. A plain click-and-drag still selects text.
  var own = function(e){ return e.target.closest && e.target.closest("a,button,input,textarea,select"); };
  hero.addEventListener("mousedown", function(e){ if(e.detail > 1 && !own(e)) e.preventDefault(); });
  hero.addEventListener("dragstart", function(e){ e.preventDefault(); });
  // A click or tap on the open background sends a pulse. Links, buttons and the globe keep their own clicks.
  hero.addEventListener("click", function(e){
    if(e.target.closest && e.target.closest("a,button,input,.hero-stage")) return;
    var hb = hero.getBoundingClientRect();
    ripple(e.clientX - hb.left, e.clientY - hb.top, performance.now());
  });
  start();
}
})();
