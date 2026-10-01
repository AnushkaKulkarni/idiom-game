"use strict";
/* GAME: the engine, sky, meter, screens and scrapbook. It reads the story from story.js,
   so story.js must load first. */

function ico(name, cls){
  const s = document.createElement("span");
  s.className = "ico" + (cls ? " " + cls : "");
  s.setAttribute("aria-hidden", "true");
  s.textContent = EMOJI[name];
  return s;
}

/* =====================================================================
   ENGINE: state, saving, helpers
   ===================================================================== */
const S = {score:50, hist:[], found:new Set(), friend:"", dog:"", t:0};
const KEY = "idiom-game-scrapbook-v1";
let BOOK = {};
try { BOOK = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { BOOK = {}; }
for (const k of Object.keys(BOOK)) if (!(k in IDIOMS)) delete BOOK[k];   /* an idiom that was removed or replaced no longer counts */
function saveBook(){ try { localStorage.setItem(KEY, JSON.stringify(BOOK)); } catch (e) {} }
const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = id => document.getElementById(id);
const card = $("card");
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
/* text can be a string with {friend}/{dog} placeholders, or a function */
const val = x => typeof x === "function" ? x()
  : String(x == null ? "" : x).replace(/\{(friend|dog)\}/g, (_, k) => S[k]);
function welcomeText(){
  const got = Object.keys(BOOK).length;
  if (got === 0) return "Would you like to play?";
  if (got >= IDIOM_IDS.length) return "You've found every idiom!\nWould you like to play again?";
  return "Welcome back. You've found " + got + " of " + IDIOM_IDS.length + " idioms.\nWould you like to play?";
}
function h(tag, props, ...kids){
  const e = document.createElement(tag);
  for (const k in (props || {})) {
    const v = props[k];
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(typeof c === "object" ? c : document.createTextNode(String(c)));
  }
  return e;
}
const signed = d => (d > 0 ? "+" : d < 0 ? "\u2212" : "\u00B1") + Math.abs(d);

/* ---------- typewriter ---------- */
let typer = null, skipFn = null;
function cancelTyper(){ if (typer) clearTimeout(typer); typer = null; skipFn = null; }
function typeInto(el, text, done){
  cancelTyper();
  if (reduce) { el.textContent = text; done && done(); return; }
  let i = 0; el.textContent = "";
  const finish = () => { cancelTyper(); el.textContent = text; done && done(); };
  skipFn = finish;
  const step = () => {
    i += 2;
    if (i >= text.length) { finish(); return; }
    el.textContent = text.slice(0, i);
    typer = setTimeout(step, 16);
  };
  step();
}
card.addEventListener("click", () => { if (skipFn) skipFn(); });

/* =====================================================================
   SCENE: a pixel sky and hills with an emoji sun sinking between them
   Two low-res canvases (one cell = CELL css px) are scaled up with hard edges:
   the sky behind the sun, the hills in front of it, so the sun sets behind them.
   Only five colors are ever on screen: sky, horizon glow, stars, far hills, near hills.
   The palette shifts afternoon -> golden hour -> dusk in eight steps.
   One value (P, 0 = afternoon, 1 = sundown) is eased by a critically damped
   spring, so the sun starts and stops softly.
   ===================================================================== */
const CELL = 4;
const cv = $("scene"), g2 = cv.getContext("2d");
const hv = $("hills"), gh = hv.getContext("2d");
const sunEl = $("sun");
const stageEl = document.querySelector(".stage");
/* ink, paper, sky, glow, far hills, near hills */
const DAY  = ["#3b4a78", "#fffaf0", "#a7dcf5", "#ffe08a", "#9ad8a8", "#6cc08c"];
const GOLD = ["#4a3f6b", "#fff5e0", "#b5cdf0", "#ffc98a", "#93c99a", "#68ac82"];
const DUSK = ["#463b7a", "#fff0e6", "#8579c9", "#f5aac0", "#7fc9b5", "#43797f"];
const hex = h6 => [1, 3, 5].map(i => parseInt(h6.slice(i, i + 2), 16));
const STOPS = [DAY, GOLD, DUSK].map(pal => pal.map(hex));
const mix = (a, b, t) => "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",") + ")";
function paletteAt(t){
  const seg = t < 0.5 ? 0 : 1, u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  return STOPS[seg].map((a, i) => mix(a, STOPS[seg + 1][i], u));
}
/* the same six colors drive the page's CSS, so the whole app shifts with the sun */
const PALETTE_VARS = ["ink", "paper", "sky", "glow", "far", "near"];
let lastStep = -1;
function applyPalette(step, c){
  if (step === lastStep) return;
  lastStep = step;
  PALETTE_VARS.forEach((k, i) => document.documentElement.style.setProperty("--" + k, c[i]));
}
const STARS = [[.12,.10],[.30,.22],[.44,.08],[.58,.20],[.71,.10],[.86,.24],[.92,.08],[.20,.34]];
let P = 0, V = 0, TARGET = 0, raf = null, lastT = 0, cols = 0, rows = 0, SW = 0, SH = 0, far = [], near = [];

function measure(){
  SW = stageEl.clientWidth; SH = stageEl.clientHeight;
  cols = Math.ceil(SW / CELL); rows = Math.ceil(SH / CELL);
  [cv, hv].forEach(c => { c.width = cols; c.height = rows; c.style.width = cols * CELL + "px"; c.style.height = rows * CELL + "px"; });
  far = []; near = [];
  for (let x = 0; x < cols; x++) {                   /* stepped ridge lines, one row per column */
    far[x]  = Math.round(rows * 0.72 + 2.2 * Math.sin(x * 0.11 + 0.6) + 1.4 * Math.sin(x * 0.29 + 2.1));
    near[x] = Math.round(rows * 0.86 + 1.8 * Math.sin(x * 0.15 + 1.9) + 1.0 * Math.sin(x * 0.37));
  }
  renderSun();
}
function renderSun(){
  if (!cols) return;
  const p = Math.max(0, Math.min(1, P));
  const step = Math.round(p * 8);                    /* palette moves in steps, like a retro palette swap */
  const c = paletteAt(step / 8);
  applyPalette(step, c);
  const px = (x, y, col) => { g2.fillStyle = col; g2.fillRect(x, y, 1, 1); };

  /* sky, with a dithered horizon glow that rises as the sun sets */
  g2.fillStyle = c[2]; g2.fillRect(0, 0, cols, rows);
  const band = Math.round(rows * (0.60 - 0.20 * p));
  g2.fillStyle = c[3]; g2.fillRect(0, band, cols, rows - band);
  for (let x = 0; x < cols; x++) {                   /* ordered dither: 25%, 50%, 75% glow on the rows above the band */
    if (x % 4 === 0) px(x, band - 2, c[3]);
    if (x % 2 === 1) px(x, band - 1, c[3]);
    if (x % 4 === 2) px(x, band, c[2]);
  }
  STARS.forEach(([sx, sy], i) => { if (p > 0.55 + i * 0.05) px(Math.round(cols * sx), Math.round(rows * sy), c[1]); });

  /* hills, on their own canvas in front of the sun */
  gh.clearRect(0, 0, cols, rows);
  for (let x = 0; x < cols; x++) {
    gh.fillStyle = c[4]; gh.fillRect(x, far[x], 1, rows - far[x]);
    gh.fillStyle = c[5]; gh.fillRect(x, near[x], 1, rows - near[x]);
  }

  /* the emoji sun: straight down, half behind the hills at sundown */
  const x = SW * 0.5, y = SH * (0.34 + 0.38 * p);
  sunEl.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) translate(-50%,-50%)";
}
function tick(now){
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  const k = 2.2, c = 2 * Math.sqrt(k);              /* critically damped: no overshoot */
  V += ((TARGET - P) * k - V * c) * dt;
  P += V * dt;
  renderSun();
  if (Math.abs(TARGET - P) < 0.0005 && Math.abs(V) < 0.0005) { P = TARGET; V = 0; renderSun(); raf = null; return; }
  raf = requestAnimationFrame(tick);
}
function updateSun(){
  TARGET = Math.max(0, Math.min(1, S.t / 5));
  if (reduce) { P = TARGET; V = 0; renderSun(); return; }
  if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
}
window.addEventListener("resize", measure);

/* =====================================================================
   METER  (ten pixel segments)
   ===================================================================== */
function faceFor(s){
  return s >= 85 ? "stars" : s >= 65 ? "grin" : s >= 45 ? "smile" : s >= 25 ? "unsure" : s > 0 ? "worried" : "dizzy";
}
function updateMeter(){
  const s = S.score;
  $("face").replaceChildren(ico(faceFor(s)));
  $("num").textContent = s;
  const bar = $("bar");
  if (!bar.children.length) for (let i = 0; i < 10; i++) bar.append(h("i"));
  const on = Math.round(Math.max(0, Math.min(100, s)) / 10);
  Array.from(bar.children).forEach((el, i) => el.classList.toggle("on", i < on));
}
function pulse(el){ el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
function bump(d){ S.score = Math.min(100, S.score + d); updateMeter(); pulse($("meter")); }
function updateBookBtn(){ $("bookcount").textContent = Object.keys(BOOK).length + "/" + IDIOM_IDS.length; }

/* =====================================================================
   FLOW
   ===================================================================== */
function go(id){
  let n = NODES[id];
  if (n.gate && S.score <= 0) { id = "lose"; n = NODES.lose; }
  if (id === "lose") discover("rock");
  if (n.t !== undefined) S.t = n.t;
  updateSun();
  if (n.kind === "multi") renderMulti(n);
  else if (n.kind === "numbers") renderNumbers(n);
  else if (n.kind === "text") renderText(n);
  else if (n.kind === "end") renderEnd(n);
  else renderChoice(n);
}
function discover(id){
  S.found.add(id);
  if (BOOK[id]) return false;
  BOOK[id] = 1; saveBook(); updateBookBtn(); pulse($("bookbtn"));
  return true;
}
function choose(c){
  if (c.idiom || c.say) reveal(c);
  else go(c.next);
}

/* =====================================================================
   RENDER
   ===================================================================== */
function renderChoice(n){
  cancelTyper();
  const p = h("p", {class: "prompt"});
  const grid = h("div", {class: "choices" + (n.choices.length === 4 ? " four" : "")});
  n.choices.forEach(c => {
    grid.append(h("button", {class: "choice", type: "button", onclick: () => choose(c)},
      h("span", {class: "ci"}, ico(c.icon)), h("span", {}, val(c.label))));
  });
  card.replaceChildren(p, grid);
  typeInto(p, val(n.text), () => grid.classList.add("show"));
}

function renderNumbers(n){
  cancelTyper();
  const p = h("p", {class: "prompt"});
  const msg = h("p", {class: "msg"});
  const grid = h("div", {class: "clouds choices"});
  for (let i = 1; i <= 10; i++) {
    const b = h("button", {class: "cloudbtn", type: "button", "aria-label": "Number " + i},
      ico("cloud"), h("span", {class: "cn"}, String(i)));
    b.addEventListener("click", () => {
      if (i === n.answer) { choose(n.win); }
      else { b.classList.add("wrong"); msg.textContent = "Not that one. Try again!"; }
    });
    grid.append(b);
  }
  card.replaceChildren(p, grid, msg);
  typeInto(p, val(n.text), () => grid.classList.add("show"));
}

/* Tick any mix of options, then cook. The mix picks the outcome. */
function renderMulti(n){
  cancelTyper();
  const p = h("p", {class: "prompt"});
  const picked = new Set();
  const cook = h("button", {class: "btn btn-primary", type: "button", disabled: ""}, n.cta);
  const tiles = n.options.map(o => {
    const b = h("button", {class: "choice", type: "button", "aria-pressed": "false"},
      h("span", {class: "ci"}, ico(o.icon)), h("span", {}, o.label));
    b.addEventListener("click", () => {
      picked.has(o.key) ? picked.delete(o.key) : picked.add(o.key);
      b.classList.toggle("on", picked.has(o.key));
      b.setAttribute("aria-pressed", String(picked.has(o.key)));
      cook.disabled = picked.size === 0;
    });
    return b;
  });
  cook.addEventListener("click", () => choose(n.outcomes[n.options.map(o => o.key).filter(k => picked.has(k)).join("+")]));
  const grid = h("div", {class: "choices"}, tiles);
  const row = h("div", {class: "later cook"}, cook);
  card.replaceChildren(p, grid, row);
  typeInto(p, val(n.text), () => { grid.classList.add("show"); row.classList.add("show"); });
}

function renderText(n){
  cancelTyper();
  const p = h("p", {class: "prompt"});
  const input = h("input", {type: "text", maxlength: "20", placeholder: n.placeholder, autocomplete: "off", "aria-label": "Name"});
  const submit = () => { S[n.key] = cap(input.value.trim()) || n.def; go(n.next); };
  const field = h("div", {class: "field"}, input, h("button", {class: "btn btn-primary", type: "button", onclick: submit}, "Continue"));
  input.addEventListener("keydown", e => { if (e.key === "Enter") submit(); });
  card.replaceChildren(p, field);
  typeInto(p, val(n.text), () => { field.classList.add("show"); input.focus({preventScroll: true}); });
}

/* reference block: definition, optional first-recorded date and origin, then the sources */
function fact(label, text){ return h("p", {class: "fact"}, h("span", {class: "lab"}, label + ":"), " " + text); }
function facts(it){
  const box = h("div", {class: "facts"}, fact("Definition", it.def));
  if (it.first)  box.append(fact("First recorded", it.first));
  if (it.origin) box.append(fact("Origin", it.origin));
  const links = [];
  it.refs.forEach(([name, url, role], i) => {
    if (i) links.push(" \u00B7 ");
    links.push((role || "Source") + ": ", h("a", {href: url}, name));
  });
  box.append(h("p", {class: "cite"}, ...links));
  return box;
}

function reveal(c){
  cancelTyper();
  const it = c.idiom ? IDIOMS[c.idiom] : null;
  const d = c.delta || 0;
  const isNew = c.idiom ? discover(c.idiom) : false;
  if (d) bump(d);
  S.hist.push({icon: it ? it.icon : c.icon, label: it ? it.title : c.label, delta: d});

  const say = h("p", {class: "say"});
  const later = h("div", {class: "later"});
  if (it) later.append(facts(it));
  if (d) later.append(h("div", {class: "delta " + (d > 0 ? "up" : "down")}, signed(d) + " mood"), h("br"));
  later.append(h("button", {class: "btn btn-primary", type: "button", onclick: () => go(c.next)}, "Continue"));

  card.replaceChildren(h("div", {class: "reveal"},
    h("div", {class: "art " + (it ? it.anim : "bounce")}, ico(it ? it.icon : c.icon)),
    it ? h("div", {class: "rtitle"}, it.title, isNew ? h("span", {class: "badge"}, "New idiom!") : null) : null,
    say, later));
  typeInto(say, val(c.say), () => { later.classList.add("show"); later.querySelector("button").focus({preventScroll: true}); });
}

function renderEnd(n){
  cancelTyper();
  const lose = !!n.lose;

  /* On a win, your final mood picks the idiom that closes the day. It is shown right after the score. */
  let bed = null, bedLead = null, leadIn = "";
  if (!lose) {
    const m = S.score;
    const pick = m >= 60
      ? {idiom: "baby",    day: "a good day",  say: "Your head hits the pillow and you can start tomorrow alright again."}
      : m >= 40
      ? {idiom: "sleepon", day: "a mixed day", say: "Some of the day went well and some didn't. You'll sort it out in the morning."}
      : {idiom: "wink",    day: "a rough day", say: "You stare at the ceiling and replay the day. There is so much you could have done differently."};
    const it = IDIOMS[pick.idiom];
    const isNew = discover(pick.idiom);
    leadIn = ", " + pick.day + ".";
    bedLead = h("p", {class: "sub bedlead"}, "At bedtime you:");
    bed = h("div", {class: "bed surface"},
      h("div", {class: "art"}, ico(it.icon)),
      h("div", {class: "rtitle"}, it.title, isNew ? h("span", {class: "badge"}, "New idiom!") : null),
      h("p", {class: "say"}, pick.say),
      facts(it));
  }

  /* finding every other idiom unlocks the last one */
  let done = null;
  if (!BOOK.stone && IDIOM_IDS.filter(id => id !== "stone").every(id => BOOK[id])) {
    const it = IDIOMS.stone;
    discover("stone");
    done = h("div", {class: "bed surface"},
      h("div", {class: "art"}, ico(it.icon)),
      h("div", {class: "rtitle"}, it.title, h("span", {class: "badge"}, "New idiom!")),
      h("p", {class: "say"}, "You've found every idiom in the scrapbook. There is nothing left to look for."),
      facts(it));
  }

  const recap = h("ol", {class: "recap"}, S.hist.map(r => h("li", {class: "surface"},
    h("span", {class: "ri"}, ico(r.icon)), h("span", {class: "rt"}, r.label),
    h("span", {class: "rd " + (r.delta > 0 ? "up" : r.delta < 0 ? "down" : "zero")}, signed(r.delta)))));
  const total = Object.keys(BOOK).length;
  const left = IDIOM_IDS.length - total;
  const progress = left === 0
    ? "You've unlocked every idiom in the scrapbook!"
    : total + " of " + IDIOM_IDS.length + " unlocked. " + left + " still hidden, so try different choices.";
  /* on a loss, say plainly where the mood ended up (the list below shows what cost what) */
  const shown = S.score < 0 ? "\u2212" + Math.abs(S.score) : String(S.score);
  const why = lose ? h("p", {class: "sub"},
    "Your mood started at 50 and fell to " + shown + ". If your mood hits 0, you lose.") : null;
  card.replaceChildren(h("div", {class: "end"},
    h("div", {class: "art bounce"}, ico(lose ? "rock" : "couch")),
    h("h2", {}, lose ? "Rock bottom" : "You made it through the day!"),
    h("p", {class: "sub"}, lose ? "It doesn't get much lower than this." : "Final mood: " + S.score + leadIn),
    why,
    bedLead,
    bed,
    h("p", {class: "sub"}, "You found " + S.found.size + (S.found.size === 1 ? " idiom" : " idioms") + " this run. " + progress),
    done,
    recap,
    h("div", {class: "endbtns"},
      h("button", {class: "btn btn-primary", type: "button", onclick: restart}, "Play again"),
      h("button", {class: "btn", type: "button", onclick: openBook}, "Open scrapbook"))));
}

function restart(){
  S.score = 50; S.hist = []; S.found = new Set(); S.friend = ""; S.dog = ""; S.t = 0;
  updateMeter();
  go("wake");
}

/* =====================================================================
   SCRAPBOOK
   ===================================================================== */
const overlay = $("overlay");
let resetArmed = false;
function renderBook(){
  const got = Object.keys(BOOK).length;
  $("sbsub").textContent = got + " of " + IDIOM_IDS.length + " found. Different choices unlock different idioms.";
  $("sbgrid").replaceChildren(...IDIOM_IDS.map(id => {
    const it = IDIOMS[id];
    return BOOK[id]
      ? h("div", {class: "sb surface"}, h("div", {class: "e"}, ico(it.icon)), h("div", {class: "t"}, it.title), facts(it))
      : h("div", {class: "sb surface locked"}, h("div", {class: "e"}, "?"), h("div", {class: "m"}, it.hint));
  }));
  $("sbreset").textContent = "Reset scrapbook";
  resetArmed = false;
}
function openBook(){ renderBook(); overlay.classList.add("open"); $("sbclose").focus(); }
function closeBook(){ overlay.classList.remove("open"); }
$("bookbtn").addEventListener("click", openBook);
$("sbclose").addEventListener("click", closeBook);
overlay.addEventListener("click", e => { if (e.target === overlay) closeBook(); });
$("sbreset").addEventListener("click", () => {
  if (!resetArmed) { resetArmed = true; $("sbreset").textContent = "Tap again to erase every idiom you've found"; return; }
  BOOK = {}; saveBook(); updateBookBtn(); renderBook();
});

/* ---------- keyboard: Esc closes the scrapbook ---------- */
document.addEventListener("keydown", e => { if (e.key === "Escape") closeBook(); });

/* ---------- boot ---------- */
$("bookico").append(ico("books"));
measure();
updateMeter();
updateBookBtn();
go("start");
