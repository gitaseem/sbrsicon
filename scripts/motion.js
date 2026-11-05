/** Scroll-linked motion: progress line, globe turn, a few reveals, and the deadline line. */
(function(){
"use strict";
var $ = window.SBRS.select, $$ = window.SBRS.selectAll, clamp = window.SBRS.clamp, RM = window.SBRS.reducedMotion;

var bar = $(".scroll-bar"), hero = $(".hero");
var tl = $(".tl"), tlItems = $$(".tl-item"), campus = $(".campus");
var inkGroups = [], story = null;
var fill = null, lastY = window.scrollY, ticking = false;

function setUpReveals(){
  if(!("IntersectionObserver" in window)) return;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting) return;
      io.unobserve(entry.target);
      entry.target.classList.add("rv-in");
    });
  },{ rootMargin:"0px 0px -6% 0px" });
  // Reading content, portraits and fee tables are never hidden; only these lead the eye.
  $$(".sec .h2,.tk-list,.tl").forEach(function(el){ el.classList.add("rv"); io.observe(el); });
  // Small groups may stagger, and only by a little.
  $$(".hl,.spo").forEach(function(el){
    var index = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.style.setProperty("--d", index * 45 + "ms");
    el.classList.add("rv");
    io.observe(el);
  });
}

function setUpDeadlineLine(){
  if(!tl) return;
  var track = document.createElement("div");
  track.className = "tl-track";
  fill = document.createElement("span");
  fill.className = "tl-fill";
  fill.setAttribute("aria-hidden", "true");
  tl.parentNode.insertBefore(track, tl);
  track.appendChild(tl);
  track.appendChild(fill);
}

// Reading text starts muted, which still passes contrast, and inks in word by word as it is scrolled to.
function setUpInk(){
  var lede = $(".lede");
  if(lede){
    var words = lede.textContent.trim().split(/\s+/);
    lede.textContent = "";
    words.forEach(function(word, i){
      var span = document.createElement("span");
      span.className = "ink";
      span.textContent = word;
      lede.appendChild(span);
      if(i < words.length - 1) lede.appendChild(document.createTextNode(" "));
    });
    inkGroups.push({ box: lede, items: $$(".ink", lede), inStory: true });
  }
  var roles = $(".roles");
  if(roles){
    var items = $$("li", roles);
    items.forEach(function(item){ item.classList.add("ink"); });
    inkGroups.push({ box: roles, items: items });
  }
}

// About holds on screen while the paragraph lights up, then each objective takes the screen in turn.
function setUpStory(){
  var section = $("#about"), stage = section && $(".split", section);
  var panes = stage && stage.lastElementChild, lede = section && $(".lede", section);
  var goals = section && $(".objectives", section), items = section ? $$(".obj-list li", section) : [];
  if(!panes || !lede || !goals || !items.length) return;
  var words = $$(".ink", lede);

  var key = "sustainable solutions for the future of healthcare".split(" ");
  words.forEach(function(word, i){
    var matches = key.every(function(part, k){
      return words[i + k] && words[i + k].textContent.replace(/[.,]/g, "") === part;
    });
    if(!matches) return;
    key.forEach(function(part, k){
      var word = words[i + k];
      word.classList.add("ink-key");
      // Each word carries its own trailing space, so the marker runs unbroken across the phrase.
      if(k < key.length - 1 && word.nextSibling && word.nextSibling.nodeType === 3){
        word.textContent += " ";
        word.parentNode.removeChild(word.nextSibling);
      }
    });
  });

  var count = document.createElement("div");
  count.className = "story-count";
  count.setAttribute("aria-hidden", "true");
  var number = document.createElement("span");
  count.appendChild(number);
  var bars = items.map(function(){
    var bar = document.createElement("i");
    bar.appendChild(document.createElement("b"));
    count.appendChild(bar);
    return bar.firstChild;
  });
  goals.insertBefore(count, goals.children[1]);

  // Where each word starts and how long it takes. The marker waits for the words before it, then takes its time.
  var SOFT = 4, MARK = 2.5, t = 0, wasKey = false;
  var timing = words.map(function(word){
    var isKey = word.classList.contains("ink-key");
    if(isKey && !wasKey) t += SOFT - 1;
    wasKey = isKey;
    var slot = { start:t, len:isKey ? MARK : SOFT, isKey:isKey };
    t += isKey ? MARK : 1;
    return slot;
  });
  var total = timing[timing.length - 1].start + timing[timing.length - 1].len;

  story = { timing:timing, total:total, on:false, section:section, stage:stage, panes:panes, lede:lede, goals:goals, items:items, words:words, number:number, bars:bars };
  layoutStory();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(layoutStory);
  var lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener("resize", function(){
    // A phone's address bar changes the height by a small amount; that alone needs no new layout.
    if(window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 120) return;
    lastW = window.innerWidth; lastH = window.innerHeight;
    layoutStory();
  },{ passive:true });
}

// The sequence runs only if every step fits the screen, shrinking the type a little if needed.
function layoutStory(){
  if(!story) return;
  var s = story, fits = false;
  s.section.classList.add("story");
  [s.lede, s.goals].concat(s.items).forEach(function(el){ el.style.opacity = ""; el.style.transform = ""; });
  [1, .92, .84, .76].some(function(scale){
    s.section.style.setProperty("--story-scale", scale);
    var room = s.panes.clientHeight - 8, tallest = 0;
    s.items.forEach(function(item){ tallest = Math.max(tallest, item.offsetHeight); });
    fits = s.lede.offsetHeight <= room && tallest + (s.goals.offsetHeight - $(".obj-list", s.goals).offsetHeight) <= room;
    return fits;
  });
  s.on = fits;
  if(!fits){
    s.section.classList.remove("story");
    s.section.style.removeProperty("--story-scale");
    s.words.forEach(function(word){ word.classList.remove("is-inked"); word.style.removeProperty("--i"); });
  }
  request();
}

function drawStory(){
  var s = story, head = $(".site-head").offsetHeight;
  var box = s.section.getBoundingClientRect();
  if(box.bottom < -100 || box.top > window.innerHeight + 100) return;
  var p = clamp((head - box.top) / Math.max(1, s.section.offsetHeight - s.stage.offsetHeight), 0, 1);
  var A = 0.46, START = A + 0.06, SPAN = (1 - START) / s.items.length;

  // A soft front moves through the words; the marker fills one word at a time so it never leaves a gap.
  var front = clamp(p / (A * 0.94), 0, 1) * s.total;
  s.words.forEach(function(word, i){
    var slot = s.timing[i], level = clamp((front - slot.start) / slot.len, 0, 1);
    word.style.setProperty("--i", level.toFixed(3));
    if(slot.isKey) word.classList.toggle("is-inked", level > 0.5);
  });
  var away = clamp((p - A) / 0.05, 0, 1);
  s.lede.style.opacity = (1 - away).toFixed(3);
  s.lede.style.transform = "translateY(" + (away * -36).toFixed(1) + "px)";
  var come = clamp((p - A - 0.025) / 0.035, 0, 1);
  s.goals.style.opacity = come.toFixed(3);
  s.goals.style.transform = "translateY(" + ((1 - come) * 24).toFixed(1) + "px)";

  var current = 0;
  s.items.forEach(function(item, i){
    var d = (p - (START + SPAN * (i + 0.5))) / SPAN;
    if(i === 0 && d < 0) d = 0;                       // the first stays until its turn ends
    if(i === s.items.length - 1 && d > 0) d = 0;      // the last stays as the section leaves
    var extra = Math.max(0, Math.abs(d) - 0.3);
    // Fully gone by the handover point, so two objectives never overlap.
    item.style.opacity = clamp(1 - extra / 0.2, 0, 1).toFixed(3);
    item.style.transform = "translateY(" + ((d < 0 ? 1 : -1) * extra * 110).toFixed(1) + "px)";
    if(p >= START + SPAN * i) current = i;
    s.bars[i].style.transform = "scaleX(" + clamp((p - START - SPAN * i) / SPAN, 0, 1).toFixed(3) + ")";
  });
  s.number.textContent = (current + 1) + " / " + s.items.length;
}

function frame(){
  ticking = false;
  var y = window.scrollY, vh = window.innerHeight;
  var max = Math.max(1, document.documentElement.scrollHeight - vh);
  if(bar) bar.style.transform = "scaleX(" + clamp(y / max, 0, 1).toFixed(4) + ")";
  if(RM){ lastY = y; return; }

  // The globe turns with the page while it is on screen, and returns when you scroll back.
  if(hero && window.SBRS.spinGlobe && y !== lastY && y < hero.offsetHeight) window.SBRS.spinGlobe((y - lastY) * 0.06);

  if(fill && window.innerWidth >= 1000){
    var box = fill.parentNode.getBoundingClientRect();
    if(box.bottom > -100 && box.top < vh + 100){
      var p = clamp((vh * 0.82 - box.top) / (vh * 0.42), 0, 1);
      fill.style.transform = "scaleX(" + p.toFixed(3) + ")";
      tlItems.forEach(function(item, i){ item.classList.toggle("is-lit", i / tlItems.length <= p); });
    }
  }
  if(story && story.on) drawStory();

  inkGroups.forEach(function(group){
    if(group.inStory && story && story.on) return;
    var box = group.box.getBoundingClientRect();
    if(box.bottom < -100 || box.top > vh + 100) return;
    var done = clamp((vh * 0.88 - box.top) / (vh * 0.48), 0, 1) * group.items.length;
    group.items.forEach(function(item, i){ item.classList.toggle("is-inked", i < done); });
  });

  if(campus){
    var photo = campus.getBoundingClientRect();
    if(photo.bottom > 0 && photo.top < vh){
      var open = clamp((vh - photo.top) / (vh * 0.7), 0, 1);
      var side = (1 - open) * 7;
      campus.style.clipPath = "inset(" + (side * 0.6).toFixed(2) + "% " + side.toFixed(2) + "%)";
    }
  }
  lastY = y;
}

function request(){
  if(ticking) return;
  ticking = true;
  window.requestAnimationFrame(frame);
}

if(!RM){
  setUpDeadlineLine();
  setUpReveals();
  setUpInk();
  setUpStory();
}
window.addEventListener("scroll", request, { passive:true });
window.addEventListener("resize", request, { passive:true });
frame();
})();
