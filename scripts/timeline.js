/** Marks passed and upcoming dates, and fills the next-date band, from the dates list. */
(function(){
"use strict";
var $ = window.SBRS.select, $$ = window.SBRS.selectAll;
var items = $$(".tl-item");
if(!items.length) return;
var now = new Date(), next = null;
items.forEach(function(item){
  var when = new Date($("time", item).getAttribute("datetime") + "T00:00:00");
  if(when <= now){ item.classList.add("is-past"); return; }
  if(!next) next = { item: item, when: when, name: $(".tl-name", item).textContent };
});
var gap = $("#nextGap"), name = $("#nextName"), date = $("#nextDate");
if(!next){ if(gap) gap.closest(".next").hidden = true; return; }
var days = Math.ceil((next.when - now) / 864e5);
var label = days === 1 ? "1 day" : days + " days";
next.item.classList.add("is-next");
var flag = $(".tl-flag", next.item);
flag.hidden = false;
flag.textContent = "Next, in " + label;
if(gap) gap.textContent = "In " + label;
if(name) name.textContent = next.name;
if(date) date.textContent = next.when.toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
})();

/* Hero countdown to the opening morning, 9:00 IST on 14 December 2027. */
(function(){
"use strict";
var box = document.getElementById("heroCount");
if(!box) return;
var OPEN = Date.parse("2027-12-14T09:00:00+05:30");
var cells = {};
Array.prototype.forEach.call(box.querySelectorAll("[data-u]"), function(b){ cells[b.getAttribute("data-u")] = b; });
function pad(n){ return n < 10 ? "0" + n : "" + n; }
function tick(){
  var left = Math.max(0, OPEN - Date.now()), s = Math.floor(left / 1000);
  if(!left) box.querySelector(".hc-label").textContent = "The conference is under way";
  cells.d.textContent = Math.floor(s / 86400);
  cells.h.textContent = pad(Math.floor(s / 3600) % 24);
  cells.m.textContent = pad(Math.floor(s / 60) % 60);
  cells.s.textContent = pad(s % 60);
  if(left) setTimeout(tick, 1000 - (Date.now() % 1000));
}
tick();
})();
