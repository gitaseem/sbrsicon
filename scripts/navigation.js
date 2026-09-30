/** Reveal timing, current-section navigation, mobile menu, and progress rail. */
(function(){
"use strict";
var $ = window.SBRS.select, $$ = window.SBRS.selectAll;
var pad = window.SBRS.pad, clamp = window.SBRS.clamp;

/* ---------- reveal ----------
   Rect sweep rather than IntersectionObserver: the observer coalesces callbacks per frame and
   silently skips elements during fast or programmatic scrolling, which left whole rows invisible.
   The queue shrinks as things reveal, so the cost trends to zero. */
var revealQ = $$(".rv,.tl-item,#footGrid");
function sweepReveal(){
  if(!revealQ.length) return;
  var vh = window.innerHeight || 800, keep = [];
  for(var i=0;i<revealQ.length;i++){
    var n = revealQ[i];
    if(n.getBoundingClientRect().top < vh*0.92) n.classList.add("rin");
    else keep.push(n);
  }
  revealQ = keep;
}

/* ---------- nav current section ---------- */
var navLinks = $$("#nav a");
var navToggle = $("#navToggle"), nav = $("#nav");
function closeMenu(){
  if(!nav || !navToggle) return;
  nav.classList.remove("is-open");
  navToggle.setAttribute("aria-expanded","false");
  navToggle.setAttribute("aria-label","Open menu");
}
if(nav && navToggle){
  navToggle.addEventListener("click",function(){
    var open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open",open);
    navToggle.setAttribute("aria-expanded",open ? "true" : "false");
    navToggle.setAttribute("aria-label",open ? "Close menu" : "Open menu");
  });
  navLinks.forEach(function(a){a.addEventListener("click",closeMenu);});
  document.addEventListener("click",function(e){if(!e.target.closest(".site-head")) closeMenu();});
  document.addEventListener("keydown",function(e){if(e.key==="Escape") closeMenu();});
  window.addEventListener("resize",function(){if(window.innerWidth>=1040) closeMenu();});
}
var secIds = navLinks.map(function(a){return a.getAttribute("href").slice(1);});
function markNav(){
  var best=null, bestTop=-1e9, y=window.scrollY+120;
  secIds.forEach(function(id,i){
    var el=document.getElementById(id); if(!el) return;
    var top=el.offsetTop;
    if(top<=y && top>bestTop){bestTop=top;best=i;}
  });
  navLinks.forEach(function(a,i){
    if(i===best) a.setAttribute("aria-current","true"); else a.removeAttribute("aria-current");
  });
}

/* ---------- scroll rail ---------- */
var progEl=$("#prog"), zrFill=$("#zrFill"), zrHead=$("#zrHead"),
    zrPct=$("#zrPct"), zrZ=$("#zrZ"), zrTicks=$("#zrTicks"), zrOf=$("#zrOf");
var ZONES = Math.max(1, $$("#main > section").length);
if(zrOf) zrOf.textContent = "of " + pad(ZONES,2);
var RAIL_TOP=104, RAIL_BOT=150;
function railH(){ return Math.max(60, window.innerHeight - RAIL_TOP - RAIL_BOT); }
(function ticks(){
  if(!zrTicks) return;
  var html="";
  for(var i=0;i<=6;i++){ html += '<span class="zr-tick" style="top:'+(RAIL_TOP+i/6*railH())+'px"></span>'; }
  zrTicks.innerHTML=html;
})();

var pageProg=0;
function onScroll(){
  var max = document.documentElement.scrollHeight - window.innerHeight;
  pageProg = max>0 ? clamp(window.scrollY/max,0,1) : 0;
  if(progEl) progEl.style.width = (pageProg*100).toFixed(2)+"%";
  var h = railH();
  if(zrFill) zrFill.style.height = (pageProg*h).toFixed(1)+"px";
  if(zrHead) zrHead.style.top    = (RAIL_TOP + pageProg*h).toFixed(1)+"px";
  if(zrPct)  zrPct.textContent   = pad(pageProg*100)+"%";
  if(zrZ)    zrZ.textContent     = pad(Math.min(ZONES,Math.floor(pageProg*ZONES)+1),2);
  sweepReveal();
  markNav();
}
window.addEventListener("scroll",function(){
  if(window.requestAnimationFrame) window.requestAnimationFrame(onScroll); else onScroll();
},{passive:true});
window.addEventListener("resize",function(){ ticksRebuild(); onScroll(); },{passive:true});
function ticksRebuild(){
  if(!zrTicks) return;
  var html="";
  for(var i=0;i<=6;i++){ html += '<span class="zr-tick" style="top:'+(RAIL_TOP+i/6*railH())+'px"></span>'; }
  zrTicks.innerHTML=html;
}
onScroll();
sweepReveal();
window.addEventListener("load",sweepReveal);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(sweepReveal);
[120,400,900,1800].forEach(function(d){ setTimeout(sweepReveal,d); });
})();
