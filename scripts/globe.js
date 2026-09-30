/** Accessible, interactive dotted globe rendering and input handling. */
(function(){
"use strict";
var $ = window.SBRS.select, clamp = window.SBRS.clamp, RM = window.SBRS.reducedMotion;
var data = window.SBRS.globeData;
var GLOBE_DOTS = data.dots, GLOBE_RINGS = data.rings, GLOBE_PINS = data.pins;

(function globe(){
  var cv = $("#heroCanvas"), stage = $("#heroStage");
  if(!cv || !stage) return;
  var ctx = cv.getContext("2d");
  if(!ctx) return;

  function unpack(str){
    var out = [];
    for(var i=0;i<str.length;i+=4){
      var n = parseInt(str.substr(i,4),36);
      out.push([(Math.floor(n/721))/4 - 180, (n%721)/4 - 90]);
    }
    return out;
  }
  var DOTS  = unpack(GLOBE_DOTS);
  var RINGS = GLOBE_RINGS.split(" ").map(unpack);

  var DEG = Math.PI/180;
  var HOME_L = -80, HOME_P = 14;      // centred on India, where both pins are
  var BEACON = "#FF4D8D";             // venue marker, phenol pushed bright for the dark body
  var rotL = HOME_L, rotP = HOME_P;
  var dragging = false, autoRot = !RM, vis = true;
  var cx=0, cy=0, R=0, dpr=1;
  var hits = [], hover = -1, focusPin = -1, pulse = 0, idleT = null;
  var hint = $("#glHint"), fb = stage.querySelector(".glfallback");

  function project(lng, lat){
    var l = (lng + rotL) * DEG, ph = lat * DEG, pr = rotP * DEG;
    var cp = Math.cos(ph);
    var x = cp*Math.sin(l), y = Math.sin(ph), z = cp*Math.cos(l);
    var c = Math.cos(pr), sn = Math.sin(pr);
    var y2 = y*c - z*sn, z2 = y*sn + z*c;
    return [cx + x*R, cy - y2*R, z2];
  }

  function strokeRing(pts, colour, w){
    ctx.beginPath();
    var pen = false;
    for(var i=0;i<pts.length;i++){
      var q = project(pts[i][0], pts[i][1]);
      if(q[2] > 0){ if(pen){ ctx.lineTo(q[0],q[1]); } else { ctx.moveTo(q[0],q[1]); pen = true; } }
      else pen = false;
    }
    ctx.strokeStyle = colour; ctx.lineWidth = w; ctx.stroke();
  }

  function draw(){
    var w = cv.width/dpr, h = cv.height/dpr;
    ctx.clearRect(0,0,w,h);

    // sphere body
    ctx.beginPath(); ctx.arc(cx,cy,R,0,6.2832);
    var g = ctx.createRadialGradient(cx-R*0.35, cy-R*0.35, R*0.1, cx, cy, R);
    g.addColorStop(0,"rgba(21,57,58,0.95)"); g.addColorStop(1,"rgba(8,28,29,0.95)");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(134,150,144,0.85)"; ctx.lineWidth = 1; ctx.stroke();

    // graticule
    var i, j;
    for(i=-60;i<=60;i+=30){
      var lat=[]; for(j=-180;j<=180;j+=6) lat.push([j,i]);
      strokeRing(lat,"rgba(134,150,144,0.22)",1);
    }
    for(i=0;i<180;i+=30){
      var lon=[]; for(j=-90;j<=90;j+=4) lon.push([i,j]);
      strokeRing(lon,"rgba(134,150,144,0.22)",1);
      var lon2=[]; for(j=-90;j<=90;j+=4) lon2.push([i-180,j]);
      strokeRing(lon2,"rgba(134,150,144,0.22)",1);
    }

    // coastlines
    for(i=0;i<RINGS.length;i++) strokeRing(RINGS[i],"rgba(134,150,144,0.55)",1);

    // halftone land
    var r = Math.max(0.9, R*0.0075);
    ctx.fillStyle = "rgba(221,227,220,0.82)";
    for(i=0;i<DOTS.length;i++){
      var q = project(DOTS[i][0], DOTS[i][1]);
      if(q[2] <= 0.02) continue;
      ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, 6.2832); ctx.fill();
    }

    // pins — both sit in India, so labels get chips, generous separation
    // and an edge flip so they never collide or run out of the frame
    hits.length = 0;
    for(i=0;i<GLOBE_PINS.length;i++){
      var pin = GLOBE_PINS[i], q = project(pin.lng, pin.lat);
      if(q[2] <= 0.06) continue;
      var venue = pin.key === 1;
      var col   = venue ? BEACON : "#E8A33D";
      var hot   = (hover === i || focusPin === i);
      var fade  = Math.min(1, q[2]*3.2);
      var hit   = { x:q[0], y:q[1], i:i, box:null };
      hits.push(hit);
      ctx.globalAlpha = fade;

      // the venue reads first: a halo, a ring that breathes, and a lit centre
      if(venue){
        var halo = ctx.createRadialGradient(q[0],q[1],0,q[0],q[1],30);
        halo.addColorStop(0,"rgba(255,77,141,0.42)");
        halo.addColorStop(0.55,"rgba(255,77,141,0.13)");
        halo.addColorStop(1,"rgba(255,77,141,0)");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(q[0],q[1],30,0,6.2832); ctx.fill();

        if(!RM){
          var t = (pulse % 2400) / 2400;
          ctx.globalAlpha = fade * (1 - t) * 0.7;
          ctx.beginPath(); ctx.arc(q[0], q[1], 9 + t*19, 0, 6.2832);
          ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.stroke();
          ctx.globalAlpha = fade;
        }
      }

      ctx.shadowColor = col; ctx.shadowBlur = venue ? 14 : 6;
      ctx.beginPath(); ctx.arc(q[0], q[1], hot ? 5 : (venue ? 4.4 : 3.4), 0, 6.2832);
      ctx.fillStyle = venue ? "#FFF1F6" : col; ctx.fill();
      ctx.shadowBlur = 0;

      ctx.beginPath(); ctx.arc(q[0], q[1], hot ? 12 : 9, 0, 6.2832);
      ctx.strokeStyle = col; ctx.lineWidth = venue ? 1.6 : 1.1; ctx.stroke();

      var labelFont = '600 11px "Source Sans 3", system-ui, sans-serif';
      var sans = '500 12px "Source Sans 3", system-ui, sans-serif';
      ctx.font = labelFont; var w1 = ctx.measureText(pin.role.toUpperCase()).width;
      ctx.font = sans; var w2 = ctx.measureText(pin.label).width;
      var bw = Math.max(w1, w2) + 20, bh = 34;

      var side = venue ? -1 : 1;
      var ly = q[1] + side * 62;
      ly = Math.max(bh/2 + 6, Math.min(h - bh/2 - 24, ly));
      var flip = (q[0] + 30 + bw) > (w - 10);
      var lx = flip ? (q[0] - 30 - bw) : (q[0] + 30);
      lx = Math.max(6, Math.min(w - bw - 6, lx));
      hit.box = [lx, ly - bh/2, bw, bh];

      ctx.beginPath();
      ctx.moveTo(q[0], q[1] + side*9);
      ctx.lineTo(flip ? lx + bw + 8 : lx - 8, ly);
      ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.stroke();

      ctx.fillStyle = hot ? "rgba(12,38,40,0.97)" : "rgba(8,28,29,0.9)";
      ctx.fillRect(lx, ly - bh/2, bw, bh);
      ctx.strokeStyle = col; ctx.lineWidth = hot ? 1.8 : (venue ? 1.4 : 1);
      ctx.strokeRect(lx + 0.5, ly - bh/2 + 0.5, bw - 1, bh - 1);

      ctx.textAlign = "left";
      ctx.font = labelFont; ctx.fillStyle = col;
      ctx.fillText(pin.role.toUpperCase(), lx + 10, ly - 3);
      ctx.font = sans; ctx.fillStyle = "rgba(237,240,235,0.97)";
      ctx.fillText(pin.label, lx + 10, ly + 11);

      ctx.globalAlpha = 1;
    }
  }

  function resize(){
    dpr = Math.min(window.devicePixelRatio||1, 2);
    var w = stage.clientWidth, h = stage.clientHeight;
    cv.width = Math.max(1,Math.round(w*dpr)); cv.height = Math.max(1,Math.round(h*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cx = w/2; cy = h/2; R = Math.min(w,h)/2 - Math.min(w,h)*0.13;
    draw();
  }

  /* ---------- interaction ---------- */

  function at(e){
    var r = cv.getBoundingClientRect(), t = e.touches ? e.touches[0] : e;
    return [t.clientX - r.left, t.clientY - r.top, t.clientX, t.clientY];
  }

  // a marker is hit over its dot or over its label chip
  function pinAt(x, y){
    for(var i=hits.length-1;i>=0;i--){
      var d = hits[i], b = d.box;
      if((x-d.x)*(x-d.x) + (y-d.y)*(y-d.y) <= 196) return d.i;
      if(b && x >= b[0] && x <= b[0]+b[2] && y >= b[1] && y <= b[1]+b[3]) return d.i;
    }
    return -1;
  }

  function setHint(txt, live){
    if(hint && hint.textContent !== txt) hint.textContent = txt;
    stage.classList.toggle("gl-live", !!live);
  }

  function idle(){
    if(idleT) clearTimeout(idleT);
    if(RM) return;
    idleT = setTimeout(function(){
      if(!dragging && hover < 0 && focusPin < 0) autoRot = true;
    }, 2600);
  }

  function openPin(i){
    var pin = GLOBE_PINS[i];
    if(!pin) return;
    var target = document.querySelector(pin.href);
    if(target) target.scrollIntoView({ behavior: RM ? "auto" : "smooth", block: "start" });
  }

  var lastX=0, lastY=0, moved=0, velL=0, velP=0, downAt=0;

  function down(e){
    dragging = true; autoRot = false; moved = 0; velL = 0; velP = 0; downAt = Date.now();
    var pt = at(e); lastX = pt[2]; lastY = pt[3];
    try { cv.focus({ preventScroll:true }); } catch(err){ cv.focus(); }
    if(cv.setPointerCapture && e.pointerId !== undefined) cv.setPointerCapture(e.pointerId);
    cv.style.cursor = "grabbing";
    setHint("Rotating", true);
  }

  function move(e){
    var pt = at(e);
    if(!dragging){
      var over = pinAt(pt[0], pt[1]);
      if(over === hover) return;
      hover = over;
      cv.style.cursor = over >= 0 ? "pointer" : "grab";
      if(over >= 0){ autoRot = false; setHint(GLOBE_PINS[over].label + " \u00b7 open", true); }
      else { setHint("Drag to rotate", false); idle(); }
      draw();
      return;
    }
    var dx = pt[2] - lastX, dy = pt[3] - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    // The projection moves visible points down as rotP rises, so drag Y keeps its sign.
    velL = dx * 0.32; velP = dy * 0.28;
    rotL += velL;
    rotP = Math.max(-72, Math.min(72, rotP + velP));
    lastX = pt[2]; lastY = pt[3];
    if(e.cancelable) e.preventDefault();
    draw();
  }

  function up(e){
    if(!dragging) return;
    dragging = false;
    cv.style.cursor = hover >= 0 ? "pointer" : "grab";

    // a press that never travelled is a click, not a throw
    if(moved < 6 && Date.now() - downAt < 600){
      velL = velP = 0;
      var i = e ? pinAt(at(e)[0], at(e)[1]) : -1;
      if(i >= 0){ openPin(i); setHint("Drag to rotate", false); idle(); return; }
    }
    setHint("Drag to rotate", false);
    idle();
  }

  cv.addEventListener("pointerdown", down);
  window.addEventListener("pointermove", move, {passive:false});
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  cv.addEventListener("pointerleave", function(){
    if(dragging || hover < 0) return;
    hover = -1; cv.style.cursor = "grab"; setHint("Drag to rotate", false); idle(); draw();
  });
  cv.style.cursor = "grab";

  /* keyboard: arrows rotate, Home recentres, M steps through the markers.
     Tab is left alone so the globe never becomes a keyboard trap. */
  cv.addEventListener("keydown", function(e){
    var step = e.shiftKey ? 15 : 5, k = e.key, handled = true;
    if(k === "ArrowLeft")       rotL -= step;
    else if(k === "ArrowRight") rotL += step;
    else if(k === "ArrowUp")    rotP = Math.max(-72, rotP - step);
    else if(k === "ArrowDown")  rotP = Math.min(72, rotP + step);
    else if(k === "Home")     { rotL = HOME_L; rotP = HOME_P; }
    else if(k === "m" || k === "M") focusPin = (focusPin + 1) % GLOBE_PINS.length;
    else if(k === "Enter" || k === " "){ if(focusPin >= 0) openPin(focusPin); else handled = false; }
    else handled = false;
    if(!handled) return;

    e.preventDefault();
    autoRot = false;
    setHint(focusPin >= 0 ? GLOBE_PINS[focusPin].label + " \u00b7 Enter opens" : "Rotating", true);
    idle();
    draw();
  });
  cv.addEventListener("focus", function(){
    if(focusPin < 0) focusPin = 0;
    autoRot = false;
    setHint("Arrows rotate \u00b7 M cycles markers \u00b7 Enter opens", true);
    draw();
  });
  cv.addEventListener("blur", function(){
    focusPin = -1; setHint("Drag to rotate", false); idle(); draw();
  });

  if("IntersectionObserver" in window)
    new IntersectionObserver(function(e){ vis = e[0].isIntersecting; },{threshold:0}).observe(stage);

  stage.classList.add("gl-on");
  if(fb) fb.setAttribute("aria-hidden","true");   // the canvas carries the label now
  window.addEventListener("resize", resize, {passive:true});
  resize();

  if(!RM){
    var prev = 0;
    (function loop(now){
      var dt = Math.min(64, now - prev); prev = now;
      pulse += dt;
      if(vis){
        var live = false;
        if(!dragging && (Math.abs(velL) > 0.02 || Math.abs(velP) > 0.02)){
          // let a throw coast to a stop instead of snapping dead
          rotL += velL;
          rotP = Math.max(-72, Math.min(72, rotP + velP));
          velL *= 0.94; velP *= 0.94;
          live = true;
        }
        if(autoRot && !dragging){ rotL += dt * 0.0042; live = true; }
        if(live || hover >= 0 || focusPin >= 0) draw();
      }
      window.requestAnimationFrame(loop);
    })(0);
  }
})();
})();
