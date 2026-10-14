// Shared game engine for ARISE and Bloom.
// Pure calculations: give it the saved state + app config + workout plan, get every number back.
// Nothing here touches the page.

export const DAY_MS = 86400000;
export const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parse = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
export const between = (a, b) => Math.round((parse(b) - parse(a)) / DAY_MS);
export const weekStart = (s) => addDays(s, -((parse(s).getDay() + 6) % 7)); // Monday
export const slug = (n) => n.toLowerCase().replace(/&amp;/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const setsOf = (s = "") => parseInt((s.match(/^(\d+)\s*×/) || [])[1]) || 3;
export const repsOf = (s = "") => parseInt((s.match(/×\s*(\d+)/) || [])[1]) || 10;
const r1 = (n) => Math.round(n * 10) / 10;

/* ---------- XP values ---------- */
export const XP = {
  weighIn: 15, check: 3, gym: 60, restDay: 25, set: 2, pr: 30, cal: 10, calOnTarget: 15,
  runMile: 30, walkMile: 20, together: 1.5, move: 5, mobilityBonus: 25, weekGoal: 100, quest: 50,
};

/* ---------- state ---------- */
export function baseDefaults(cfg) {
  return {
    v: 2, name: cfg.defaultName, title: null, start: null, goal: null,
    weights: [], cals: {}, checks: {}, lifts: {}, cardio: [], mob: {}, moves: null,
    earned: {}, partner: null,
    settings: { kcal: null, protein: null, rest: 90, weeklyMi: cfg.weeklyMi },
    seenLevel: null,
  };
}
export function migrate(raw, cfg, extraDefaults = {}) {
  const d = { ...baseDefaults(cfg), ...extraDefaults };
  const s = { ...d, ...(raw || {}) };
  s.settings = { ...d.settings, ...(raw?.settings || {}) };
  for (const k of ["cals", "checks", "lifts", "mob", "earned"]) s[k] ||= {};
  for (const k of ["weights", "cardio"]) s[k] ||= [];
  for (const k of Object.keys(extraDefaults)) if (extraDefaults[k] && typeof extraDefaults[k] === "object" && !Array.isArray(extraDefaults[k]))
    s[k] = { ...extraDefaults[k], ...(raw?.[k] || {}) };
  if (raw && raw.v !== 2) s.seenLevel = null; // first open after the upgrade: re-count quietly
  delete s.seenAch;
  s.v = 2;
  return s;
}

/* ---------- body ---------- */
export function bodyStats(state) {
  const w = [...state.weights].sort((a, b) => a.d.localeCompare(b.d));
  const start = state.start ?? w[0]?.w ?? null;
  const cur = w.at(-1)?.w ?? null;
  const lost = start != null && cur != null ? start - cur : null;
  let pct = 0;
  if (state.goal != null && start != null && cur != null && start !== state.goal)
    pct = Math.max(0, Math.min(100, ((start - cur) / (start - state.goal)) * 100));
  let week = null, rate = null;
  if (w.length >= 2) {
    const cutoff = parse(w.at(-1).d).getTime() - 7 * DAY_MS;
    const base = [...w].reverse().find((e) => parse(e.d).getTime() <= cutoff) ?? w[0];
    week = cur - base.w;
    const days = (parse(w.at(-1).d) - parse(w[0].d)) / DAY_MS;
    if (days >= 1) rate = ((cur - w[0].w) / days) * 7;
  }
  let eta = null;
  if (state.goal != null && cur != null && cur > state.goal && rate < -0.1) eta = new Date(Date.now() + ((cur - state.goal) / -rate) * 7 * DAY_MS);
  return { w, start, cur, lost, pct, week, rate, eta };
}

export function maintenance(state) {
  // average intake minus energy from the weight trend (~3,500 kcal per lb)
  const end = ymd(), start = addDays(end, -27);
  const logs = Object.entries(state.cals).filter(([d, v]) => d >= start && d <= end && v.kcal);
  const w = [...state.weights].filter((e) => e.d >= start && e.d <= end).sort((a, b) => a.d.localeCompare(b.d));
  const out = { ok: false, logs: logs.length, w: w.length };
  if (logs.length < 10 || w.length < 4) return out;
  const span = (parse(w.at(-1).d) - parse(w[0].d)) / DAY_MS;
  if (span < 10) return out;
  const xs = w.map((e) => (parse(e.d) - parse(w[0].d)) / DAY_MS), ys = w.map((e) => e.w);
  const mx = xs.reduce((a, b) => a + b) / xs.length, my = ys.reduce((a, b) => a + b) / ys.length;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
  const avg = logs.reduce((s, [, v]) => s + v.kcal, 0) / logs.length;
  return { ok: true, tdee: Math.min(5000, Math.max(1200, avg - slope * 3500)), avg, perWeek: slope * 7, logs: logs.length };
}

/* ---------- cardio ---------- */
export const paceOf = (mi, min) => (mi > 0 && min > 0 ? min / mi : null);
export const fmtPace = (p) => (p == null ? "—" : `${Math.floor(p)}:${String(Math.round((p % 1) * 60)).padStart(2, "0")}`.replace(/:60$/, ":59"));
export function cardioXP(c) {
  const base = c.mi * (c.type === "run" ? XP.runMile : XP.walkMile);
  return Math.round(base * (c.together ? XP.together : 1));
}

/* ---------- lifts ---------- */
export function planLiftItems(plan) {
  const out = {};
  plan.DAYS.forEach((d) => (d.items || []).forEach((it) => { if (it.w && !out[slug(it.n)]) out[slug(it.n)] = it; }));
  return out;
}
export function liftStats(state, items) {
  const board = {};
  let sets = 0, lbs = 0, prs = 0;
  const prDates = [];
  for (const [sl, sessions] of Object.entries(state.lifts)) {
    const item = items[sl];
    let best = 0, bestD = null, last = null, count = 0;
    for (const d of Object.keys(sessions).sort()) {
      const s = sessions[d];
      const reps = s.reps || (item ? repsOf(item.s) : 10);
      const done = (s.sets || []).filter((x) => x === 1).length;
      if (!done) continue;
      count++;
      sets += done; lbs += done * (s.w || 0) * reps;
      if (s.w > 0) {
        if (best > 0 && s.w > best) { prs++; prDates.push(d); }
        if (s.w > best) { best = s.w; bestD = d; }
      }
      last = { d, ...s, reps };
    }
    if (count) board[sl] = { sl, n: item?.n || sessions[Object.keys(sessions)[0]]?.n || sl, best, bestD, last, count, fig: item?.fig };
  }
  return { board, sets, lbs, prs, prDates };
}
export function lastSession(state, sl, before = ymd()) {
  const e = Object.entries(state.lifts[sl] || {}).filter(([d]) => d < before).sort(([a], [b]) => b.localeCompare(a));
  return e.length ? { d: e[0][0], ...e[0][1] } : null;
}

/* ---------- sync code (only name, miles, pounds, level, together miles) ---------- */
export function makeCode(cfg, G, state) {
  const p = { a: cfg.id, n: (state.name || "").slice(0, 24), mi: r1(G.miles), lb: Math.round(G.lifts.lbs), lv: G.level, tg: r1(G.togetherMi), t: Date.now() };
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${cfg.codePrefix}-${b64}`;
}
export function readCode(text) {
  const m = String(text).trim().match(/([A-Z]+)-([A-Za-z0-9_-]{10,})/);
  if (!m) throw new Error("No code found");
  const b = m[2].replace(/-/g, "+").replace(/_/g, "/");
  const p = JSON.parse(decodeURIComponent(escape(atob(b + "===".slice((b.length + 3) % 4)))));
  const num = (x) => (Number.isFinite(+x) && +x >= 0 && +x < 1e8 ? +x : 0);
  return { app: String(p.a || m[1]).slice(0, 10), n: String(p.n || "Partner").slice(0, 24), mi: num(p.mi), lb: num(p.lb), lv: num(p.lv), tg: num(p.tg), t: num(p.t) || Date.now() };
}

/* ---------- levels ---------- */
export const needFor = (lv) => 100 + 25 * (lv - 1);
export function levelOf(xp) { let lv = 1, acc = 0; while (xp >= acc + needFor(lv)) { acc += needFor(lv); lv++; } return { level: lv, into: xp - acc, need: needFor(lv) }; }
export const rankOf = (ranks, lv) => [...ranks].reverse().find((x) => lv >= x.min) || ranks[0];

/* =========================================================
   compute() — every number the app shows
   ========================================================= */
export function compute(state, cfg, plan, today = ymd()) {
  const items = planLiftItems(plan);
  const lifts = liftStats(state, items);
  const moves = state.moves || cfg.defaultMoves;
  const moveIds = new Set(moves.map((m) => m.id));

  // training days
  const train = {};
  for (const [d, rec] of Object.entries(state.checks)) {
    const info = plan.recordInfo(rec);
    if (info) train[d] = info;
  }
  // cardio
  const cardioByDay = {};
  let miles = 0, togetherMi = 0, runMi = 0, walkMi = 0, cardioXP_ = 0, bestSession = 0;
  for (const c of state.cardio) {
    miles += c.mi; if (c.together) togetherMi += c.mi;
    c.type === "run" ? (runMi += c.mi) : (walkMi += c.mi);
    cardioXP_ += cardioXP(c);
    bestSession = Math.max(bestSession, c.mi);
    (cardioByDay[c.d] ||= []).push(c);
  }
  // mobility
  const mobDay = {};
  for (const [d, done] of Object.entries(state.mob)) {
    const n = done.filter((id) => moveIds.has(id)).length;
    mobDay[d] = { n, full: n >= moves.length && moves.length > 0 };
  }
  const mobFullDays = Object.values(mobDay).filter((x) => x.full).length;
  const mobMoves = Object.values(state.mob).reduce((s, a) => s + a.length, 0);

  // lifting by day (any completed set counts as activity)
  const liftDay = {};
  for (const sessions of Object.values(state.lifts)) for (const [d, s] of Object.entries(sessions)) if ((s.sets || []).some((x) => x === 1)) liftDay[d] = true;

  // daily quests
  const weighed = new Set(state.weights.map((w) => w.d));
  const questsFor = (d) => {
    const info = train[d];
    const plannedRest = d === today ? plan.isRestToday() : info?.rest;
    return [
      { id: "train", n: plannedRest ? cfg.text.questRest : cfg.text.questTrain, ok: !!info?.cleared, x: plannedRest ? XP.restDay : XP.gym },
      { id: "mob", n: cfg.text.questMobility, ok: !!mobDay[d]?.full, x: XP.mobilityBonus },
      { id: "weigh", n: cfg.text.questWeigh, ok: weighed.has(d), x: XP.weighIn },
      { id: "cal", n: cfg.text.questCalories, ok: !!state.cals[d]?.kcal, x: XP.cal },
    ];
  };
  const allDays = new Set([...Object.keys(train), ...weighed, ...Object.keys(state.cals), ...Object.keys(state.mob), ...Object.keys(cardioByDay)]);
  let questDays = 0;
  for (const d of allDays) if (d <= today && questsFor(d).every((q) => q.ok)) questDays++;

  // daily streak — up to 2 rest days per week (Mon–Sun) keep it alive
  const active = (d) => !!(train[d]?.cleared || cardioByDay[d] || mobDay[d]?.full || liftDay[d]);
  const activeDays = [...allDays, ...Object.keys(liftDay)].filter(active).sort();
  let run = 0, best = 0, restUsed = {}, chainStart = null;
  const streakDays = {}; // d -> "on" | "rest"
  if (activeDays.length) {
    for (let d = activeDays[0]; d < today; d = addDays(d, 1)) {
      const wk = weekStart(d);
      if (active(d)) { if (!run) chainStart = d; run++; streakDays[d] = "on"; }
      else if (run && (restUsed[wk] || 0) < 2) { restUsed[wk] = (restUsed[wk] || 0) + 1; run++; streakDays[d] = "rest"; }
      else { run = 0; restUsed = {}; }
      best = Math.max(best, run);
    }
    if (active(today)) { if (!run) chainStart = today; run++; streakDays[today] = "on"; }
    best = Math.max(best, run);
  }
  const thisWeek = weekStart(today);
  const streak = { cur: run, best, restLeft: Math.max(0, 2 - (run ? restUsed[thisWeek] || 0 : 0)), todayDone: active(today), days: streakDays };

  // weekly miles
  const goalMi = state.settings.weeklyMi || cfg.weeklyMi;
  const weekMi = {};
  for (const c of state.cardio) { const w = weekStart(c.d); weekMi[w] = (weekMi[w] || 0) + c.mi; }
  const weeksHit = Object.entries(weekMi).filter(([w, m]) => m >= goalMi - 1e-9 && w <= thisWeek).map(([w]) => w).sort();
  let weekStreak = 0;
  { let w = weekMi[thisWeek] >= goalMi ? thisWeek : addDays(thisWeek, -7);
    while ((weekMi[w] || 0) >= goalMi) { weekStreak++; w = addDays(w, -7); } }

  // calories
  const calLogs = Object.values(state.cals).filter((c) => c.kcal);
  const calOnTarget = state.settings.kcal ? calLogs.filter((c) => c.kcal <= state.settings.kcal).length : 0;

  // training totals
  let checks = 0, gymDays = 0, restDays = 0;
  for (const t of Object.values(train)) { checks += t.count; if (t.cleared) t.rest ? restDays++ : gymDays++; }

  const body = bodyStats(state);
  const partner = state.partner;
  const metrics = {
    bestSession, miles, togetherMi, lbs: lifts.lbs, weightPct: state.goal != null && body.start != null && body.start > state.goal ? body.pct : 0,
    mobFullDays, bestStreak: best, duoMi: miles + (partner?.mi || 0), duoLb: lifts.lbs + (partner?.lb || 0),
    gymDays, prs: lifts.prs, weeksHit: weeksHit.length, weekStreak, questDays, calLogs: calLogs.length, lost: Math.max(0, body.lost || 0),
    hasPartner: partner ? 1 : 0,
  };

  // permanent rewards
  const bossXP = cfg.bosses.filter((b) => state.earned[b.id]).reduce((s, b) => s + b.xp, 0);

  // optional app extension (ARISE life modules): extra metrics + XP
  const life = cfg.extend ? cfg.extend(state, today, { train, cardioByDay, liftDay, mobDay, plan }) : null;
  if (life) Object.assign(metrics, life.metrics || {});

  const xp = Math.round((life?.xp || 0) +
    state.weights.length * XP.weighIn + checks * XP.check + gymDays * XP.gym + restDays * XP.restDay +
    lifts.sets * XP.set + lifts.prs * XP.pr + calLogs.length * XP.cal + calOnTarget * XP.calOnTarget +
    cardioXP_ + mobMoves * XP.move + mobFullDays * XP.mobilityBonus + weeksHit.length * XP.weekGoal + questDays * XP.quest + bossXP);
  const L = levelOf(xp);
  metrics.level = L.level;

  const bosses = cfg.bosses.map((b) => {
    const cur = metrics[b.metric] || 0;
    return { ...b, cur, pct: Math.min(100, (cur / b.target) * 100), earned: state.earned[b.id] || null, ready: cur >= b.target };
  });

  return {
    xp, ...L, rank: rankOf(cfg.ranks, L.level), metrics, bosses,
    lifts, items, train, cardioByDay, miles, togetherMi, runMi, walkMi, cardioXP: cardioXP_,
    mobDay, moves, mobFullDays, streak, goalMi, weekMi, thisWeek, weeksHit, weekStreak,
    questsFor, questDays, body, checks, gymDays, restDays, calLogs: calLogs.length, life, liftDay,
  };
}

// Lock in anything newly earned. Earned bosses and loot are never taken away.
export function claim(state, cfg, G, today = ymd()) {
  const newBosses = [], newLoot = [];
  for (const b of G.bosses) if (b.ready && !state.earned[b.id]) { state.earned[b.id] = today; newBosses.push(b); }
  const m = { ...G.metrics, earned: state.earned };
  for (const l of cfg.loot) if (!state.earned[l.id] && l.when(m)) { state.earned[l.id] = today; newLoot.push(l); }
  return { newBosses, newLoot };
}
