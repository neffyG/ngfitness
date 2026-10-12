import { WAKE, WORK, FINISH, BED, DAYS, SCHEDULE, HARD_LIMITS } from "./workouts.js";
import { figureSvg } from "./figures.js";

/* =========================================================
   STORAGE — same key as the first version, so old data stays
   ========================================================= */
const KEY = "fit:neftali";
const defaults = () => ({
  name: "Neftali", start: null, goal: null, weights: [], checks: {},
  lifts: {},            // { exerciseSlug: { "YYYY-MM-DD": { w: 120, sets: [1,1,2] } } }   1 = hit reps, 2 = missed reps
  cals: {},             // { "YYYY-MM-DD": { kcal: 2100, protein: 160 } }
  settings: { kcal: null, protein: null, rest: 90 },
  seenLevel: null, seenAch: null, title: null,
});
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY)) || {};
    const d = defaults();
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) } };
  } catch { return defaults(); }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }
let state = load();

/* ---------- helpers ---------- */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
const fmt = (n) => (n == null || isNaN(n) ? "—" : (Math.round(n * 10) / 10).toFixed(1));
const num = (n) => Math.round(n).toLocaleString();
const md = (s) => parse(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const sorted = () => [...state.weights].sort((a, b) => a.d.localeCompare(b.d));
const DAY_MS = 86400000;
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const setsOf = (s) => parseInt((s.match(/^(\d+)\s*×/) || [])[1]) || 1;
const repsOf = (s) => parseInt((s.match(/×\s*(\d+)/) || [])[1]) || 10;
function signed(n) { if (n == null) return "—"; const v = Math.round(n * 10) / 10; return `${v > 0 ? "+" : ""}${v.toFixed(1)}`; }

function toast(msg, sys = true, ms = 2200) {
  const t = $("#toast"); t.innerHTML = (sys ? "<b>[SYSTEM]</b>" : "") + msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms);
}

// every weighted lift in the plan, by slug
const ITEMS = {};
DAYS.forEach((d) => (d.items || []).forEach((it) => { if (it.w && !ITEMS[slug(it.n)]) ITEMS[slug(it.n)] = it; }));

/* =========================================================
   PLAN STRUCTURE (block keys match the first version)
   ========================================================= */
const todayId = () => SCHEDULE[new Date().getDay()] ?? "rest";
function blocksFor(day) {
  const b = [WAKE, WORK];
  if (day.rest) b.push({ t: "Move", w: "Anywhere · 30 min", items: day.items });
  else b.push(
    { t: "Before you lift", w: "At the gym · 10 min", note: "This block is the program. If a session has to be short, cut from the lifting, never from here.", items: day.prep },
    { t: "Lift", w: "At the gym · 45–60 min", lift: true, items: day.items },
    FINISH,
  );
  b.push(BED);
  return b.map((blk, i) => ({ ...blk, key: `${i}` }));
}
function dayInfo(date) {
  const rec = state.checks[date];
  if (!rec) return null;
  const day = DAYS.find((d) => d.id === rec.day);
  if (!day) return null;
  const blocks = blocksFor(day), done = new Set(rec.done);
  const full = (b) => b.items.every((_, i) => done.has(`${b.key}.${i}`));
  const gym = day.rest ? full(blocks[2]) : full(blocks[2]) && full(blocks[3]) && full(blocks[4]);
  const total = blocks.reduce((n, b) => n + b.items.length, 0);
  const mobility = [...done].filter((k) => day.rest || !k.startsWith("3.")).length;
  return { day, done, count: done.size, total, gym, spine: full(blocks[0]) && full(blocks.at(-1)) };
}
function checksFor(dayId, date = ymd()) { const r = state.checks[date]; return r && r.day === dayId ? new Set(r.done) : new Set(); }
function progress(day) {
  const total = blocksFor(day).reduce((n, b) => n + b.items.length, 0);
  const done = checksFor(day.id).size;
  return { done, total, pct: Math.round((done / total) * 100) };
}
function setCheck(dayId, key, on) {
  const d = ymd();
  const rec = state.checks[d]?.day === dayId ? state.checks[d] : { day: dayId, done: [] };
  const set = new Set(rec.done);
  on ? set.add(key) : set.delete(key);
  state.checks[d] = { day: dayId, done: [...set] };
}

/* =========================================================
   WEIGHT STATS
   ========================================================= */
function stats() {
  const w = sorted();
  const start = state.start ?? w[0]?.w ?? null;
  const cur = w.at(-1)?.w ?? null;
  const lost = start != null && cur != null ? start - cur : null;
  let pct = 0;
  if (state.goal != null && start != null && cur != null && start !== state.goal) pct = Math.max(0, Math.min(100, ((start - cur) / (start - state.goal)) * 100));
  let week = null, rate = null;
  if (w.length >= 2) {
    const cutoff = parse(w.at(-1).d).getTime() - 7 * DAY_MS;
    const base = [...w].reverse().find((e) => parse(e.d).getTime() <= cutoff) ?? w[0];
    week = cur - base.w;
    const days = (parse(w.at(-1).d) - parse(w[0].d)) / DAY_MS;
    if (days >= 1) rate = ((cur - w[0].w) / days) * 7;
  }
  return { start, cur, lost, pct, week, rate, streak: streakOf(new Set(w.map((e) => e.d))) };
}
function streakOf(set) {
  let n = 0; const d = new Date();
  if (!set.has(ymd(d))) d.setDate(d.getDate() - 1);
  while (set.has(ymd(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function bestStreakOf(dates) {
  const s = [...dates].sort(); let best = 0, run = 0, prev = null;
  for (const d of s) { run = prev && addDays(prev, 1) === d ? run + 1 : 1; best = Math.max(best, run); prev = d; }
  return best;
}

/* =========================================================
   THE SYSTEM — XP, levels, ranks, stats, achievements
   Everything is calculated from your logs, so deleting a log takes its XP back.
   ========================================================= */
const RANKS = [
  { r: "E", min: 1, c: "#9CA3AF" }, { r: "D", min: 6, c: "#36E0A6" }, { r: "C", min: 12, c: "#3BA7FF" },
  { r: "B", min: 20, c: "#8B5CF6" }, { r: "A", min: 30, c: "#FF6B4A" }, { r: "S", min: 42, c: "#F5C451" },
];
const rankOf = (lv) => [...RANKS].reverse().find((x) => lv >= x.min);
const need = (lv) => 100 + 25 * (lv - 1);
function levelOf(xp) { let lv = 1, acc = 0; while (xp >= acc + need(lv)) { acc += need(lv); lv++; } return { level: lv, into: xp - acc, need: need(lv) }; }

const ACH = [
  { id: "gate", i: "🚪", n: "First Gate", d: "Clear your first workout", t: (f) => f.gymDays >= 1 },
  { id: "reg", i: "🗓️", n: "Regular", d: "Clear 10 workouts", t: (f) => f.gymDays >= 10 },
  { id: "iron", i: "⛓️", n: "Iron Habit", d: "Clear 50 workouts", t: (f) => f.gymDays >= 50 },
  { id: "legs", i: "🦵", n: "Leg Day Devotee", d: "Clear 20 leg days", t: (f) => f.legDays >= 20 },
  { id: "spine", i: "🛡️", n: "Spine of Steel", d: "Wake-up + bedtime blocks on 14 days", t: (f) => f.spineDays >= 14 },
  { id: "st7", i: "🔥", n: "Unbroken", d: "7-day weigh-in streak", t: (f) => f.bestStreak >= 7 },
  { id: "st30", i: "☄️", n: "Relentless", d: "30-day weigh-in streak", t: (f) => f.bestStreak >= 30 },
  { id: "pr1", i: "🏅", n: "New Record", d: "Set your first PR", t: (f) => f.prs >= 1 },
  { id: "pr25", i: "🏆", n: "Record Breaker", d: "Set 25 PRs", t: (f) => f.prs >= 25 },
  { id: "vol", i: "🏋️", n: "Heavy Lifter", d: "Lift 100,000 lb total", t: (f) => f.volume >= 100000 },
  { id: "l5", i: "📉", n: "Shedding", d: "Lose 5 lb", t: (f) => f.lost >= 5 },
  { id: "l15", i: "⚡", n: "Transformation", d: "Lose 15 lb", t: (f) => f.lost >= 15 },
  { id: "l30", i: "👑", n: "Reborn", d: "Lose 30 lb", t: (f) => f.lost >= 30 },
  { id: "half", i: "🌓", n: "Halfway", d: "50% of the way to your goal", t: (f) => f.pct >= 50 },
  { id: "goal", i: "💎", n: "Goal Cleared", d: "Reach your goal weight", t: (f) => f.pct >= 100 },
  { id: "fuel", i: "🍽️", n: "Fuel Discipline", d: "Log calories on 14 days", t: (f) => f.calLogs >= 14 },
  { id: "q7", i: "📜", n: "Quest Hunter", d: "Clear 7 daily quests", t: (f) => f.questDays >= 7 },
  { id: "q30", i: "🌌", n: "Questmaster", d: "Clear 30 daily quests", t: (f) => f.questDays >= 30 },
];

function questsFor(date) {
  const info = dayInfo(date);
  const isToday = date === ymd();
  const planned = DAYS.find((d) => d.id === (isToday ? todayId() : info?.day.id));
  return [
    { n: "Weigh in", ok: state.weights.some((w) => w.d === date), x: 15 },
    { n: planned?.rest ? "Recovery: walk + mobility" : `Clear training: ${planned?.title?.replace("&amp;", "&") ?? "workout"}`, ok: !!info?.gym, x: planned?.rest ? 25 : 60 },
    { n: "Spine care: wake-up + bedtime blocks", ok: !!info?.spine, x: 25 },
    { n: "Log calories from Lifesum", ok: !!state.cals[date]?.kcal, x: 10 },
  ];
}

function computeGame() {
  const f = { weighIns: state.weights.length, checks: 0, mobility: 0, gymDays: 0, restDays: 0, legDays: 0, spineDays: 0,
    setsDone: 0, prs: 0, volume: 0, calLogs: 0, calOnTarget: 0, questDays: 0, prBoard: {} };
  const dates = new Set([...Object.keys(state.checks), ...state.weights.map((w) => w.d), ...Object.keys(state.cals)]);
  for (const d of dates) {
    const info = dayInfo(d);
    if (info) {
      f.checks += info.count;
      f.mobility += [...info.done].filter((k) => info.day.rest || !k.startsWith("3.")).length;
      if (info.gym) { if (info.day.rest) f.restDays++; else f.gymDays++; if (info.day.id.startsWith("legs")) f.legDays++; }
      if (info.spine) f.spineDays++;
    }
    const c = state.cals[d];
    if (c?.kcal) { f.calLogs++; if (state.settings.kcal && c.kcal <= state.settings.kcal) f.calOnTarget++; }
    if (questsFor(d).every((q) => q.ok)) f.questDays++;
  }
  for (const [sl, sessions] of Object.entries(state.lifts)) {
    const item = ITEMS[sl]; const reps = item ? repsOf(item.s) : 10;
    let best = 0, bestDate = null;
    for (const d of Object.keys(sessions).sort()) {
      const s = sessions[d]; const done = (s.sets || []).filter((x) => x === 1).length;
      f.setsDone += done; f.volume += done * (s.w || 0) * reps;
      if (done && s.w > 0) { if (best > 0 && s.w > best) f.prs++; if (s.w > best) { best = s.w; bestDate = d; } }
    }
    if (best) f.prBoard[sl] = { w: best, d: bestDate, n: item?.n || sl };
  }
  const st = stats();
  f.lost = Math.max(0, st.lost || 0); f.pct = st.pct; f.bestStreak = bestStreakOf(new Set(state.weights.map((w) => w.d)));
  let xp = f.weighIns * 15 + f.checks * 3 + f.gymDays * 60 + f.restDays * 25 + f.spineDays * 25 + f.setsDone * 2 + f.prs * 30
    + f.calLogs * 10 + f.calOnTarget * 15 + f.questDays * 50;
  const unlocked = ACH.filter((a) => a.t(f));
  xp += unlocked.length * 100;
  const L = levelOf(xp);
  const stat = {
    STR: 10 + Math.floor(f.setsDone / 10) + f.prs,
    AGI: 10 + Math.floor(f.mobility / 20),
    VIT: 10 + Math.floor(f.weighIns / 5) + Math.floor(f.calLogs / 5),
    END: 10 + f.gymDays,
  };
  return { f, xp, unlocked, stat, ...L, rank: rankOf(L.level) };
}

let G = computeGame();
function checkProgress() {
  const before = state.seenLevel;
  G = computeGame();
  if (state.seenLevel == null || state.seenAch == null) {
    state.seenLevel = G.level; state.seenAch = G.unlocked.map((a) => a.id);
    if (!state.title && G.unlocked.length) state.title = G.unlocked.at(-1).n;
    save();
    setTimeout(() => toast(G.xp ? `Player registered. Your past logs were converted to <b style="color:var(--gold)">${num(G.xp)} XP</b> — you start at LV ${G.level}.` : "Player registered. Clear your daily quest to start leveling.", true, 4200), 400);
    return;
  }
  const newAch = G.unlocked.filter((a) => !state.seenAch.includes(a.id));
  if (newAch.length) {
    state.seenAch = G.unlocked.map((a) => a.id);
    if (!state.title) state.title = newAch[0].n;
    setTimeout(() => toast(`Achievement unlocked: <b style="color:var(--gold)">${esc(newAch[0].n)}</b> +100 XP`, true, 3200), 300);
  }
  if (G.level > before) {
    $("#lv-num").textContent = `LV ${before}  →  LV ${G.level}`;
    const oldRank = rankOf(before), newRank = G.rank;
    $("#lv-rank").textContent = newRank.r !== oldRank.r ? `RANK UP: ${newRank.r}-RANK` : "All stats increased.";
    $("#levelup").hidden = false;
    if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
  }
  state.seenLevel = G.level;
  save();
}
$("#lv-ok").onclick = () => ($("#levelup").hidden = true);

/* =========================================================
   NAVIGATION
   ========================================================= */
let current = "status";
function show(view) {
  current = view;
  $$(".view").forEach((v) => (v.hidden = v.id !== `view-${view}`));
  $$(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.view === view));
  window.scrollTo({ top: 0 });
  render();
}
function render() {
  checkProgress();
  $("#today-date").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  if (current === "status") renderStatus();
  if (current === "train") renderTrain();
  if (current === "fuel") renderFuel();
  if (current === "records") renderRecords();
}
$$(".tabbar button").forEach((b) => (b.onclick = () => show(b.dataset.view)));
$("#today-link").onclick = () => { selectedDay = todayId(); show("train"); };

/* =========================================================
   STATUS
   ========================================================= */
function renderStatus() {
  const rk = G.rank;
  $("#player").innerHTML = `
    <div class="panel-tag">STATUS</div>
    <div class="p-top">
      <div class="emblem" style="--rk:${rk.c}"><span>${rk.r}</span></div>
      <div>
        <p class="label">${rk.r}-Rank · Player</p>
        <p class="p-name">${esc(state.name || "Player")}</p>
        <p class="p-title ${state.title ? "" : "none"}" id="p-title">${state.title ? `Title: ${esc(state.title)}` : "No title yet — earn achievements"}</p>
      </div>
    </div>
    <div class="lvl-row"><b>LV. ${G.level}</b><span>${num(G.into)} / ${num(G.need)} XP</span></div>
    <div class="xpbar"><i style="width:${(G.into / G.need) * 100}%"></i></div>
    <div class="p-stats">${Object.entries(G.stat).map(([k, v]) => `<div><b>${v}</b><small>${k}</small></div>`).join("")}</div>
    <div class="p-meta"><span>Total XP <b>${num(G.xp)}</b></span><span>Volume <b>${num(G.f.volume)} lb</b></span><span>PRs <b>${G.f.prs}</b></span></div>`;
  $("#p-title").onclick = () => {
    if (!G.unlocked.length) return;
    const names = G.unlocked.map((a) => a.n);
    state.title = names[(names.indexOf(state.title) + 1) % names.length];
    save(); renderStatus(); toast(`Title equipped: ${esc(state.title)}`);
  };

  // daily quest
  const q = questsFor(ymd());
  const allOk = q.every((x) => x.ok);
  $("#quests").innerHTML = `
    <p class="sys-head">[ DAILY QUEST ]</p>
    <p class="sys-sub">Complete every task before midnight · reward <b style="color:var(--accent)">+50 XP</b></p>
    <ul class="q-list">${q.map((x) => `<li class="${x.ok ? "ok" : ""}"><span class="q-box">${x.ok ? "✓" : ""}</span><span class="q-n">${esc(x.n)}</span><span class="q-x">+${x.x}</span></li>`).join("")}</ul>
    ${allOk ? `<p class="q-clear">QUEST CLEARED</p>` : ""}
    <div class="q-foot"><span>Quest streak <b>${streakOf(new Set(Object.keys({ ...state.checks, ...state.cals }).filter((d) => questsFor(d).every((x) => x.ok))))} 🔥</b></span><span>Resets in <b id="q-timer"></b></span></div>`;
  tickQuest();

  // body
  const s = stats();
  $("#stat-lost").innerHTML = s.lost == null ? "—" : `${fmt(Math.max(0, s.lost))}<small>lb</small>`;
  $("#stat-start").textContent = fmt(s.start);
  $("#stat-current").textContent = fmt(s.cur);
  $("#stat-goal").textContent = fmt(state.goal);
  $("#stat-togo").textContent = state.goal != null && s.cur != null ? fmt(Math.max(0, s.cur - state.goal)) : "—";
  $("#stat-pct").textContent = `${Math.round(s.pct)}%`;
  $("#ring-fg").style.strokeDashoffset = 326.7 * (1 - s.pct / 100);
  const wk = $("#stat-week"); wk.textContent = signed(s.week); wk.className = "mid " + (s.week < 0 ? "down" : s.week > 0 ? "up" : "");
  const rt = $("#stat-rate"); rt.textContent = signed(s.rate); rt.className = "mid " + (s.rate < 0 ? "down" : s.rate > 0 ? "up" : "");
  $("#stat-streak").textContent = s.streak ? `${s.streak} 🔥` : "—";
  let proj = "";
  if (state.goal != null && s.cur != null && s.cur > state.goal && s.rate < -0.1) {
    const weeks = (s.cur - state.goal) / -s.rate;
    const eta = new Date(Date.now() + weeks * 7 * DAY_MS);
    proj = `At this pace you hit <b>${fmt(state.goal)}</b> around <b>${eta.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</b>`;
  }
  $("#stat-proj").innerHTML = proj;
  const today = state.weights.find((e) => e.d === ymd());
  if (document.activeElement !== $("#weigh-input")) $("#weigh-input").value = today ? today.w : "";

  const day = DAYS.find((d) => d.id === todayId());
  $("#today-title").innerHTML = day.title;
  $("#today-sub").textContent = day.sub;
  $("#today-progress").textContent = `${progress(day).pct}%`;
  drawChart();
  renderWeekly();
}

function tickQuest() {
  const el = $("#q-timer"); if (!el) return;
  const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
  const s = Math.floor((mid - now) / 1000);
  el.textContent = `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;
}
setInterval(() => { if (current === "status") tickQuest(); }, 1000);

function renderWeekly() {
  const today = ymd();
  const dow = (new Date().getDay() + 6) % 7; // Monday = 0
  const mon = addDays(today, -dow);
  const days = [...Array(7)].map((_, i) => addDays(mon, i));
  let cleared = 0, sets = 0, vol = 0; const kcal = [];
  days.forEach((d) => {
    if (dayInfo(d)?.gym) cleared++;
    if (state.cals[d]?.kcal) kcal.push(state.cals[d].kcal);
  });
  for (const [sl, sessions] of Object.entries(state.lifts)) for (const d of days) {
    const s = sessions[d]; if (!s) continue;
    const n = (s.sets || []).filter((x) => x === 1).length; sets += n; vol += n * (s.w || 0) * (ITEMS[sl] ? repsOf(ITEMS[sl].s) : 10);
  }
  const w = sorted().filter((e) => e.d >= mon && e.d <= today);
  const change = w.length >= 2 ? w.at(-1).w - w[0].w : null;
  const avgK = kcal.length ? kcal.reduce((a, b) => a + b, 0) / kcal.length : null;
  $("#weekly").innerHTML = `
    <div class="panel-tag">THIS WEEK</div>
    <div class="week-grid">
      <div><p class="label">Workouts</p><p class="mid">${cleared}<span class="muted small"> / 7</span></p></div>
      <div><p class="label">Sets</p><p class="mid">${sets}</p></div>
      <div><p class="label">Volume</p><p class="mid">${vol >= 1000 ? (vol / 1000).toFixed(1) + "k" : num(vol)}</p></div>
      <div><p class="label">Weight</p><p class="mid ${change < 0 ? "down" : change > 0 ? "up" : ""}">${change == null ? "—" : signed(change)}</p></div>
      <div><p class="label">Avg kcal</p><p class="mid">${avgK ? num(avgK) : "—"}</p></div>
      <div><p class="label">Quests</p><p class="mid">${days.filter((d) => d <= today && questsFor(d).every((x) => x.ok)).length}</p></div>
    </div>
    <div class="week-days">${days.map((d, i) => `<span class="${dayInfo(d)?.gym ? "done" : ""} ${d === today ? "today" : ""}">${"MTWTFSS"[i]}</span>`).join("")}</div>`;
}

$("#weigh-form").onsubmit = (e) => {
  e.preventDefault();
  const w = parseFloat($("#weigh-input").value);
  if (!w) return;
  const d = ymd();
  const had = state.weights.some((x) => x.d === d);
  state.weights = state.weights.filter((x) => x.d !== d).concat({ d, w });
  if (state.start == null) state.start = w;
  save(); $("#weigh-input").blur(); render(); toast(had ? "Weight updated" : "Weigh-in logged. +15 XP");
};

/* weight chart */
let range = 90, tapIdx = null;
$$("#range-seg button").forEach((b) => (b.onclick = () => {
  $$("#range-seg button").forEach((x) => x.classList.toggle("on", x === b));
  range = +b.dataset.r; tapIdx = null; drawChart();
}));
function setupCanvas(cv) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext("2d"); c.scale(dpr, dpr); c.clearRect(0, 0, W, H);
  return { c, W, H };
}
function drawChart() {
  const cv = $("#chart");
  let data = sorted();
  if (range) { const cut = Date.now() - range * DAY_MS; data = data.filter((e) => parse(e.d).getTime() >= cut); }
  $("#chart-empty").hidden = data.length >= 2;
  const { c, W, H } = setupCanvas(cv);
  if (data.length < 2) return;
  const accent = css("--accent"), line = css("--line"), mid = css("--mid");
  const pad = { l: 40, r: 14, t: 16, b: 26 };
  const vals = data.map((e) => e.w); if (state.goal != null) vals.push(state.goal);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const span = Math.max(hi - lo, 4); lo -= span * 0.12; hi += span * 0.12;
  const t0 = parse(data[0].d).getTime(), t1 = parse(data.at(-1).d).getTime();
  const x = (d) => pad.l + ((parse(d).getTime() - t0) / Math.max(t1 - t0, 1)) * (W - pad.l - pad.r);
  const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
  c.font = "11px Barlow, sans-serif"; c.fillStyle = mid; c.strokeStyle = line; c.lineWidth = 1;
  c.textAlign = "right"; c.textBaseline = "middle";
  for (let i = 0; i <= 3; i++) { const v = lo + ((hi - lo) * i) / 3, yy = y(v); c.beginPath(); c.moveTo(pad.l, yy); c.lineTo(W - pad.r, yy); c.stroke(); c.fillText(Math.round(v), pad.l - 8, yy); }
  c.textAlign = "center"; c.textBaseline = "top";
  c.fillText(md(data[0].d), x(data[0].d) + 14, H - pad.b + 8);
  c.fillText(md(data.at(-1).d), x(data.at(-1).d) - 14, H - pad.b + 8);
  if (state.goal != null) {
    c.setLineDash([5, 5]); c.strokeStyle = css("--gold"); c.beginPath(); c.moveTo(pad.l, y(state.goal)); c.lineTo(W - pad.r, y(state.goal)); c.stroke(); c.setLineDash([]);
    c.fillStyle = css("--gold"); c.textAlign = "right"; c.textBaseline = "bottom"; c.fillText("goal", W - pad.r, y(state.goal) - 3);
  }
  const grad = c.createLinearGradient(0, pad.t, 0, H - pad.b);
  grad.addColorStop(0, accent + "55"); grad.addColorStop(1, accent + "00");
  c.beginPath(); c.moveTo(x(data[0].d), H - pad.b); data.forEach((e) => c.lineTo(x(e.d), y(e.w))); c.lineTo(x(data.at(-1).d), H - pad.b); c.closePath(); c.fillStyle = grad; c.fill();
  c.shadowColor = accent; c.shadowBlur = 10;
  c.beginPath(); data.forEach((e, i) => (i ? c.lineTo : c.moveTo).call(c, x(e.d), y(e.w))); c.strokeStyle = accent; c.lineWidth = 2.5; c.lineJoin = "round"; c.stroke();
  c.shadowBlur = 0;
  const p = data[Math.min(tapIdx ?? data.length - 1, data.length - 1)], px = x(p.d), py = y(p.w);
  c.fillStyle = accent; c.beginPath(); c.arc(px, py, 5, 0, Math.PI * 2); c.fill();
  const txt = `${fmt(p.w)} · ${md(p.d)}`;
  c.font = "600 12px Barlow, sans-serif"; const tw = c.measureText(txt).width + 16;
  const bx = Math.min(Math.max(px - tw / 2, pad.l), W - pad.r - tw), by = Math.max(py - 34, 0);
  c.fillStyle = "#12203B"; c.strokeStyle = accent; c.beginPath(); c.roundRect(bx, by, tw, 24, 6); c.fill(); c.stroke();
  c.fillStyle = "#E6F0FF"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(txt, bx + 8, by + 12);
  cv._x = x; cv._data = data;
}
$("#chart").addEventListener("pointerdown", (e) => {
  const cv = e.currentTarget; if (!cv._data) return;
  const mx = e.clientX - cv.getBoundingClientRect().left;
  let best = 0, bd = Infinity;
  cv._data.forEach((d, i) => { const dd = Math.abs(cv._x(d.d) - mx); if (dd < bd) { bd = dd; best = i; } });
  tapIdx = best; drawChart();
});
window.addEventListener("resize", () => { if (current === "status") drawChart(); if (current === "fuel") drawFuel(); });

/* =========================================================
   TRAIN
   ========================================================= */
let selectedDay = todayId();
const CHECK_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;

function liftHistory(sl, before = ymd()) {
  return Object.entries(state.lifts[sl] || {}).filter(([d]) => d < before).sort(([a], [b]) => b.localeCompare(a));
}
function suggestion(sl, it) {
  const hist = liftHistory(sl);
  if (!hist.length) return { w: null, text: "First time: pick a weight you can do for every rep with clean form." };
  const [d, s] = hist[0];
  const target = setsOf(it.s);
  const hit = (s.sets || []).filter((x) => x === 1).length;
  const best = Math.max(...Object.values(state.lifts[sl]).map((x) => ((x.sets || []).some((v) => v === 1) ? x.w || 0 : 0)));
  const inc = it.inc || 5;
  if (hit >= target && s.w) return { w: s.w + inc, last: s, d, best, text: `Last ${md(d)}: <b>${s.w} lb</b> · all ${target} sets ✓ → <span class="go">try ${s.w + inc} lb</span> if your back feels good` };
  return { w: s.w, last: s, d, best, text: `Last ${md(d)}: <b>${s.w} lb</b> · ${hit}/${target} sets → stay at ${s.w} lb until you hit them all` };
}

function renderTrain() {
  const today = todayId();
  $("#rail").innerHTML = DAYS.map((d) => `<button data-id="${d.id}" class="${d.id === selectedDay ? "on" : ""} ${d.id === today ? "today" : ""}">${esc(d.tab)}</button>`).join("");
  $$("#rail button").forEach((b) => (b.onclick = () => { selectedDay = b.dataset.id; renderTrain(); }));
  $("#rail .on")?.scrollIntoView({ inline: "center", block: "nearest" });

  const day = DAYS.find((d) => d.id === selectedDay);
  const isToday = day.id === today;
  $("#day-kicker").textContent = isToday ? "[ TODAY'S DUNGEON ]" : "PREVIEW";
  $("#day-title").innerHTML = day.title;
  $("#day-sub").textContent = day.sub;

  const done = checksFor(day.id);
  const blocks = blocksFor(day);
  $("#blocks").innerHTML = blocks.map((b) => {
    const n = b.items.filter((_, i) => done.has(`${b.key}.${i}`)).length, all = n === b.items.length;
    return `<details class="panel block" ${all ? "" : "open"}>
      <summary><div><div class="block-t">${esc(b.t)}</div><div class="block-w">${esc(b.w)}</div></div><span class="block-count ${all ? "done" : ""}">${n}/${b.items.length}</span></summary>
      ${b.note ? `<p class="block-note">${esc(b.note)}</p>` : ""}
      <ol class="ex">${b.items.map((it, i) => exRow(b, it, i, done, isToday)).join("")}</ol></details>`;
  }).join("");

  $$("#blocks .fig").forEach((btn) => (btn.onclick = () => openFig(blocks[+btn.dataset.b].items[+btn.dataset.i])));
  $$("#blocks .ex-head input").forEach((cb) => (cb.onchange = () => {
    setCheck(day.id, cb.dataset.k, cb.checked);
    save(); afterTrainChange(day);
    if (navigator.vibrate) navigator.vibrate(8);
  }));
  // lift trackers
  $$("#blocks .lift").forEach((box) => {
    const sl = box.dataset.slug, key = box.dataset.k, it = blocks[3].items[+box.dataset.i];
    const input = box.querySelector("input");
    box.querySelectorAll(".wt button").forEach((b) => (b.onclick = () => {
      const v = Math.max(0, (parseFloat(input.value) || 0) + parseFloat(b.dataset.d));
      input.value = v; saveWeight(sl, v);
    }));
    input.onchange = () => saveWeight(sl, parseFloat(input.value) || 0);
    box.querySelectorAll(".set").forEach((b) => (b.onclick = () => {
      const s = session(sl, parseFloat(input.value) || 0, setsOf(it.s));
      const i = +b.dataset.s;
      s.sets[i] = s.sets[i] === 0 ? 1 : s.sets[i] === 1 ? 2 : 0;
      b.className = `set s${s.sets[i]}`;
      const allDone = s.sets.every((x) => x === 1);
      const wasChecked = done.has(key);
      if (allDone && !wasChecked) { setCheck(day.id, key, true); box.closest("li").querySelector(".ex-head input").checked = true; }
      save();
      if (s.sets[i] === 1) {
        const prev = Math.max(0, ...liftHistory(sl).map(([, x]) => ((x.sets || []).some((v) => v === 1) ? x.w || 0 : 0)));
        if (prev > 0 && s.w > prev && s.sets.filter((x) => x === 1).length === 1) toast(`NEW RECORD — ${esc(it.n)}: ${s.w} lb. +30 XP`, true, 3000);
        if (!s.sets.every((x) => x === 1)) startRest();
        else stopRest();
      }
      afterTrainChange(day);
    }));
  });
  $("#limits").innerHTML = HARD_LIMITS.map((l) => `<li>${esc(l)}</li>`).join("");
  $("#day-bar").style.width = `${progress(day).pct}%`;
}

function exRow(b, it, i, done, isToday) {
  const k = `${b.key}.${i}`;
  let lift = "";
  if (b.lift && it.w) {
    const sl = slug(it.n);
    const sug = suggestion(sl, it);
    if (isToday) {
      const cur = state.lifts[sl]?.[ymd()];
      const w = cur?.w ?? sug.w ?? "";
      const n = setsOf(it.s);
      const sets = [...Array(n)].map((_, j) => `<button type="button" class="set s${cur?.sets?.[j] || 0}" data-s="${j}">${j + 1}</button>`).join("");
      const inc = it.inc || 5;
      lift = `<div class="lift" data-slug="${sl}" data-k="${k}" data-i="${i}">
        <div class="lift-row"><div class="wt"><button type="button" data-d="-${inc}">−</button><input type="number" inputmode="decimal" step="${inc}" value="${w}" placeholder="0"><span>lb</span><button type="button" data-d="${inc}">+</button></div>
        <div class="sets">${sets}</div></div>
        <p class="lift-hint">${sug.text}${sug.best ? ` · <span class="pr">PR ${sug.best} lb</span>` : ""}</p>
        <p class="lift-hint">Tap a set when you hit the reps. Tap twice if you missed reps.</p></div>`;
    } else if (sug.last) {
      lift = `<div class="lift"><p class="lift-hint" style="margin:0">${sug.text}</p></div>`;
    }
  }
  return `<li class="ex-row">
    ${it.fig ? `<button type="button" class="fig" data-b="${b.key}" data-i="${i}" aria-label="Show ${esc(it.n)}">${figureSvg(it.fig)}</button>` : ""}
    <div class="ex-main">
      <label class="ex-head"><input type="checkbox" data-k="${k}" ${done.has(k) ? "checked" : ""} ${isToday ? "" : "disabled"}><span class="check">${CHECK_SVG}</span><span class="ex-n">${esc(it.n)}</span></label>
      <span class="ex-s">${esc(it.s)}</span>
      ${it.note ? `<p class="ex-note">${esc(it.note)}</p>` : ""}
      ${lift}
    </div></li>`;
}

function session(sl, w, n) {
  state.lifts[sl] ||= {};
  const s = state.lifts[sl][ymd()] ||= { w, sets: [] };
  s.w = w;
  while (s.sets.length < n) s.sets.push(0);
  return s;
}
function saveWeight(sl, w) {
  const s = state.lifts[sl]?.[ymd()];
  if (s) { s.w = w; save(); }
}
function afterTrainChange(day) {
  const p = progress(day);
  $("#day-bar").style.width = `${p.pct}%`;
  $$("#blocks .block").forEach((el) => {
    const items = el.querySelectorAll(".ex-head input"), n = [...items].filter((x) => x.checked).length;
    const tag = el.querySelector(".block-count"); tag.textContent = `${n}/${items.length}`; tag.classList.toggle("done", n === items.length);
  });
  const wasGym = afterTrainChange._gym;
  const info = dayInfo(ymd());
  if (info?.gym && !wasGym) toast(`Training cleared. +${info.day.rest ? 25 : 60} XP`, true, 2600);
  afterTrainChange._gym = !!info?.gym;
  checkProgress();
}

function openFig(it) {
  const q = encodeURIComponent(`${it.n} exercise proper form`);
  const sl = slug(it.n);
  const hist = Object.entries(state.lifts[sl] || {}).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6);
  $("#fig-form").innerHTML = `
    <div class="fig-big">${figureSvg(it.fig, true)}</div>
    <h2>${esc(it.n)}</h2>
    <p class="fig-sets">${esc(it.s)}</p>
    ${it.note ? `<p class="muted" style="margin:0">${esc(it.note)}</p>` : ""}
    ${hist.length ? `<ul class="hist">${hist.map(([d, s]) => `<li><span>${md(d)}</span><span><b style="color:var(--ink)">${s.w} lb</b> · ${(s.sets || []).filter((x) => x === 1).length}/${(s.sets || []).length} sets</span></li>`).join("")}</ul>` : ""}
    <a class="btn" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">▶ Watch a video demo</a>
    <button value="close" class="btn primary">Got it</button>`;
  $("#figsheet").showModal();
}

/* rest timer */
let restEnd = 0, restLen = 0, restT = null;
function startRest() {
  restLen = (state.settings.rest || 90) * 1000; restEnd = Date.now() + restLen;
  $("#rest").hidden = false; clearInterval(restT); restT = setInterval(tickRest, 200); tickRest();
}
function stopRest() { clearInterval(restT); $("#rest").hidden = true; }
function tickRest() {
  const left = restEnd - Date.now();
  if (left <= 0) { stopRest(); beep(); toast("Rest complete. Next set.", true, 2000); if (navigator.vibrate) navigator.vibrate([80, 60, 80]); return; }
  const s = Math.ceil(left / 1000);
  $("#rest-t").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  $("#rest-bar").style.width = `${(left / restLen) * 100}%`;
}
$("#rest-add").onclick = () => { restEnd += 15000; restLen += 15000; };
$("#rest-skip").onclick = stopRest;
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.18].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.15);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.16);
    });
  } catch {}
}

/* =========================================================
   FUEL (calories from Lifesum, logged once a day)
   ========================================================= */
let fuelOffset = 0;
const fuelDate = () => addDays(ymd(), fuelOffset);
$$("#fuel-day button").forEach((b) => (b.onclick = () => {
  fuelOffset = +b.dataset.o; $$("#fuel-day button").forEach((x) => x.classList.toggle("on", x === b)); fillFuelForm();
}));
function fillFuelForm() {
  const c = state.cals[fuelDate()];
  $("#fuel-kcal").value = c?.kcal ?? ""; $("#fuel-protein").value = c?.protein ?? "";
}
$("#fuel-form").onsubmit = (e) => {
  e.preventDefault();
  const kcal = parseInt($("#fuel-kcal").value), protein = parseInt($("#fuel-protein").value);
  const d = fuelDate();
  if (!kcal) { delete state.cals[d]; save(); render(); toast("Calorie log cleared", true); return; }
  const had = !!state.cals[d];
  state.cals[d] = { kcal, ...(protein ? { protein } : {}) };
  save(); document.activeElement.blur(); render();
  const t = state.settings.kcal;
  toast(had ? "Calories updated" : `Calories logged. +10 XP${t && kcal <= t ? " · on target +15 XP" : ""}`, true, 2600);
};

function maintenance() {
  // Adaptive estimate: average intake minus the energy from weight change (≈3,500 kcal per lb).
  const end = ymd(), start = addDays(end, -27);
  const logs = Object.entries(state.cals).filter(([d, v]) => d >= start && d <= end && v.kcal);
  const w = sorted().filter((e) => e.d >= start && e.d <= end);
  if (logs.length < 10 || w.length < 4) return { ok: false, logs: logs.length, w: w.length };
  const span = (parse(w.at(-1).d) - parse(w[0].d)) / DAY_MS;
  if (span < 10) return { ok: false, logs: logs.length, w: w.length };
  const xs = w.map((e) => (parse(e.d) - parse(w[0].d)) / DAY_MS), ys = w.map((e) => e.w);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0); // lb/day
  const avg = logs.reduce((s, [, v]) => s + v.kcal, 0) / logs.length;
  const tdee = Math.min(5000, Math.max(1200, avg - slope * 3500));
  return { ok: true, tdee, avg, perWeek: slope * 7, logs: logs.length };
}

function renderFuel() {
  fillFuelForm();
  const t = state.settings.kcal, tp = state.settings.protein;
  const today = state.cals[ymd()];
  const last7 = [...Array(7)].map((_, i) => state.cals[addDays(ymd(), -i)]).filter((x) => x?.kcal);
  const avg = last7.length ? last7.reduce((s, x) => s + x.kcal, 0) / last7.length : null;
  const pr = last7.filter((x) => x.protein);
  const avgP = pr.length ? pr.reduce((s, x) => s + x.protein, 0) / pr.length : null;
  const pctT = t && today ? Math.min(100, (today.kcal / t) * 100) : 0;
  $("#fuel-summary").innerHTML = `
    <div class="panel-tag">TODAY</div>
    <div class="fuel-top"><div class="fuel-num">${today ? num(today.kcal) : "—"}<small> ${t ? `/ ${num(t)} kcal` : "kcal"}</small></div></div>
    ${t ? `<div class="meter"><i class="${today && today.kcal > t ? "over" : ""}" style="width:${pctT}%"></i></div>` : `<p class="muted small">Set your calorie target from Lifesum in Settings to track it here.</p>`}
    <div class="mini-stats">
      <div><p class="label">7-day avg</p><p class="mid">${avg ? num(avg) : "—"}</p></div>
      <div><p class="label">Protein avg</p><p class="mid">${avgP ? `${num(avgP)}g` : "—"}${tp && avgP ? `<span class="muted small"> / ${tp}</span>` : ""}</p></div>
      <div><p class="label">Days logged</p><p class="mid">${last7.length}/7</p></div>
    </div>`;
  $("#fuel-legend").textContent = t ? `target ${num(t)}` : "";
  drawFuel();

  const m = maintenance();
  $("#tdee").innerHTML = m.ok ? `
    <p class="sys-head">[ ANALYSIS ]</p>
    <p class="sys-sub">Your real maintenance, from your logs</p>
    <p style="text-align:center;margin:0"><span class="big" style="font-size:40px">${num(m.tdee)}</span> <span class="muted">kcal/day</span></p>
    <p class="muted small" style="text-align:center;margin:10px 0 0">You've averaged <b style="color:var(--ink)">${num(m.avg)} kcal</b> and your weight is trending <b class="${m.perWeek < 0 ? "down" : "up"}">${signed(m.perWeek)} lb/week</b>.
    About 500 under maintenance (${num(m.tdee - 500)} kcal) is roughly 1 lb a week. This is an estimate — it gets better the more days you log.</p>` : `
    <p class="sys-head">[ ANALYSIS LOCKED ]</p>
    <p class="sys-sub" style="margin-bottom:0">Log calories on 10+ days and weigh in 4+ times over 2 weeks, and the System will calculate your real maintenance calories from your own data. (${m.logs}/10 calorie days · ${m.w}/4 weigh-ins)</p>`;
}

function drawFuel() {
  const cv = $("#fuel-chart");
  const days = [...Array(21)].map((_, i) => addDays(ymd(), i - 20));
  const vals = days.map((d) => state.cals[d]?.kcal || 0);
  $("#fuel-empty").hidden = vals.filter(Boolean).length >= 2;
  const { c, W, H } = setupCanvas(cv);
  if (vals.filter(Boolean).length < 2) return;
  const t = state.settings.kcal;
  const pad = { l: 36, r: 8, t: 10, b: 20 };
  const hi = Math.max(...vals, t || 0) * 1.1;
  const bw = (W - pad.l - pad.r) / days.length;
  const y = (v) => pad.t + (1 - v / hi) * (H - pad.t - pad.b);
  c.font = "10px Barlow, sans-serif"; c.fillStyle = css("--mid"); c.textAlign = "right"; c.textBaseline = "middle";
  [0, 0.5, 1].forEach((f) => c.fillText(Math.round((hi * f) / 100) * 100, pad.l - 6, y(hi * f)));
  days.forEach((d, i) => {
    if (!vals[i]) return;
    const over = t && vals[i] > t;
    c.fillStyle = over ? css("--up") : css("--accent");
    c.beginPath(); c.roundRect(pad.l + i * bw + bw * 0.18, y(vals[i]), bw * 0.64, H - pad.b - y(vals[i]), 3); c.fill();
  });
  if (t) { c.setLineDash([4, 4]); c.strokeStyle = css("--gold"); c.beginPath(); c.moveTo(pad.l, y(t)); c.lineTo(W - pad.r, y(t)); c.stroke(); c.setLineDash([]); }
  c.fillStyle = css("--mid"); c.textAlign = "center"; c.textBaseline = "top";
  [0, 10, 20].forEach((i) => c.fillText(md(days[i]), pad.l + i * bw + bw / 2, H - pad.b + 5));
}

/* =========================================================
   RECORDS
   ========================================================= */
function renderRecords() {
  $("#ach-count").textContent = `${G.unlocked.length}/${ACH.length}`;
  $("#ach-grid").innerHTML = ACH.map((a) => `<div class="ach ${G.unlocked.includes(a) ? "on" : ""}"><i>${a.i}</i><b>${esc(a.n)}</b><small>${esc(a.d)}</small></div>`).join("");
  const prs = Object.values(G.f.prBoard).sort((a, b) => a.n.localeCompare(b.n));
  $("#pr-list").innerHTML = prs.length
    ? prs.map((p) => `<li><div><div class="log-w" style="font-size:15px">${esc(p.n)}</div><div class="log-date">${md(p.d)}</div></div><span class="pr-w">${p.w} lb</span></li>`).join("")
    : `<li><span class="log-date">Log weights in the Train tab and your bests show up here.</span></li>`;
  const w = sorted().reverse();
  $("#log-empty").hidden = w.length > 0;
  $("#log-list").innerHTML = w.map((e, i) => {
    const prev = w[i + 1], diff = prev ? e.w - prev.w : null;
    return `<li><div><div class="log-w">${fmt(e.w)} lb</div><div class="log-date">${parse(e.d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div></div>
      <span class="log-d ${diff < 0 ? "down" : diff > 0 ? "up" : ""}">${diff == null ? "" : signed(diff)}</span>
      <button class="del" data-d="${e.d}" aria-label="Delete">×</button></li>`;
  }).join("");
  $$("#log-list .del").forEach((b) => (b.onclick = () => {
    if (!confirm("Delete this weigh-in?")) return;
    state.weights = state.weights.filter((x) => x.d !== b.dataset.d); save(); render();
  }));
}

/* =========================================================
   SETTINGS
   ========================================================= */
const dlg = $("#settings");
$("#settings-btn").onclick = () => {
  $("#set-name").value = state.name ?? "";
  $("#set-start").value = state.start ?? ""; $("#set-goal").value = state.goal ?? "";
  $("#set-kcal").value = state.settings.kcal ?? ""; $("#set-protein").value = state.settings.protein ?? "";
  $("#set-rest").value = state.settings.rest ?? 90;
  dlg.returnValue = ""; dlg.showModal();
};
dlg.addEventListener("close", () => {
  if (dlg.returnValue !== "save") return;
  const n = (v) => (v === "" ? null : parseFloat(v));
  state.name = $("#set-name").value.trim() || "Neftali";
  state.start = n($("#set-start").value); state.goal = n($("#set-goal").value);
  state.settings.kcal = n($("#set-kcal").value); state.settings.protein = n($("#set-protein").value);
  state.settings.rest = Math.min(600, Math.max(15, parseInt($("#set-rest").value) || 90));
  save(); render(); toast("Settings saved");
});
$("#export-btn").onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = `ascend-backup-${ymd()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
$("#import-file").onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.weights)) throw 0;
    const d = defaults();
    state = { ...d, ...data, settings: { ...d.settings, ...(data.settings || {}) }, seenLevel: null, seenAch: null };
    save(); dlg.close(); show("status"); toast("Backup restored");
  } catch { toast("That file didn't work"); }
};

/* ---------- boot ---------- */
show("status");
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
