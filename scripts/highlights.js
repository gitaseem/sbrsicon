/** Conference highlights: four small diagrams drawn in code, each scrubbed by pointer, finger or slider. They draw only when something changes. */
(function(){
"use strict";
var $$ = window.SBRS.selectAll, clamp = window.SBRS.clamp, RM = window.SBRS.reducedMotion;
var W = 400, H = 300, TAU = Math.PI * 2;
var labs = $$(".hl-lab");
if(!labs.length) return;

var css = getComputedStyle(document.documentElement);
function token(name, fallback){ return css.getPropertyValue(name).trim() || fallback; }
var INK = token("--ink", "#0E1F57"), POP = token("--pop", "#1A55E8"), MUTED = token("--muted", "#46557E"), TINT = token("--tint", "#EDF3FF"), WHITE = token("--white", "#FFFFFF");

function line(c, points, width, colour){
  c.beginPath();
  points.forEach(function(p, i){ if(i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
  c.lineWidth = width;
  c.strokeStyle = colour;
  c.stroke();
}

/* 3D bioprinting: a woodpile scaffold laid down strand by strand, each layer crossing the last. */
var LAYERS = 8, STRANDS = 7;
var PRINTED = 0.95;   // the last stretch of the scrub lifts the nozzle clear
function iso(x, y, z){ return [200 + (x - y) * 73, 186 + (x + y) * 42 - z * 10]; }
function strandEnds(layer, j){
  var at = -0.84 + j * 0.28, flip = j % 2 ? -1 : 1;
  return layer % 2
    ? [iso(at, -flip, layer), iso(at, flip, layer)]
    : [iso(-flip, at, layer), iso(flip, at, layer)];
}
function tube(c, a, b, fill){
  c.lineCap = "round";
  line(c, [a, b], 7.4, INK);
  line(c, [a, b], 5, fill);
}
var print = {
  verb: "print",
  read: function(t){ return "Layer " + clamp(Math.floor(t / PRINTED * LAYERS) + 1, 1, LAYERS) + " of " + LAYERS; },
  draw: function(c, t){
    var plate = [iso(-1.16, -1.16, -0.8), iso(1.16, -1.16, -0.8), iso(1.16, 1.16, -0.8), iso(-1.16, 1.16, -0.8)];
    c.beginPath();
    plate.forEach(function(p, i){ if(i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
    c.closePath();
    c.fillStyle = TINT;
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = INK;
    c.stroke();

    var total = LAYERS * STRANDS, done = Math.min(1, t / PRINTED) * total, tip = strandEnds(0, 0)[0], layer, j;
    for(var n = 0; n < total && n < done; n++){
      layer = Math.floor(n / STRANDS);
      j = n % STRANDS;
      var ends = strandEnds(layer, j), amount = Math.min(1, done - n);
      tip = [ends[0][0] + (ends[1][0] - ends[0][0]) * amount, ends[0][1] + (ends[1][1] - ends[0][1]) * amount];
      tube(c, ends[0], tip, n + 1 >= done - 0.0001 && t < PRINTED ? POP : WHITE);
    }
    // The nozzle follows the tip, then rises above the finished scaffold.
    var lift = clamp((t - PRINTED) / (1 - PRINTED), 0, 1);
    var x = tip[0] + (200 - tip[0]) * lift, y = tip[1] - 5 + (36 - (tip[1] - 5)) * lift;
    c.fillStyle = INK;
    c.beginPath();
    c.moveTo(x, y); c.lineTo(x - 5, y - 13); c.lineTo(x - 11, y - 13); c.lineTo(x - 11, y - 44); c.lineTo(x + 11, y - 44); c.lineTo(x + 11, y - 13); c.lineTo(x + 5, y - 13);
    c.closePath();
    c.fill();
    line(c, [[x, y - 44], [x, -2]], 2, INK);
  }
};

/* 4D biomanufacturing: one flat lattice that curls shut over time. */
var PETALS = 8, SEGMENTS = 7;
var fold = {
  verb: "fold",
  read: function(t){ return "Folded " + Math.round(t * 100) + "%"; },
  draw: function(c, t){
    // The view moves in as the form closes, so the finished bud still fills the figure.
    var quads = [], turn = t * 0.42, yaw = t * 0.7, zoom = 1 + t * 0.75, base = 150 + t * 50;
    function place(r, z, side, petal){
      var phi = petal / PETALS * TAU + yaw, cos = Math.cos(phi), sin = Math.sin(phi);
      var x = r * cos - side * sin, y = r * sin + side * cos;
      return { x: 200 + x * zoom, y: base + (y * 0.62 - z * 0.78) * zoom, depth: y * 0.78 + z * 0.62 };
    }
    for(var petal = 0; petal < PETALS; petal++){
      var r = 18, z = 0, angle = 0;
      for(var k = 0; k < SEGMENTS; k++){
        angle += turn;
        var nextR = r + Math.cos(angle) * 16, nextZ = z + Math.sin(angle) * 16;
        var inner = 10.5 * Math.sin(Math.PI * Math.pow((k + 0.35) / (SEGMENTS + 0.3), 0.72)) + 3;
        var outer = 10.5 * Math.sin(Math.PI * Math.pow((k + 1.35) / (SEGMENTS + 0.3), 0.72)) + 3;
        var a = place(r, z, -inner, petal), b = place(r, z, inner, petal), d = place(nextR, nextZ, outer, petal), e = place(nextR, nextZ, -outer, petal);
        quads.push({ p: [a, b, d, e], depth: (a.depth + b.depth + d.depth + e.depth) / 4, tip: k === SEGMENTS - 1 });
        r = nextR; z = nextZ;
      }
    }
    quads.sort(function(m, n){ return m.depth - n.depth; });
    c.lineJoin = "round";
    c.lineCap = "butt";
    quads.forEach(function(q){
      c.beginPath();
      q.p.forEach(function(p, i){ if(i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); });
      c.closePath();
      c.fillStyle = q.tip ? POP : WHITE;
      c.fill();
      c.lineWidth = 0.9;
      c.strokeStyle = INK;
      c.stroke();
      if(!q.tip){
        line(c, [[q.p[0].x, q.p[0].y], [q.p[2].x, q.p[2].y]], 0.6, MUTED);
        line(c, [[q.p[1].x, q.p[1].y], [q.p[3].x, q.p[3].y]], 0.6, MUTED);
      }
    });
  }
};

/* Advanced medical devices: a stent opening a narrowed vessel. */
var stent = {
  verb: "expand",
  read: function(t){ return "Expanded " + Math.round(t * 100) + "%"; },
  draw: function(c, t){
    var MID = 150, FULL = 112;
    function lumen(x){ var u = (x - 200) / 74; return FULL * (1 - 0.64 * (1 - t) * Math.exp(-u * u)); }
    function trace(sign, from, to, value){
      var points = [];
      for(var x = from; x <= to; x += 6) points.push([x, MID + sign * value(x)]);
      return points;
    }
    [-1, 1].forEach(function(sign){
      // Vessel wall, then the plaque that narrows it. The plaque presses flat as the stent opens.
      var outer = trace(sign, 0, 402, function(){ return FULL + 13; });
      var wall = trace(sign, 0, 402, function(){ return FULL; });
      var inner = trace(sign, 0, 402, lumen);
      c.beginPath();
      outer.concat(wall.slice().reverse()).forEach(function(p, i){ if(i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
      c.closePath();
      c.fillStyle = TINT;
      c.fill();
      c.beginPath();
      wall.concat(inner.slice().reverse()).forEach(function(p, i){ if(i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); });
      c.closePath();
      c.fillStyle = POP;
      c.fill();
      c.lineCap = "butt";
      line(c, outer, 1, INK);
      line(c, wall, 1, INK);
    });
    // Flow lines squeeze through the narrowing, then straighten.
    c.setLineDash([3, 7]);
    [-0.66, -0.33, 0, 0.33, 0.66].forEach(function(f){
      line(c, trace(1, 0, 402, function(x){ return f * (lumen(x) - 4); }), 1, MUTED);
    });
    c.setLineDash([]);

    var RINGS = 10, ROUND = 12, half = 118 - 14 * t, radius = 19 + t * (FULL - 21), dx = half * 2 / RINGS;
    function node(i, j){
      var phi = (j + (i % 2 ? 0.5 : 0)) / ROUND * TAU;
      return { x: 200 - half + i * dx, y: MID + Math.sin(phi) * radius, front: Math.cos(phi) };
    }
    [false, true].forEach(function(frontPass){
      for(var i = 0; i < RINGS; i++){
        for(var j = 0; j < ROUND; j++){
          var a = node(i, j), b = node(i + 1, j), d = node(i + 1, j + (i % 2 ? 1 : -1));
          [b, d].forEach(function(end){
            var front = a.front + end.front > 0;
            if(front !== frontPass) return;
            line(c, [[a.x, a.y], [end.x, end.y]], front ? 1.5 : 0.7, front ? INK : MUTED);
          });
        }
      }
    });
  }
};

/* Biomanufactured products: cells spread out from a seed until the dish is full. */
function seeded(n){ var v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); }
var CX = 200, CY = 150, DISH = 132;
var cells = [];
for(var row = -10; row <= 10; row++){
  for(var col = -10; col <= 10; col++){
    var cellX = CX + (col + (row % 2 ? 0.5 : 0)) * 15.5 + (seeded(row * 31 + col) - 0.5) * 4;
    var cellY = CY + row * 13.4 + (seeded(row * 17 - col * 3) - 0.5) * 4;
    if(Math.hypot(cellX - CX, cellY - CY) < DISH - 8) cells.push({ x: cellX, y: cellY, noise: seeded(row * 7 + col * 13) * 0.05, born: 0 });
  }
}
var seed = { x: 0, y: 0 };
function plant(x, y){
  var off = Math.hypot(x - CX, y - CY), edge = DISH - 14;
  if(off > edge){ x = CX + (x - CX) / off * edge; y = CY + (y - CY) / off * edge; }
  seed.x = x; seed.y = y;
  var far = 1;
  cells.forEach(function(cell){ far = Math.max(far, Math.hypot(cell.x - x, cell.y - y)); });
  cells.forEach(function(cell){ cell.born = Math.hypot(cell.x - x, cell.y - y) / far * 0.8 + cell.noise; });
}
plant(170, 130);
var culture = {
  verb: "grow",
  extra: " · {tap} to reseed",
  read: function(t){
    var alive = 0;
    cells.forEach(function(cell){ if(cell.born <= t) alive++; });
    return "Coverage " + Math.round(alive / cells.length * 100) + "%";
  },
  draw: function(c, t){
    c.beginPath();
    c.arc(CX, CY, DISH, 0, TAU);
    c.fillStyle = TINT;
    c.fill();
    c.lineWidth = 1;
    c.strokeStyle = INK;
    c.stroke();
    cells.forEach(function(cell){
      var age = (t - cell.born) / 0.09;
      if(age <= 0) return;
      var size = clamp(age, 0, 1), fresh = age < 1.5;
      c.beginPath();
      c.arc(cell.x, cell.y, 7 * (1 - Math.pow(1 - size, 3)), 0, TAU);
      c.fillStyle = fresh ? POP : WHITE;
      c.fill();
      c.lineWidth = 0.9;
      c.strokeStyle = INK;
      c.stroke();
      c.beginPath();
      c.arc(cell.x, cell.y, 2.1 * size, 0, TAU);
      c.fillStyle = fresh ? WHITE : INK;
      c.fill();
    });
    c.beginPath();
    c.arc(seed.x, seed.y, 3, 0, TAU);
    c.fillStyle = POP;
    c.fill();
  }
};

var kinds = { print: print, fold: fold, stent: stent, culture: culture };
var touchFirst = !(window.matchMedia && window.matchMedia("(hover:hover) and (pointer:fine)").matches);

function setUp(root, index){
  var kind = kinds[root.getAttribute("data-lab")];
  if(!kind) return;
  root.hidden = false;
  var canvas = root.querySelector("canvas"), slider = root.querySelector("input"), out = root.querySelector("output");
  var c = canvas.getContext("2d");
  var lab = { now: RM ? 1 : 0, goal: RM ? 1 : 0, raf: 0, last: 0, timed: null, shown: "" };

  var hint = (touchFirst ? "Drag" : "Move across") + " to " + kind.verb + (kind.extra ? kind.extra.replace("{tap}", touchFirst ? "tap" : "click") : "");
  root.querySelector(".hl-hint").textContent = hint;

  function paint(){
    var box = canvas.getBoundingClientRect();
    if(!box.width) return;
    var ratio = Math.min(window.devicePixelRatio || 1, 2), pxW = Math.round(box.width * ratio), pxH = Math.round(box.height * ratio);
    if(canvas.width !== pxW || canvas.height !== pxH){ canvas.width = pxW; canvas.height = pxH; }
    c.setTransform(pxW / W, 0, 0, pxH / H, 0, 0);
    c.clearRect(0, 0, W, H);
    kind.draw(c, lab.now);
    slider.value = Math.round(lab.now * 1000);
    var text = kind.read(lab.now);
    if(text !== lab.shown){
      lab.shown = text;
      out.textContent = text;
      slider.setAttribute("aria-valuetext", text);
    }
  }

  function tick(time){
    lab.raf = 0;
    var dt = Math.min(48, time - (lab.last || time));
    lab.last = time;
    if(lab.timed){
      var run = clamp((time - lab.timed.start) / lab.timed.ms, 0, 1);
      if(run >= 0){
        lab.now = lab.timed.from + (lab.timed.to - lab.timed.from) * run * run * (3 - 2 * run);
        lab.goal = lab.now;
      }
      if(run >= 1) lab.timed = null;
    } else {
      lab.now += (lab.goal - lab.now) * (1 - Math.exp(-dt / 70));
      if(Math.abs(lab.goal - lab.now) < 0.0015) lab.now = lab.goal;
    }
    paint();
    if(lab.timed || lab.now !== lab.goal) wake(); else lab.last = 0;
  }
  function wake(){ if(!lab.raf) lab.raf = window.requestAnimationFrame(tick); }

  function steer(value, instant){
    lab.timed = null;
    lab.goal = clamp(value, 0, 1);
    if(instant || RM){ lab.now = lab.goal; paint(); return; }
    wake();
  }
  // Play once by itself, so the figure shows that it moves. Any touch by the visitor takes over.
  lab.play = function(delay, from, ms){
    if(RM){ lab.now = lab.goal = 1; paint(); return; }
    lab.timed = { from: from, to: 1, ms: ms, start: performance.now() + delay };
    wake();
  };

  function along(event){
    var box = canvas.getBoundingClientRect();
    return clamp(((event.clientX - box.left) / box.width - 0.06) / 0.88, 0, 1);
  }
  var press = null;
  canvas.addEventListener("pointerdown", function(event){
    press = { x: event.clientX, y: event.clientY, moved: false };
  });
  canvas.addEventListener("pointermove", function(event){
    if(event.pointerType === "mouse"){ if(!mouse.still) steer(along(event)); return; }
    if(!press) return;
    if(Math.abs(event.clientX - press.x) > 6) press.moved = true;
    if(press.moved) steer(along(event));
  });
  canvas.addEventListener("pointercancel", function(){ press = null; });
  canvas.addEventListener("pointerup", function(event){
    var tapped = press && !press.moved && Math.hypot(event.clientX - press.x, event.clientY - press.y) < 8;
    press = null;
    if(!tapped) return;
    if(kind === culture){
      var box = canvas.getBoundingClientRect();
      plant((event.clientX - box.left) / box.width * W, (event.clientY - box.top) / box.height * H);
      lab.play(0, 0, 1100);
    } else if(event.pointerType !== "mouse"){
      steer(along(event));
    }
  });
  slider.addEventListener("input", function(){ steer(slider.value / 1000, true); });

  paint();
  if("ResizeObserver" in window) new ResizeObserver(paint).observe(canvas);
  else window.addEventListener("resize", paint, { passive: true });

  if(RM) return;
  if(!("IntersectionObserver" in window)){ lab.now = lab.goal = 1; paint(); return; }
  // Wait until the figure has been properly on screen for a moment, so the play is not spent while still scrolling to it.
  var settle = 0;
  var watcher = new IntersectionObserver(function(entries){
    window.clearTimeout(settle);
    if(!entries[0].isIntersecting) return;
    settle = window.setTimeout(function(){
      watcher.disconnect();
      if(lab.now === 0 && lab.goal === 0) lab.play(window.innerWidth >= 980 ? index * 240 : 0, 0, 2600);
    }, 280);
  },{ threshold: 0.8 });
  watcher.observe(canvas);
}

// A page scrolling under a still mouse can fire a move event. Only a mouse that really moved may take over.
var mouse = { x: null, y: null, still: true };
window.addEventListener("pointermove", function(event){
  if(event.pointerType !== "mouse") return;
  mouse.still = mouse.x === null || (event.clientX === mouse.x && event.clientY === mouse.y);
  mouse.x = event.clientX;
  mouse.y = event.clientY;
},{ capture: true, passive: true });

labs.forEach(setUp);
})();
