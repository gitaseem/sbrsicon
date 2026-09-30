/** Small shared DOM, number, and motion helpers for the feature scripts. */
(function(){
"use strict";
var RM = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var $  = function(s,c){return (c||document).querySelector(s);};
var $$ = function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};
var pad = function(n,w){n=String(Math.max(0,Math.round(n)));while(n.length<(w||3))n="0"+n;return n;};
var clamp = function(v,a,b){return v<a?a:(v>b?b:v);};


// Only these small helpers are shared with the feature scripts.
window.SBRS = { select: $, selectAll: $$, pad: pad, clamp: clamp, reducedMotion: RM };
})();
