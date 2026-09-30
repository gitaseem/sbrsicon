/** Region filter for the complete server-readable speaker grid. */
(function(){
"use strict";
var $ = window.SBRS.select, $$ = window.SBRS.selectAll, pad = window.SBRS.pad;
(function(){
  var grid = $("#spkGrid"); if(!grid) return;
  var chips = $$(".spk-chip"), cards = $$(".spk", grid), out = $("#spkCount");
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion:reduce)").matches;

  function apply(cat, animate){
    var shown = 0;
    cards.forEach(function(c){
      var show = (cat === "all" || c.getAttribute("data-region") === cat);
      c.hidden = !show;
      if(!show) return;
      if(animate && !reduce){
        c.classList.remove("spk-in");
        c.style.animationDelay = (shown * 32) + "ms";
        void c.offsetWidth;          /* restart the animation on re-entry */
        c.classList.add("spk-in");
      }
      shown++;
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
