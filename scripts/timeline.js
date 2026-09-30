/** Current date and next conference milestone. */
(function(){
"use strict";
var $ = window.SBRS.select;

/* ---------- timeline: honest current position ---------- */
(function(){
  var MS=[["2026-10-01","Abstract submission opens"],["2027-01-31","Abstract submission deadline"],
          ["2027-02-15","Acceptance notification"],["2027-02-16","Early-bird registration opens"],
          ["2027-03-31","Early-bird registration deadline"],["2027-10-31","Registration deadline"],
          ["2027-12-14","Conference opens"]];
  var now=new Date(), nd=$("#tlNowDate"), ng=$("#tlNowGap");
  if(!nd) return;
  nd.textContent = now.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});
  var next=null;
  for(var i=0;i<MS.length;i++){ var d=new Date(MS[i][0]+"T00:00:00"); if(d>now){ next=[d,MS[i][1]]; break; } }
  if(next){
    var days=Math.ceil((next[0]-now)/864e5);
    ng.textContent = "Next · "+next[1]+" in "+days+" days";
  }else{
    ng.textContent = "Programme complete";
  }
})();
})();
