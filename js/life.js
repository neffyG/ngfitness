// ARISE life modules — Faith, Books, 75 Hard, Habits.
// lifeCompute() is plugged into the shared engine (cfg.extend) so these feed XP, levels, gates and loot.
import { ymd, addDays, between, weekStart, parse } from "./engine.js";
import { BOOK, GOSPELS, TOTAL_CH, planOrder, BOOKS } from "./bible.js";

export const LXP = {
  chapter: 10, soap: 10, prayerDay: 15, prayerMinCap: 15, grat: 5, church: 25, answered: 20, verse: 25,
  page: 0.5, bookDone: 100, review: 15, rating: 5, quote: 3,
  habit: 5, habitsAll: 10,
  hardTask: 4, hardPerfect: 40, penaltyPaid: 15,
};

/* ---------- defaults ---------- */
export const HARD_TASKS = [
  { id: "w1", n: "Workout 1 · 45 min", icon: "🏋️", sub: "Clears itself when you finish today's training" },
  { id: "w2", n: "Workout 2 · 45 min, outdoors", icon: "🌤️", sub: "Clears itself when you log 45+ min of walking or running" },
  { id: "diet", n: "Follow your diet", icon: "🥗", sub: "Your plan, your calories — no exceptions" },
  { id: "clean", n: "No alcohol, no cheat meals", icon: "🚫", sub: "" },
  { id: "water", n: "Drink a gallon of water", icon: "💧", sub: "" },
  { id: "read", n: "Read 10 pages of nonfiction", icon: "📖", sub: "Nonfiction books count, and so can your Bible chapters" },
  { id: "photo", n: "Take a progress photo", icon: "📸", sub: "Stays on this phone only" },
];
// Penalty quests: missing a task never restarts the challenge — it puts you in debt.
// Push-ups and walks only; nothing that breaks your back's hard limits.
export const DEFAULT_PENALTIES = {
  w1: { n: 100, what: "push-ups", plus: "and a 3-minute wall sit" },
  w2: { n: 100, what: "push-ups", plus: "and a 2-mile walk outside" },
  diet: { n: 50, what: "push-ups", plus: "and a 1-mile walk" },
  clean: { n: 100, what: "push-ups", plus: "and a 2-mile walk" },
  water: { n: 50, what: "push-ups", plus: "and a 5-minute cold shower" },
  read: { n: 25, what: "push-ups", plus: "and 20 pages instead of 10 the next day" },
  photo: { n: 25, what: "push-ups", plus: "and take the photo first thing" },
};
export const DEFAULT_HABITS = [
  { id: "h-pray", n: "Pray", icon: "🙏", link: "prayer" },
  { id: "h-word", n: "Read a chapter of the Bible", icon: "📖", link: "bible" },
  { id: "h-grat", n: "Write 3 things I'm thankful for", icon: "✨", link: "grat" },
  { id: "h-pages", n: "Read 10 pages", icon: "📚", link: "pages" },
];
export const LINKS = { prayer: "Logs itself when you pray in Faith", bible: "Logs itself when you read today's chapter", grat: "Logs itself from Faith › gratitude", pages: "Logs itself from your reading sessions", water: "Logs itself from your 75 Hard water", train: "Logs itself when you clear today's training" };

export const LIFE_DEFAULTS = {
  faith: { tr: "NIV", app: "bg", plan: "path", goal: 1, pass: 1, reads: [], prayer: {}, requests: [], grat: {}, church: {}, mem: [], es: null },
  books: { list: [], goals: {}, timer: null },
  hard: { rounds: [], log: {}, paid: {}, ack: [], pen: null, bibleCounts: true, oz: 128, pageCh: 3 },
  habits: { list: null, log: {} },
  life: { reportSeen: null },
};

export const penaltyFor = (state, task) => ({ ...DEFAULT_PENALTIES[task], ...(state.hard.pen?.[task] || {}) });
export const habitList = (state) => state.habits.list || DEFAULT_HABITS;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export { uid };

/* ---------- helpers ---------- */
function streakBack(isDone, today, maxBack = 800) {
  // consecutive days ending today (or yesterday, if today isn't done yet)
  let d = isDone(today) ? today : addDays(today, -1), n = 0;
  while (n < maxBack && isDone(d)) { n++; d = addDays(d, -1); }
  return n;
}
function bestRun(days, isDone) {
  if (!days.length) return 0;
  const first = days.sort()[0], last = ymd();
  let run = 0, best = 0;
  for (let d = first, i = 0; d <= last && i < 3000; d = addDays(d, 1), i++) { if (isDone(d)) { run++; best = Math.max(best, run); } else run = 0; }
  return best;
}

/* =========================================================
   lifeCompute — called by the engine on every render
   ========================================================= */
export function lifeCompute(state, today = ymd(), ext = {}) {
  const F = state.faith, B = state.books, H = state.hard;
  const train = ext.train || {}, cardioByDay = ext.cardioByDay || {};
  let xp = 0;

  /* ---------- faith ---------- */
  const reads = F.reads || [];
  const uniq = new Set(reads.map((r) => r.k));
  const passSet = new Set(reads.filter((r) => (r.p || 1) === F.pass).map((r) => r.k));
  const order = planOrder(F.plan);
  const next = order.find((k) => !passSet.has(k)) || null;
  const chByDay = {};
  reads.forEach((r) => (chByDay[r.d] = (chByDay[r.d] || 0) + 1));
  const goal = Math.max(1, F.goal || 1);
  const wordDone = (d) => (chByDay[d] || 0) >= goal;
  const prayed = (d) => !!F.prayer[d];
  const thankful = (d) => (F.grat[d] || []).some((x) => x && x.trim());
  const soap = reads.filter((r) => r.n && Object.values(r.n).some((x) => x && String(x).trim())).length;
  const prayerDays = Object.keys(F.prayer).length;
  const prayerMin = Object.values(F.prayer).reduce((s, p) => s + (p.min || 0), 0);
  const answered = F.requests.filter((r) => r.ans).length;
  const memMastered = F.mem.filter((m) => (m.box || 0) >= 5).length;
  const gratDays = Object.keys(F.grat).filter(thankful).length;
  const churchDays = Object.keys(F.church).length;
  const bookCh = {};
  uniq.forEach((k) => { const id = k.split(".")[0]; bookCh[id] = (bookCh[id] || 0) + 1; });
  const booksDone = BOOKS.filter((b) => (bookCh[b.id] || 0) >= b.ch).length;
  const sumCh = (pred) => Object.entries(bookCh).filter(([id]) => pred(id)).reduce((s, [, n]) => s + n, 0);
  const faith = {
    next, passDone: !next, passCount: passSet.size, uniq, bookCh, chByDay, chToday: chByDay[today] || 0, goal,
    wordStreak: streakBack(wordDone, today), bestWord: bestRun(Object.keys(chByDay), wordDone),
    prayerStreak: streakBack(prayed, today), bestPrayer: bestRun(Object.keys(F.prayer), prayed),
    prayedToday: prayed(today), prayerDays, prayerMin, answered, memMastered, gratDays, churchDays, soap, booksDone,
    totalCh: uniq.size, pct: (uniq.size / TOTAL_CH) * 100,
    gospelCh: sumCh((id) => GOSPELS.includes(id)), psalmCh: bookCh.PSA || 0, ntCh: sumCh((id) => BOOK[id].nt), otCh: sumCh((id) => !BOOK[id].nt),
    thankfulToday: thankful(today), wordDone, prayed, thankful,
  };
  xp += reads.length * LXP.chapter + soap * LXP.soap + gratDays * LXP.grat + churchDays * LXP.church + answered * LXP.answered + memMastered * LXP.verse;
  xp += Object.values(F.prayer).reduce((s, p) => s + LXP.prayerDay + Math.min(LXP.prayerMinCap, Math.floor((p.min || 0) / 2)), 0);

  /* ---------- books ---------- */
  const pagesByDay = {}, nonficByDay = {}, minByDay = {};
  let pages = 0, minutes = 0, finishes = 0, longest = 0, reviews = 0, ratings = 0, quotes = 0;
  const yearBooks = {}, monthPages = {};
  for (const b of B.list) {
    for (const s of b.sessions || []) {
      const p = Math.max(0, (s.to || 0) - (s.from || 0));
      pages += p; minutes += s.min || 0;
      pagesByDay[s.d] = (pagesByDay[s.d] || 0) + p;
      if (s.min) minByDay[s.d] = (minByDay[s.d] || 0) + s.min;
      if (b.nonfic) nonficByDay[s.d] = (nonficByDay[s.d] || 0) + p;
      const mo = s.d.slice(0, 7); monthPages[mo] = (monthPages[mo] || 0) + p;
    }
    const fin = b.reads || [];
    if (fin.length && !(b.sessions || []).length && b.pages) { // imported finished books with no sessions
      pages += b.pages; const mo = fin[0].slice(0, 7); monthPages[mo] = (monthPages[mo] || 0) + b.pages;
    }
    finishes += fin.length;
    fin.forEach((d) => { const y = d.slice(0, 4); yearBooks[y] = (yearBooks[y] || 0) + 1; });
    if (fin.length) longest = Math.max(longest, b.pages || 0);
    if (b.review && b.review.trim()) reviews++;
    if (b.rating) ratings++;
    quotes += (b.quotes || []).length;
  }
  const readDay = (d) => (pagesByDay[d] || 0) > 0 || (minByDay[d] || 0) > 0;
  const books = {
    pages, minutes, finishes, longest, reviews, ratings, quotes, yearBooks, monthPages, pagesByDay, nonficByDay,
    bestYear: Math.max(0, ...Object.values(yearBooks)),
    readStreak: streakBack(readDay, today), bestRead: bestRun(Object.keys(pagesByDay), readDay),
    reading: B.list.filter((b) => b.shelf === "reading"), pagesToday: pagesByDay[today] || 0,
    pph: minutes > 0 ? (B.list.reduce((s, b) => s + (b.sessions || []).filter((x) => x.min).reduce((a, x) => a + Math.max(0, x.to - x.from), 0), 0) / minutes) * 60 : null,
  };
  xp += Math.round(pages * LXP.page) + finishes * LXP.bookDone + reviews * LXP.review + ratings * LXP.rating + quotes * LXP.quote;

  /* ---------- 75 Hard ---------- */
  const cardioMin = (d) => (cardioByDay[d] || []).reduce((s, c) => s + (c.min || 0), 0);
  const hardPages = (d) => (nonficByDay[d] || 0) + (H.log[d]?.pages || 0) + (H.bibleCounts ? (chByDay[d] || 0) * (H.pageCh || 3) : 0);
  const taskState = (d) => {
    const L = H.log[d] || {};
    const auto = { w1: !!(train[d]?.cleared && !train[d]?.rest), w2: cardioMin(d) >= 45, read: hardPages(d) >= 10, water: (L.water || 0) >= (H.oz || 128) };
    const out = {};
    for (const t of HARD_TASKS) out[t.id] = { ok: !!(L[t.id] === true || auto[t.id]), auto: !!auto[t.id], manual: L[t.id] === true };
    return out;
  };
  const roundInfo = (r) => {
    const end = addDays(r.start, 74), last = r.done && r.done < end ? r.done : end;
    const days = [];
    for (let d = r.start; d <= last && d <= today; d = addDays(d, 1)) days.push(d);
    let perfect = 0, cleared = 0;
    const pens = [];
    for (const d of days) {
      const ts = taskState(d), miss = HARD_TASKS.filter((t) => !ts[t.id].ok).map((t) => t.id);
      if (!miss.length) { perfect++; cleared++; continue; }
      if (d >= today) continue; // today is still in play
      let allPaid = true;
      for (const task of miss) {
        const key = `${d}:${task}`, due = addDays(d, 1), paid = H.paid[key] || null;
        const late = paid ? paid > due : today > due;
        if (!paid) allPaid = false;
        pens.push({ key, d, task, due, paid, late });
      }
      if (allPaid) cleared++;
    }
    const dayN = Math.min(75, between(r.start, today) + 1);
    return { ...r, end, days, perfect, cleared, pens, dayN, over: !!r.done || today > end };
  };
  const rounds = (H.rounds || []).map(roundInfo);
  const cur = rounds.find((r) => !r.done) || null;
  let paidCount = 0, taskXP = 0;
  for (const r of rounds) {
    paidCount += r.pens.filter((p) => p.paid).length;
    for (const d of r.days) { const ts = taskState(d), n = HARD_TASKS.filter((t) => ts[t.id].ok).length; taskXP += n * LXP.hardTask + (n === HARD_TASKS.length ? LXP.hardPerfect : 0); }
  }
  const hard = {
    rounds, cur, taskState, hardPages, cardioMin,
    debt: cur ? cur.pens.filter((p) => !p.paid) : [],
    today: cur && !cur.over ? taskState(today) : null,
    bestCleared: Math.max(0, ...rounds.map((r) => r.cleared)), bestPerfect: Math.max(0, ...rounds.map((r) => r.perfect)), paidCount,
  };
  xp += taskXP + paidCount * LXP.penaltyPaid;

  /* ---------- habits ---------- */
  const list = habitList(state);
  const hval = (h, d) => {
    if (h.link === "prayer") return prayed(d) ? 1 : 0;
    if (h.link === "bible") return wordDone(d) ? 1 : 0;
    if (h.link === "grat") return thankful(d) ? 1 : 0;
    if (h.link === "pages") return pagesByDay[d] || 0;
    if (h.link === "water") return H.log[d]?.water || 0;
    if (h.link === "train") return train[d]?.cleared ? 1 : 0;
    return state.habits.log[d]?.[h.id] || 0;
  };
  const target = (h) => (h.link === "pages" ? 10 : h.link === "water" ? H.oz || 128 : h.kind === "count" ? h.target || 1 : 1);
  const hdone = (h, d) => hval(h, d) >= target(h);
  const sched = (h, d) => !h.days || !h.days.length || h.days.includes(parse(d).getDay());
  const hStreak = (h) => { let d = hdone(h, today) || !sched(h, today) ? today : addDays(today, -1), n = 0, guard = 0;
    while (guard++ < 800) { if (!sched(h, d)) { d = addDays(d, -1); continue; } if (!hdone(h, d)) break; n++; d = addDays(d, -1); } return n; };
  const firstDay = Object.keys(state.habits.log).sort()[0] || today;
  let habitXP = 0, bestHabit = 0;
  const habitStats = list.map((h) => {
    let run = 0, best = 0, last30 = 0, sch30 = 0, seen = !h.link;
    const start = addDays(today, -400) > firstDay ? addDays(today, -400) : firstDay;
    for (let d = h.link ? addDays(today, -400) : start, i = 0; d <= today && i < 401; d = addDays(d, 1), i++) {
      if (!sched(h, d)) continue;
      const ok = hdone(h, d);
      if (ok) { run++; best = Math.max(best, run); if (!h.link) habitXP += LXP.habit; } else if (d < today) run = 0;
      if (ok) seen = true;
      if (seen && between(d, today) < 30) { sch30++; if (ok) last30++; }
    }
    bestHabit = Math.max(bestHabit, best);
    return { h, cur: hStreak(h), best, rate: sch30 ? last30 / sch30 : 0, todayDone: hdone(h, today), todayVal: hval(h, today), target: target(h), sched: sched(h, today) };
  });
  const allHabitsDay = (d) => { const s = list.filter((h) => sched(h, d)); return s.length > 0 && s.every((h) => hdone(h, d)); };
  let fullHabitDays = 0;
  for (let d = addDays(today, -400); d <= today; d = addDays(d, 1)) if (d >= firstDay || list.some((h) => h.link)) if (allHabitsDay(d)) fullHabitDays++;
  habitXP += fullHabitDays * LXP.habitsAll;
  xp += habitXP;
  const habits = { list, stats: habitStats, hval, hdone, sched, target, allHabitsDay, bestHabit, fullHabitDays };

  const metrics = {
    bibleCh: uniq.size, gospelCh: faith.gospelCh, psalmCh: faith.psalmCh, ntCh: faith.ntCh, bestWord: faith.bestWord, prayerDays, answered, memMastered, gratDays,
    booksRead: finishes, longestRead: longest, bestYearBooks: books.bestYear, pagesRead: pages, bestReadStreak: books.bestRead,
    hardCleared: hard.bestCleared, hardPerfect: hard.bestPerfect, penaltiesPaid: paidCount, hardStarted: rounds.length ? 1 : 0,
    bestHabit, fullHabitDays, chapters: reads.length, soap,
  };
  return { xp, metrics, faith, books, hard, habits };
}

/* ---------- weekly report ---------- */
export function weekSummary(state, G, ws) {
  const days = [...Array(7)].map((_, i) => addDays(ws, i));
  const inW = (d) => d >= ws && d <= days[6];
  const L = G.life;
  const gym = days.filter((d) => G.train[d]?.cleared && !G.train[d].rest).length;
  const mi = G.weekMi[ws] || 0;
  let sets = 0, lbs = 0;
  for (const sessions of Object.values(state.lifts)) for (const [d, s] of Object.entries(sessions)) if (inW(d)) { const n = (s.sets || []).filter((x) => x === 1).length; sets += n; lbs += n * (s.w || 0) * (s.reps || 10); }
  const ws_ = state.weights.filter((w) => inW(w.d)).sort((a, b) => a.d.localeCompare(b.d));
  const before = [...state.weights].filter((w) => w.d < ws).sort((a, b) => b.d.localeCompare(a.d))[0];
  const wChange = ws_.length && (before || ws_.length > 1) ? ws_.at(-1).w - (before ? before.w : ws_[0].w) : null;
  const cals = days.map((d) => state.cals[d]?.kcal).filter(Boolean);
  const ch = days.reduce((s, d) => s + (L.faith.chByDay[d] || 0), 0);
  const wordDays = days.filter(L.faith.wordDone).length, prayDays = days.filter(L.faith.prayed).length;
  const prayMin = days.reduce((s, d) => s + (state.faith.prayer[d]?.min || 0), 0);
  const gratDays = days.filter(L.faith.thankful).length;
  const pages = days.reduce((s, d) => s + (L.books.pagesByDay[d] || 0), 0);
  const readDays = days.filter((d) => (L.books.pagesByDay[d] || 0) > 0).length;
  const finished = state.books.list.flatMap((b) => (b.reads || []).filter(inW).map(() => b.t));
  const H = L.hard, r = H.cur || H.rounds.at(-1);
  const hDays = r ? r.days.filter(inW) : [];
  const hardPerfect = hDays.filter((d) => { const ts = H.taskState(d); return Object.values(ts).every((x) => x.ok); }).length;
  const pensMade = r ? r.pens.filter((p) => inW(p.d)).length : 0, pensPaid = r ? r.pens.filter((p) => p.paid && inW(p.paid)).length : 0;
  const hs = L.habits;
  let hSched = 0, hDone = 0;
  for (const d of days) for (const h of hs.list) if (hs.sched(h, d) && d <= ymd()) { hSched++; if (hs.hdone(h, d)) hDone++; }
  const elapsed = Math.max(1, Math.min(7, between(ws, ymd()) + 1));
  const parts = [
    { k: "Training", s: Math.min(1, gym / Math.min(5, Math.ceil(elapsed * 5 / 7))) },
    { k: "The road", s: Math.min(1, mi / ((G.goalMi * elapsed) / 7)) },
    { k: "The Word", s: wordDays / elapsed },
    { k: "Prayer", s: prayDays / elapsed },
    { k: "Reading", s: Math.min(1, readDays / Math.max(1, Math.ceil(elapsed * 5 / 7))) },
    { k: "Habits", s: hSched ? hDone / hSched : 0 },
    { k: "Weigh-ins", s: Math.min(1, ws_.length / Math.max(1, Math.ceil(elapsed * 3 / 7))) },
  ];
  if (hDays.length) parts.push({ k: "75 Hard", s: hardPerfect / hDays.length });
  const score = parts.reduce((s, p) => s + p.s, 0) / parts.length;
  const grade = score >= 0.9 ? "S" : score >= 0.8 ? "A" : score >= 0.65 ? "B" : score >= 0.5 ? "C" : score >= 0.35 ? "D" : "E";
  const sorted = [...parts].sort((a, b) => b.s - a.s);
  return { ws, days, gym, mi, sets, lbs, wChange, weighIns: ws_.length, avgCal: cals.length ? cals.reduce((a, b) => a + b, 0) / cals.length : null, calDays: cals.length,
    ch, wordDays, prayDays, prayMin, gratDays, pages, readDays, finished, hardPerfect, hardDays: hDays.length, pensMade, pensPaid,
    habitRate: hSched ? hDone / hSched : null, parts, score, grade, best: sorted[0], worst: sorted.at(-1) };
}

/* ---------- gates + loot for the life modules ---------- */
export const LIFE_BOSSES = [
  { group: "Faith", id: "wilderness", name: "The Wilderness Trial", icon: "🏜️", desc: "Read the Word 40 days in a row — like Jesus' 40 days in the wilderness.", metric: "bestWord", target: 40, unit: "days", xp: 500 },
  { group: "Faith", id: "gospel-gate", name: "Gate of the Gospels", icon: "✝️", desc: "Read all four Gospels — Matthew, Mark, Luke and John (89 chapters).", metric: "gospelCh", target: 89, unit: "ch", xp: 400 },
  { group: "Faith", id: "psalmist", name: "The Psalmist's Harp", icon: "🎶", desc: "Read all 150 Psalms.", metric: "psalmCh", target: 150, unit: "ch", xp: 500 },
  { group: "Faith", id: "covenant", name: "The Covenant Gate", icon: "📜", desc: "Read the whole New Testament (260 chapters).", metric: "ntCh", target: 260, unit: "ch", xp: 800 },
  { group: "Faith", id: "whole-counsel", name: "The Whole Counsel", icon: "🌅", desc: "Read the entire Bible — all 1,189 chapters.", metric: "bibleCh", target: 1189, unit: "ch", xp: 3000 },
  { group: "Faith", id: "prayer-warrior", name: "The Prayer Warrior", icon: "🙏", desc: "Pray on 100 different days.", metric: "prayerDays", target: 100, unit: "days", xp: 500 },
  { group: "Faith", id: "answered", name: "Witness of Answers", icon: "🕊️", desc: "Log 10 answered prayers.", metric: "answered", target: 10, unit: "prayers", xp: 300 },
  { group: "Faith", id: "hidden-word", name: "Hidden in My Heart", icon: "💛", desc: "Memorize 12 verses (Psalm 119:11).", metric: "memMastered", target: 12, unit: "verses", xp: 400 },
  { group: "Faith", id: "thankful", name: "The Thankful Heart", icon: "✨", desc: "Write down what you're thankful for on 30 days.", metric: "gratDays", target: 30, unit: "days", xp: 250 },
  { group: "Library", id: "paper-golem", name: "The Paper Golem", icon: "📚", desc: "Finish 5 books.", metric: "booksRead", target: 5, unit: "books", xp: 300 },
  { group: "Library", id: "tome-wyrm", name: "The Tome Wyrm", icon: "🐲", desc: "Finish a book with 500+ pages.", metric: "longestRead", target: 500, unit: "pages", xp: 300 },
  { group: "Library", id: "archivist", name: "The Archivist", icon: "🗄️", desc: "Finish 12 books in one year.", metric: "bestYearBooks", target: 12, unit: "books", xp: 500 },
  { group: "Library", id: "ten-thousand", name: "Ten Thousand Pages", icon: "📜", desc: "Read 10,000 pages in total.", metric: "pagesRead", target: 10000, unit: "pages", xp: 800 },
  { group: "Library", id: "lamplight-owl", name: "The Lamplight Owl", icon: "🦉", desc: "Read 30 days in a row.", metric: "bestReadStreak", target: 30, unit: "days", xp: 400 },
  { group: "75 Hard", id: "first-week", name: "Warden of the First Week", icon: "🛡️", desc: "Clear 7 days of 75 Hard — perfect, or every penalty paid.", metric: "hardCleared", target: 7, unit: "days", xp: 200 },
  { group: "75 Hard", id: "halfway-lich", name: "The Halfway Lich", icon: "💀", desc: "Clear 38 days of a 75 Hard round.", metric: "hardCleared", target: 38, unit: "days", xp: 500 },
  { group: "75 Hard", id: "gate-75", name: "The 75th Gate", icon: "🔥", desc: "Clear all 75 days of a round.", metric: "hardCleared", target: 75, unit: "days", xp: 1500 },
  { group: "75 Hard", id: "unbroken", name: "The Unbroken", icon: "⚡", desc: "30 perfect days in one round — no penalties.", metric: "hardPerfect", target: 30, unit: "days", xp: 800 },
  { group: "75 Hard", id: "penance", name: "The Penance Knight", icon: "⛓️", desc: "Pay off 10 penalty quests.", metric: "penaltiesPaid", target: 10, unit: "paid", xp: 200 },
  { group: "Discipline", id: "habit-hydra", name: "The Habit Hydra", icon: "🐍", desc: "Hold any habit for 30 days straight.", metric: "bestHabit", target: 30, unit: "days", xp: 400 },
  { group: "Discipline", id: "full-moon", name: "Keeper of the Full Moon", icon: "🌕", desc: "Finish every habit on 30 days.", metric: "fullHabitDays", target: 30, unit: "days", xp: 400 },
];
const bossLoot = (boss, id, name, icon, title) => ({ id, name, icon, title, how: `Beat ${LIFE_BOSSES.find((b) => b.id === boss).name}`, boss, when: (m) => !!m.earned[boss] });
export const LIFE_LOOT = [
  { id: "l-lamp-word", name: "Lamp unto My Feet", icon: "🪔", title: "Seeker", how: "Read your first chapter", when: (m) => m.chapters >= 1 },
  { id: "l-scroll", name: "Field Journal", icon: "🖋️", title: "Scribe", how: "Write 10 SOAP journal entries", when: (m) => m.soap >= 10 },
  { id: "l-bookmark", name: "Ribbon Bookmark", icon: "🔖", title: "Bookworm", how: "Finish your first book", when: (m) => m.booksRead >= 1 },
  { id: "l-hard-day1", name: "Iron Oath", icon: "🗝️", title: "Oathsworn", how: "Start a 75 Hard round", when: (m) => m.hardStarted >= 1 },
  bossLoot("wilderness", "l-wild", "Wilderness Cloak", "🧣", "Wilderness-Tested"),
  bossLoot("gospel-gate", "l-gospel", "Fisherman's Net", "🎣", "Gospel Bearer"),
  bossLoot("psalmist", "l-harp", "Shepherd's Harp", "🪕", "Psalmist"),
  bossLoot("covenant", "l-covenant", "Covenant Seal", "📯", "Covenant Keeper"),
  bossLoot("whole-counsel", "l-dawn", "Dawnlight Crown", "🌄", "Man of the Word"),
  bossLoot("prayer-warrior", "l-prayer", "Prayer Shawl", "🧶", "Prayer Warrior"),
  bossLoot("answered", "l-dove", "Dove Feather", "🪶", "Witness"),
  bossLoot("hidden-word", "l-heartstone", "Heartstone", "💛", "Hidden Word"),
  bossLoot("thankful", "l-jar", "Jar of Thanks", "🫙", "Thankful Heart"),
  bossLoot("paper-golem", "l-quill", "Golem Quill", "🪶", "Lorekeeper"),
  bossLoot("tome-wyrm", "l-wyrm", "Wyrmscale Bookmark", "🐉", "Wyrm Reader"),
  bossLoot("archivist", "l-archive", "Archive Key", "🔑", "Archivist"),
  bossLoot("ten-thousand", "l-page", "Page Monarch's Seal", "📖", "Page Monarch"),
  bossLoot("lamplight-owl", "l-owl", "Owl Lamp", "🦉", "Night Owl"),
  bossLoot("first-week", "l-shield", "Warden's Shield", "🛡️", "Iron Will"),
  bossLoot("halfway-lich", "l-lich", "Lich's Hourglass", "⏳", "Halfway Hunter"),
  bossLoot("gate-75", "l-gate75", "Mark of the 75th Gate", "🔥", "The Unrelenting"),
  bossLoot("unbroken", "l-unbroken", "Unbroken Chain", "⛓️", "Unbroken"),
  bossLoot("penance", "l-penance", "Penitent's Gauntlet", "🧤", "Penance Knight"),
  bossLoot("habit-hydra", "l-hydra", "Hydra Fang", "🦷", "Habit Slayer"),
  bossLoot("full-moon", "l-moon", "Full Moon Charm", "🌕", "Moonkeeper"),
];
