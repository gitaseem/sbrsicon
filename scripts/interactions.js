/** Direct-response effects: reactive type, globe jumps, portrait lens, track shortcuts, fee finder. */
(function(){
"use strict";
var $ = window.SBRS.select, $$ = window.SBRS.selectAll, RM = window.SBRS.reducedMotion;
var finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;

/* ---------- headline letters thicken near the cursor ---------- */

function reactiveType(el, options){
  var original = el.innerHTML, letters = [], pointer = null, running = false, sweep = null;

  // Each letter's width is locked to its kerned advance, so changing weight never shifts the line.
  function build(){
    el.innerHTML = original;
    letters = [];
    var text = el.textContent.replace(/\s+/g, " ").trim();
    var size = parseFloat(getComputedStyle(el).fontSize);
    var nodes = [], walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) nodes.push(walker.currentNode);
    var range = document.createRange();
    var plans = nodes.map(function(node){
      var value = node.nodeValue, widths = [];
      for(var i = 0; i < value.length; i++){
        range.setStart(node, i); range.setEnd(node, i + 1);
        var box = range.getBoundingClientRect(), next = null;
        if(i + 1 < value.length){
          range.setStart(node, i + 1); range.setEnd(node, i + 2);
          next = range.getBoundingClientRect();
        }
        widths.push(next && Math.abs(next.top - box.top) < 2 ? next.left - box.left : box.width);
      }
      return { node: node, value: value, widths: widths };
    });
    plans.forEach(function(plan){
      var frag = document.createDocumentFragment(), word = null;
      for(var i = 0; i < plan.value.length; i++){
        var ch = plan.value[i];
        if(/\s/.test(ch)){ frag.appendChild(document.createTextNode(" ")); word = null; continue; }
        if(!word){ word = document.createElement("span"); word.className = "rt-word"; frag.appendChild(word); }
        var letter = document.createElement("span");
        letter.className = "rt-letter";
        letter.textContent = ch;
        // In em, so a window resize can never leave a stale width behind.
        letter.style.width = (plan.widths[i] / size).toFixed(4) + "em";
        word.appendChild(letter);
        letters.push({ el: letter, x: 0, y: 0, weight: 400 });
      }
      plan.node.parentNode.replaceChild(frag, plan.node);
    });
    var visual = document.createElement("span");
    visual.className = "rt-visual";
    visual.setAttribute("aria-hidden", "true");
    while(el.firstChild) visual.appendChild(el.firstChild);
    var spoken = document.createElement("span");
    spoken.className = "vh";
    spoken.textContent = text;
    el.appendChild(spoken);
    el.appendChild(visual);
    var base = el.getBoundingClientRect();
    letters.forEach(function(item){
      var box = item.el.getBoundingClientRect();
      item.x = box.left - base.left + box.width / 2;
      item.y = box.top - base.top + box.height / 2;
    });
  }

  function tick(now){
    var base = el.getBoundingClientRect();
    var reach = parseFloat(getComputedStyle(el).fontSize) * 2.3, moving = false, ghost = null;
    // On load an unseen cursor drifts across the headline once, weaving through its lines. It is the hover effect itself.
    if(sweep){
      if(sweep.start === null) sweep.start = now + sweep.delay;
      var run = (now - sweep.start) / sweep.ms;
      if(run >= 1) sweep = null;
      else {
        moving = true;
        if(run >= 0){
          var far = 0, low = 0;
          letters.forEach(function(item){ far = Math.max(far, item.x); low = Math.max(low, item.y); });
          ghost = { x: -reach + (far + reach * 2) * run, y: low / 2 + Math.sin(run * Math.PI * 3) * low * 0.42 };
        }
      }
    }
    letters.forEach(function(item){
      var target = 400;
      [ghost, pointer && { x: pointer.x - base.left, y: pointer.y - base.top }].forEach(function(at){
        if(!at) return;
        var dx = at.x - item.x, dy = at.y - item.y;
        var near = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / reach);
        target = Math.max(target, 400 + 340 * near * near);
      });
      var change = (target - item.weight) * 0.24;
      if(Math.abs(target - item.weight) < 1.5){ change = target - item.weight; } else { moving = true; }
      if(change){ item.weight += change; item.el.style.fontWeight = Math.round(item.weight); }
    });
    if(moving || pointer) window.requestAnimationFrame(tick); else running = false;
  }

  if(finePointer){
    window.addEventListener("pointermove", function(e){
      var box = el.getBoundingClientRect(), pad = 160;
      var inside = e.clientX > box.left - pad && e.clientX < box.right + pad && e.clientY > box.top - pad && e.clientY < box.bottom + pad;
      pointer = inside ? { x: e.clientX, y: e.clientY } : null;
      if((pointer || running) && !running){ running = true; window.requestAnimationFrame(tick); }
    },{ passive:true });
    document.addEventListener("mouseleave", function(){ pointer = null; });
  }

  var timer = null, lastWidth = window.innerWidth;
  window.addEventListener("resize", function(){
    if(window.innerWidth === lastWidth) return;
    lastWidth = window.innerWidth;
    clearTimeout(timer);
    timer = setTimeout(build, 180);
  },{ passive:true });
  build();
  // Skipped if the visitor arrives part way down the page and would not see it.
  if(options && options.sweep && el.getBoundingClientRect().bottom > 0){
    sweep = { start: null, delay: 380, ms: 2200 };
    running = true;
    window.requestAnimationFrame(tick);
  }
}

if(!RM){
  // The headline sweeps once on every device. Following the cursor needs one, so the footer line is desktop only.
  var startType = function(){
    $$(".hero-mark").forEach(function(el){ reactiveType(el, { sweep: true }); });
    if(finePointer) $$(".foot-line").forEach(function(el){ reactiveType(el); });
  };
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(startType); else startType();
}

/* ---------- jump the globe to a place ---------- */

var places = $(".hero-go");
if(places && window.SBRS.globeTo){
  places.hidden = false;
  var placeButtons = $$("button", places);
  placeButtons.forEach(function(button, index){
    button.addEventListener("click", function(){
      window.SBRS.globeTo(index);
      placeButtons.forEach(function(other){ other.setAttribute("aria-pressed", other === button ? "true" : "false"); });
    });
  });
}

/* ---------- an indicator that slides between options ---------- */

function slider(container, links, activeSelector){
  if(!container || !links.length) return null;
  var mark = document.createElement("span");
  mark.className = "slide-mark";
  mark.setAttribute("aria-hidden", "true");
  container.appendChild(mark);
  function moveTo(link){
    if(!link || !link.offsetWidth){ mark.style.opacity = 0; return; }
    mark.style.opacity = 1;
    mark.style.width = link.offsetWidth + "px";
    mark.style.transform = "translate(" + link.offsetLeft + "px," + (link.offsetTop + link.offsetHeight) + "px)";
  }
  function rest(){ moveTo($(activeSelector, container)); }
  links.forEach(function(link){
    link.addEventListener("pointerenter", function(){ moveTo(link); });
    link.addEventListener("focus", function(){ moveTo(link); });
    link.addEventListener("click", function(){ setTimeout(rest, 0); });
  });
  container.addEventListener("pointerleave", rest);
  container.addEventListener("focusout", rest);
  window.addEventListener("resize", rest, { passive:true });
  window.addEventListener("scroll", function(){
    if(!container.matches(":hover")) window.requestAnimationFrame(rest);
  },{ passive:true });
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(rest);
  rest();
  return rest;
}
slider($("#nav"), $$("#nav a"), 'a[aria-current="true"]');
slider($(".spk-bar"), $$(".spk-chip"), '.spk-chip[aria-pressed="true"]');

/* ---------- colour lens over portraits, or colour at screen centre on touch ---------- */

var portraits = $$(".spk");
if(finePointer && !RM){
  portraits.forEach(function(card){
    var fig = $(".spk-fig", card), source = fig && $("img", fig);
    if(!source) return;
    var lens = null;
    function ensure(){
      if(lens) return;
      lens = document.createElement("img");
      lens.className = "spk-lens"; lens.alt = "";
      lens.setAttribute("aria-hidden", "true");
      lens.src = source.currentSrc || source.src;
      fig.appendChild(lens);
    }
    function aim(e, radius){
      var box = fig.getBoundingClientRect();
      lens.style.clipPath = "circle(" + radius + "px at " + (e.clientX - box.left) + "px " + (e.clientY - box.top) + "px)";
    }
    fig.addEventListener("pointerenter", function(e){
      ensure(); aim(e, 0);
      window.requestAnimationFrame(function(){ aim(e, fig.offsetWidth * 0.62); });
    });
    fig.addEventListener("pointermove", function(e){ if(lens) aim(e, fig.offsetWidth * 0.62); });
    fig.addEventListener("pointerleave", function(e){ if(lens) aim(e, 0); });
  });
} else if("IntersectionObserver" in window){
  var centre = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){ entry.target.classList.toggle("is-live", entry.isIntersecting); });
  },{ rootMargin:"-36% 0px -36% 0px" });
  portraits.forEach(function(card){ centre.observe(card); });
}

/* ---------- each track row starts an abstract for that track ---------- */

var abstractOpener = $('a[data-open="abstract"]'), trackSelect = $("#a-track"), abstractDialog = $("#dlgAbstract");
if(abstractOpener && trackSelect && abstractDialog && abstractDialog.showModal){
  $$(".tk").forEach(function(row){
    var title = $(".tk-title", row).textContent.trim();
    var go = document.createElement("button");
    go.type = "button";
    go.className = "tk-go";
    go.setAttribute("aria-label", "Submit an abstract to the track: " + title);
    go.innerHTML = '<span aria-hidden="true">Submit abstract <span class="ar">&rarr;</span></span>';
    go.addEventListener("click", function(){
      abstractOpener.click();
      trackSelect.value = title;
      abstractDialog.addEventListener("close", function(){ go.focus({ preventScroll:true }); }, { once:true });
    });
    row.appendChild(go);
  });
}

/* ---------- table crosshair ---------- */

if(finePointer){
  $$(".tbl").forEach(function(table){
    function clear(){ $$(".is-hot", table).forEach(function(cell){ cell.classList.remove("is-hot"); }); }
    table.addEventListener("mouseover", function(e){
      var cell = e.target.closest("td");
      clear();
      if(!cell) return;
      var row = cell.parentNode, tbody = row.parentNode;
      Array.prototype.forEach.call(row.cells, function(c){ c.classList.add("is-hot"); });
      Array.prototype.forEach.call(tbody.rows, function(r){ r.cells[cell.cellIndex].classList.add("is-hot"); });
    });
    table.addEventListener("mouseleave", clear);
  });
}

/* ---------- fee finder: reads the published tables, so there is one source of prices ---------- */

var finder = $("#feeFinder"), tables = $$("#fees .tbl");
if(finder && tables.length === 2){
  finder.hidden = false;
  var feesSection = $("#fees");
  feesSection.classList.add("has-finder");
  var feeBlocks = tables.map(function(table){ return table.closest(".fee-block"); });
  var price = $("#finderPrice"), note = $("#finderNote"), status = $("#finderStatus");
  var EARLY_END = new Date("2027-09-01T00:00:00");
  if(new Date() >= EARLY_END){
    var lateOption = $('input[name="ff-rate"][value="late"]', finder);
    if(lateOption) lateOption.checked = true;
  }
  var shown = null, picked = null, frameId = null;

  function pick(name){ return $('input[name="' + name + '"]:checked', finder).value; }
  function format(amount, rupees){
    return rupees ? "₹" + amount.toLocaleString("en-IN") : "$" + amount.toLocaleString("en-US");
  }
  function update(){
    var table = tables[pick("ff-package") === "member" ? 1 : 0];
    var category = Number(pick("ff-category"));
    var rupees = pick("ff-origin") === "indian", early = pick("ff-rate") === "early";
    var cell = table.tBodies[0].rows[category].cells[(rupees ? 1 : 3) + (early ? 0 : 1)];
    var amount = Number(cell.textContent.replace(/[^0-9]/g, ""));

    if(picked) picked.classList.remove("is-picked");
    picked = cell;
    picked.classList.add("is-picked");

    // The other package steps back. On narrow screens it hides, keeping the chosen table next to the options.
    feeBlocks.forEach(function(block, i){ block.classList.toggle("is-off", tables[i] !== table); });
    // Where a table scrolls sideways, bring the marked price into view.
    var scroller = cell.closest(".tbl-scroll");
    if(scroller && scroller.scrollWidth > scroller.clientWidth){
      var left = cell.offsetLeft - (scroller.clientWidth - cell.offsetWidth) / 2 - 40;
      if(scroller.scrollTo) scroller.scrollTo({ left: left, behavior: RM ? "auto" : "smooth" }); else scroller.scrollLeft = left;
    }

    var message = early ? "Early bird rate, until 31 August 2027." : "Late rate, 1 September to 31 October 2027.";
    if(category === 1) message += " ID proof required.";
    note.textContent = message;
    status.textContent = format(amount, rupees) + ". " + message;

    var from = shown === null || shown.rupees !== rupees || RM ? amount : shown.amount;
    shown = { amount: amount, rupees: rupees };
    if(frameId) window.cancelAnimationFrame(frameId);
    var start = null;
    (function step(now){
      if(start === null) start = now || 0;
      var t = from === amount ? 1 : Math.min(1, ((now || start) - start) / 320);
      var eased = 1 - Math.pow(1 - t, 3);
      price.textContent = format(Math.round(from + (amount - from) * eased), rupees);
      if(t < 1) frameId = window.requestAnimationFrame(step);
    })();
  }
  // If the marked price has slid off screen, move the page only as far as it takes to show it.
  function revealPicked(){
    if(!picked) return;
    var box = picked.getBoundingClientRect(), gap = 10;
    var top = $(".site-head").getBoundingClientRect().bottom + gap, bottom = window.innerHeight - gap;
    var shift = box.top < top ? box.top - top : box.bottom > bottom ? box.bottom - bottom : 0;
    if(shift) window.scrollBy({ top: shift, behavior: RM ? "auto" : "smooth" });
  }
  finder.addEventListener("change", function(){ update(); revealPicked(); });
  update();
}

/* ---------- dates answer "how long from now?" on hover ---------- */

if(finePointer){
  $$(".tl-item").forEach(function(item){
    var small = $(".tl-date small", item), time = $("time", item);
    if(!small || !time) return;
    var year = small.textContent;
    var when = new Date(time.getAttribute("datetime") + "T00:00:00");
    item.addEventListener("mouseenter", function(){
      var days = Math.ceil((when - new Date()) / 864e5);
      small.textContent = days > 1 ? "in " + days + " days" : days === 1 ? "tomorrow" : days === 0 ? "today" : "passed";
    });
    item.addEventListener("mouseleave", function(){ small.textContent = year; });
  });
}
})();
