/** Current-section navigation and mobile menu. */
(function(){
"use strict";
var $ = window.SBRS.select, $$ = window.SBRS.selectAll;
var navLinks = $$("#nav a"), navToggle = $("#navToggle"), nav = $("#nav");

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
  window.addEventListener("resize",function(){if(window.innerWidth>=1100) closeMenu();});
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
window.addEventListener("scroll",function(){ window.requestAnimationFrame(markNav); },{passive:true});
markNav();
})();
