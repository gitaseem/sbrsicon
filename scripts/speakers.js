/** Region filter for the complete server-readable speaker grid. */
(function(){
"use strict";
var $ = window.SBRS.select, $$ = window.SBRS.selectAll, pad = window.SBRS.pad;
(function(){
  var grid = $("#spkGrid"); if(!grid) return;
  var chips = $$(".spk-chip"), cards = $$(".spk", grid), out = $("#spkCount");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  function apply(cat, animate){
    var shown = 0, glide = animate && !reduce && cards[0].animate;
    var before = glide ? cards.map(function(c){ return c.hidden ? null : c.getBoundingClientRect(); }) : [];
    cards.forEach(function(c){
      var show = (cat === "all" || c.getAttribute("data-region") === cat);
      c.hidden = !show;
      if(show) shown++;
    });
    if(glide) cards.forEach(function(c, i){
      if(c.hidden) return;
      var was = before[i], now = c.getBoundingClientRect();
      if(was) c.animate(
        [{ transform:"translate(" + (was.left - now.left) + "px," + (was.top - now.top) + "px)" },{ transform:"none" }],
        { duration:340, easing:"cubic-bezier(.2,0,0,1)" });
      else c.animate([{ opacity:0, transform:"translateY(10px)" },{ opacity:1, transform:"none" }],
        { duration:260, easing:"cubic-bezier(.2,0,0,1)" });
    });
    if(out) out.textContent = pad(shown,2) + " of " + pad(cards.length,2) + " shown";
    chips.forEach(function(b){
      b.setAttribute("aria-pressed", b.getAttribute("data-filter") === cat ? "true" : "false");
    });
  }

  chips.forEach(function(b){
    b.addEventListener("click", function(){ apply(b.getAttribute("data-filter"), true); });
  });
  apply("all", false);
})();
})();
