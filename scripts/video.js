/** Pause offscreen videos and respect reduced motion. */
(function(){
"use strict";
var $$ = window.SBRS.selectAll, RM = window.SBRS.reducedMotion;

/* ---------- video: play only when visible ---------- */
$$("video").forEach(function(v){
  if(RM){ v.removeAttribute("autoplay"); return; }
  if(!("IntersectionObserver" in window)) return;
  var small = window.matchMedia("(max-width: 767px)").matches;
  if(small && v.id==="heroVid") return;
  new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){ if(v.preload==="none") v.preload="auto"; var p=v.play(); if(p&&p.catch)p.catch(function(){}); }
      else v.pause();
    });
  },{threshold:.05}).observe(v);
});
})();
