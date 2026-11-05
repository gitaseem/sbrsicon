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
