// Faith — shared by ARISE and Bloom.
// The Bible is built in (BSB, KJV, RV1909 — public domain, offline). NIV / RVR1960 open online.
// Each app passes wording through cfg.faith: { head, walk, focus[7], hello }.
import { ymd, addDays, parse } from "./engine.js";
import { BOOKS, BOOK, TOTAL_CH, GOSPELS, TRANSLATIONS, BUILT_IN, PLANS, VERSES, ACTS, planOrder, chName, bookName, readUrl, refUrl, loadChapter, loadBook, loadRef, parseRef, refLabel } from "./bible.js";

export const FXP = { chapter: 10, soap: 10, prayerDay: 15, prayerMinCap: 15, grat: 5, church: 25, answered: 20, verse: 25 };
export const FAITH_DEFAULTS = { rtr: "BSB", app: "bg", plan: "path", goal: 1, pass: 1, reads: [], prayer: {}, requests: [], grat: {}, church: {}, mem: [], hl: {}, es: null, fs: 18 };
const GAPS = [0, 1, 2, 4, 8, 16, 30];
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const rtrOf = (F) => (BUILT_IN.includes(F.rtr) ? F.rtr : F.tr === "RVR1960" ? "RV1909" : "BSB");
export const esNames = (F) => F.es ?? !!TRANSLATIONS[rtrOf(F)]?.es;

/* ---------- streak helpers (also used by ARISE's life modules) ---------- */
export function streakBack(isDone, today, maxBack = 800) {
  let d = isDone(today) ? today : addDays(today, -1), n = 0;
  while (n < maxBack && isDone(d)) { n++; d = addDays(d, -1); }
  return n;
}
export function bestRun(days, isDone) {
  if (!days.length) return 0;
  const first = [...days].sort()[0], last = ymd();
  let run = 0, best = 0;
  for (let d = first, i = 0; d <= last && i < 3000; d = addDays(d, 1), i++) { if (isDone(d)) { run++; best = Math.max(best, run); } else run = 0; }
  return best;
}

/* =========================================================
   compute
   ========================================================= */
export function computeFaith(state, today = ymd()) {
  const F = state.faith;
  const reads = F.reads || [];
  const uniq = new Set(reads.map((r) => r.k));
  const passSet = new Set(reads.filter((r) => (r.p || 1) === F.pass).map((r) => r.k));
  const next = planOrder(F.plan).find((k) => !passSet.has(k)) || null;
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
    next, passDone: !next, passSet, passCount: passSet.size, uniq, bookCh, chByDay, chToday: chByDay[today] || 0, goal,
    wordStreak: streakBack(wordDone, today), bestWord: bestRun(Object.keys(chByDay), wordDone),
    prayerStreak: streakBack(prayed, today), bestPrayer: bestRun(Object.keys(F.prayer), prayed),
    prayedToday: prayed(today), prayerDays, prayerMin, answered, memMastered, gratDays, churchDays, soap, booksDone,
    totalCh: uniq.size, pct: (uniq.size / TOTAL_CH) * 100,
    gospelCh: sumCh((id) => GOSPELS.includes(id)), psalmCh: bookCh.PSA || 0, ntCh: sumCh((id) => BOOK[id].nt), otCh: sumCh((id) => !BOOK[id].nt),
    thankfulToday: thankful(today), wordDone, prayed, thankful,
  };
  let xp = reads.length * FXP.chapter + soap * FXP.soap + gratDays * FXP.grat + churchDays * FXP.church + answered * FXP.answered + memMastered * FXP.verse;
  xp += Object.values(F.prayer).reduce((s, p) => s + FXP.prayerDay + Math.min(FXP.prayerMinCap, Math.floor((p.min || 0) / 2)), 0);
  const metrics = { bibleCh: uniq.size, gospelCh: faith.gospelCh, psalmCh: faith.psalmCh, ntCh: faith.ntCh, bestWord: faith.bestWord, prayerDays, answered, memMastered, gratDays, chapters: reads.length, soap };
  return { xp, metrics, faith };
}

/* =========================================================
   actions
   ========================================================= */
const X = (ctx) => ctx.cfg.xpName;
const TX = (ctx) => ({ head: "[ THE WORD ]", walk: "Your walk", focus: ["Your church and the Lord's day", "Your family", "The people you love", "Your work or school", "Your friends", "Your city and the world", "Your own heart"], ...(ctx.cfg.faith || {}) });

export function markRead(ctx, k, { soap = true } = {}) {
  const F = ctx.state.faith;
  const entry = { id: uid(), k, d: ymd(), p: F.pass };
  F.reads.push(entry);
  ctx.save();
  ctx.toast(`${ctx.esc(chName(k, esNames(F)))} read · +${FXP.chapter} ${X(ctx)}`, 2200);
  ctx.render();
  if (soap) setTimeout(() => openSoap(ctx, entry.id, true), 350);
}

export function openSoap(ctx, id, fresh = false, verse = "") {
  const F = ctx.state.faith, e = F.reads.find((r) => r.id === id); if (!e) return;
  const n = { ...(e.n || {}) }, { esc } = ctx;
  if (verse && !n.s) n.s = verse;
  const f = (k, label, ph) => `<label>${label}<textarea class="soap-in" data-k="${k}" rows="2" placeholder="${esc(ph)}">${esc(n[k] || "")}</textarea></label>`;
  ctx.openSheet(`<h2>${fresh ? "Journal it?" : "Journal"} · ${esc(chName(e.k, esNames(F)))}</h2>
    <p class="muted small">The SOAP method — a few words each is enough. +${FXP.soap} ${X(ctx)}. Skip it if you're short on time.</p>
    ${f("s", "<b>S</b>cripture — the verse that stood out", "e.g. v. 5 — “I am the vine…”")}
    ${f("o", "<b>O</b>bservation — what does it say?", "What's happening, who's speaking, what it means")}
    ${f("a", "<b>A</b>pplication — what do I do with it?", "One thing to live out today")}
    ${f("p", "<b>P</b>rayer — talk to God about it", "Lord, help me…")}
    <div class="sheet-row"><button value="cancel" class="btn">${fresh ? "Skip" : "Cancel"}</button><button value="save" class="btn primary">Save</button></div>`,
  null, (rv) => {
    if (rv !== "save") return;
    const out = {}; ctx.$$(".soap-in").forEach((t) => { if (t.value.trim()) out[t.dataset.k] = t.value.trim(); });
    const had = e.n && Object.keys(e.n).length;
    if (Object.keys(out).length) e.n = out; else delete e.n;
    ctx.save(); ctx.render(); if (!had && e.n) ctx.toast(`Journal saved · +${FXP.soap} ${X(ctx)}`);
  });
}

export function addMemVerse(ctx, ref, text) {
  const F = ctx.state.faith;
  if (F.mem.some((m) => m.ref.toLowerCase() === ref.toLowerCase())) { ctx.toast("That verse is already in your memory verses"); return; }
  F.mem.push({ id: uid(), ref, text, added: ymd(), box: 0, due: ymd() });
  ctx.save(); ctx.toast(`${ctx.esc(ref)} added to memory verses ♡`); ctx.render();
}

function logPrayer(ctx, min) {
  const F = ctx.state.faith, d = ymd(), had = !!F.prayer[d];
  F.prayer[d] = { ...(F.prayer[d] || {}), min: (F.prayer[d]?.min || 0) + min };
  ctx.save(); ctx.toast(had ? `+${min} min of prayer` : `Prayer logged · +${FXP.prayerDay} ${X(ctx)}`); ctx.render();
}

export const verseOfDay = (d = ymd()) => { const p = parse(d); const n = Math.floor((p - new Date(p.getFullYear(), 0, 0)) / 864e5) + p.getFullYear(); return VERSES[n % VERSES.length]; };

/* =========================================================
   Faith tab
   ========================================================= */
let seg = "today", tick = null, setOpen = false;
export function renderFaith(ctx) {
  const v = ctx.$("#view-faith"), F = ctx.state.faith, L = ctx.G.life.faith, es = esNames(F);
  clearInterval(tick);
  v.innerHTML = `<div class="seg wide" id="f-seg">${[["today", "Today"], ["bible", "Bible"], ["prayer", "Prayer"], ["journal", "Journal"]].map(([k, l]) => `<button data-s="${k}" class="${seg === k ? "on" : ""}">${l}</button>`).join("")}</div><div id="f-body"></div>`;
  ctx.$$("#f-seg button").forEach((b) => (b.onclick = () => { seg = b.dataset.s; renderFaith(ctx); window.scrollTo({ top: 0 }); }));
  ({ today: fToday, bible: fBible, prayer: fPrayer, journal: fJournal })[seg](ctx, ctx.$("#f-body"), F, L, es);
}

/* ---------- Today ---------- */
function fToday(ctx, box, F, L, es) {
  const { esc, num } = ctx, today = ymd(), T = TX(ctx), rtr = rtrOf(F);
  const [vref, vkjv] = verseOfDay();
  const next = L.next, dow = new Date().getDay();
  const pr = F.prayer[today], grat = F.grat[today] || ["", "", ""];
  const open = F.requests.filter((r) => !r.ans);
  box.innerHTML = `
    <div class="panel sys">
      <p class="sys-head">${esc(T.head)}</p>
      <div class="f-streaks">
        <div><b>${L.wordStreak}</b><small>Word streak</small></div>
        <div><b>${L.prayerStreak}</b><small>Prayer streak</small></div>
        <div><b>${L.pct < 10 ? L.pct.toFixed(1) : Math.round(L.pct)}%</b><small>of the Bible</small></div>
      </div>
    </div>

    <div class="panel votd">
      <div class="panel-tag">Verse of the day</div>
      <p class="votd-t" id="votd-t">“${esc(vkjv)}”</p>
      <p class="votd-r">— ${esc(refLabel(vref, es))} <small id="votd-tr">KJV</small></p>
      <div class="votd-a"><button class="btn small ghost" id="votd-open">Read the chapter</button><button class="btn small" id="votd-mem">♥ Memorize</button></div>
    </div>

    <div class="panel reading">
      <div class="panel-tag">Today's chapter</div>
      ${next ? `<p class="label">${esc(PLANS[F.plan]?.name || "")} · pass ${F.pass} · ${L.passCount}/${TOTAL_CH}</p>
        <p class="rd-title">${esc(chName(next, es))}</p>
        <p class="muted small">${L.chToday >= L.goal ? `Today's reading is done ✓ (${L.chToday} ch). Keep going if you want.` : `${L.chToday}/${L.goal} chapter${L.goal > 1 ? "s" : ""} today · +${FXP.chapter} ${X(ctx)} each`}</p>
        <button class="btn primary wide-btn rd-go" id="rd-open">📖 Read ${esc(chName(next, es))} <small>${rtr}</small></button>
        <div class="rd-alt"><button class="btn small ghost" id="rd-done">✓ I read it somewhere else</button>
          <a class="tr-chip" href="${readUrl(next, "NIV", F.app)}" target="_blank" rel="noopener">NIV ↗</a><a class="tr-chip" href="${readUrl(next, "RVR1960", F.app)}" target="_blank" rel="noopener">RVR1960 ↗</a></div>`
      : `<p class="rd-title">You've read the whole Bible.</p><p class="muted">Every chapter, Genesis to Revelation. Start another pass whenever you're ready.</p>
        <button class="btn primary wide-btn" id="rd-pass">Start pass ${F.pass + 1}</button>`}
      ${L.chToday ? `<ul class="rd-today">${F.reads.filter((r) => r.d === today).map((r) => `<li><span>✓ ${esc(chName(r.k, es))}</span><button class="btn small" data-soap="${r.id}">${r.n ? "Edit journal" : "Journal"}</button></li>`).join("")}</ul>` : ""}
    </div>

    <div class="panel prayer">
      <div class="panel-tag">Prayer</div>
      <p class="label">Today's focus</p>
      <p class="pr-focus">${esc(T.focus[dow])}</p>
      <details class="acts"><summary>Guide me (A.C.T.S.)</summary><ul>${ACTS.map(([a, b]) => `<li><b>${a[0]}</b><span><b>${a}</b> — ${b}</span></li>`).join("")}</ul></details>
      <div class="pr-timer">
        <div><p class="pr-clock" id="pr-clock">${F.ptimer ? "0:00" : pr ? `${pr.min || 0} min` : "—"}</p><p class="fine">${F.ptimer ? "Praying…" : pr ? "prayed today ✓" : "not yet today"}</p></div>
        <button class="btn ${F.ptimer ? "" : "primary"}" id="pr-start">${F.ptimer ? "■ Amen (stop)" : "▶ Start prayer timer"}</button>
      </div>
      <div class="pr-quick">${[5, 10, 15, 30].map((m) => `<button class="btn small" data-pm="${m}">+${m} min</button>`).join("")}</div>
      ${open.length ? `<p class="fine">Praying for: ${open.slice(0, 4).map((r) => esc(r.t)).join(" · ")}${open.length > 4 ? " …" : ""}</p>` : ""}
    </div>

    <div class="panel">
      <div class="card-head"><div><h2>Thankful for</h2><p class="muted small">Three things from today · +${FXP.grat} ${X(ctx)}</p></div>${L.thankfulToday ? `<span class="ok-dot">✓</span>` : ""}</div>
      <div class="grat">${[0, 1, 2].map((i) => `<input class="grat-in" data-i="${i}" maxlength="120" placeholder="${["Something small", "Someone", "Something God did"][i]}" value="${esc(grat[i] || "")}">`).join("")}</div>
      <label class="toggle church"><span>⛪ Church / worship today<small>+${FXP.church} ${X(ctx)}</small></span><span class="switch"><input type="checkbox" id="church" ${F.church[today] ? "checked" : ""}><i></i></span></label>
    </div>

    <div class="panel">
      <div class="card-head"><h2>${esc(T.walk)}</h2></div>
      <div class="f-stats">
        <div><b>${num(L.totalCh)}</b><small>chapters</small></div>
        <div><b>${L.booksDone}<i>/66</i></b><small>books done</small></div>
        <div><b>${num(L.prayerMin)}</b><small>prayer min</small></div>
        <div><b>${L.prayerDays}</b><small>days prayed</small></div>
        <div><b>${L.answered}</b><small>answered</small></div>
        <div><b>${L.memMastered}</b><small>verses known</small></div>
      </div>
      <p class="fine">Best Word streak ${L.bestWord} · best prayer streak ${L.bestPrayer} · ${L.soap} journal entries</p>
    </div>`;

  const $ = (s) => box.querySelector(s);
  // verse of the day in your reading translation
  let vtext = vkjv;
  if (rtr !== "KJV") loadRef(rtr, vref).then((t) => { if (!t || !document.body.contains($("#votd-t"))) return; vtext = t; $("#votd-t").textContent = `“${t}”`; $("#votd-tr").textContent = rtr; }).catch(() => {});
  $("#votd-mem").onclick = () => addMemVerse(ctx, `${refLabel(vref, es)} (${vtext === vkjv ? "KJV" : rtr})`, vtext);
  $("#votd-open").onclick = () => { const r = parseRef(vref); if (r) openReader(ctx, `${r.id}.${r.c}`, r.v1); };
  $("#rd-open") && ($("#rd-open").onclick = () => openReader(ctx, next));
  $("#rd-done") && ($("#rd-done").onclick = () => markRead(ctx, next));
  $("#rd-pass") && ($("#rd-pass").onclick = () => { F.pass++; ctx.save(); ctx.render(); ctx.toast(`Pass ${F.pass} begins.`); });
  box.querySelectorAll("[data-soap]").forEach((b) => (b.onclick = () => openSoap(ctx, b.dataset.soap)));
  box.querySelectorAll("[data-pm]").forEach((b) => (b.onclick = () => logPrayer(ctx, +b.dataset.pm)));
  $("#pr-start").onclick = () => {
    if (!F.ptimer) { F.ptimer = Date.now(); ctx.save(); ctx.render(); return; }
    const min = Math.max(1, Math.round((Date.now() - F.ptimer) / 60000)); delete F.ptimer; ctx.save(); logPrayer(ctx, min);
  };
  if (F.ptimer) {
    const draw = () => { const el = document.getElementById("pr-clock"); if (!el) return clearInterval(tick); const s = Math.floor((Date.now() - F.ptimer) / 1000); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
    draw(); tick = setInterval(draw, 1000);
  }
  box.querySelectorAll(".grat-in").forEach((inp) => (inp.onchange = () => {
    const had = L.thankfulToday;
    const g = (F.grat[ymd()] ||= ["", "", ""]); g[+inp.dataset.i] = inp.value.trim();
    if (!g.some((x) => x)) delete F.grat[ymd()];
    ctx.save(); if (!had && g.some((x) => x)) { ctx.toast(`Thankful heart · +${FXP.grat} ${X(ctx)}`); ctx.render(); }
  }));
  $("#church").onchange = (e) => { if (e.target.checked) F.church[ymd()] = 1; else delete F.church[ymd()]; ctx.save(); ctx.render(); if (e.target.checked) ctx.toast(`Worship logged · +${FXP.church} ${X(ctx)}`); };
}

/* ---------- Bible map + settings ---------- */
function fBible(ctx, box, F, L, es) {
  const { esc } = ctx, rtr = rtrOf(F);
  const ot = BOOKS.filter((b) => !b.nt), nt = BOOKS.filter((b) => b.nt);
  const tile = (b) => { const n = L.bookCh[b.id] || 0, p = n / b.ch; return `<button class="bk ${p >= 1 ? "done" : n ? "some" : ""}" data-b="${b.id}"><i style="height:${p * 100}%"></i><span>${esc(bookName(b.id, es))}</span><small>${n}/${b.ch}</small></button>`; };
  box.innerHTML = `
    <div class="panel">
      <div class="card-head"><div><h2>The whole Bible</h2><p class="muted small">${L.totalCh} of ${TOTAL_CH} chapters · ${L.booksDone} of 66 books</p></div></div>
      <p class="label">Old Testament · ${L.otCh}/929</p><div class="bar"><div class="bar-fill" style="width:${(L.otCh / 929) * 100}%"></div></div>
      <p class="label" style="margin-top:10px">New Testament · ${L.ntCh}/260</p><div class="bar"><div class="bar-fill" style="width:${(L.ntCh / 260) * 100}%"></div></div>
      <p class="fine">Tap a book to read it, or to check off chapters you've already read.</p>
    </div>
    <details class="panel rd-settings" ${setOpen ? "open" : ""}><summary><b>Reading plan & translation</b><small>${esc(PLANS[F.plan].name)} · ${F.goal}/day · ${rtr}</small></summary>
      <p class="label">Plan</p>
      <div class="plan-opts">${Object.entries(PLANS).map(([k, p]) => `<button class="plan-opt ${F.plan === k ? "on" : ""}" data-p="${k}"><b>${esc(p.name)}</b><small>${esc(p.sub)}</small></button>`).join("")}</div>
      <p class="label">Chapters a day</p>
      <div class="seg" id="goal-seg">${[1, 2, 3, 4, 5].map((n) => `<button data-g="${n}" class="${F.goal === n ? "on" : ""}">${n}</button>`).join("")}</div>
      <p class="label">Read in the app</p>
      <div class="seg" id="tr-seg">${BUILT_IN.map((t) => `<button data-t="${t}" class="${rtr === t ? "on" : ""}">${t}</button>`).join("")}</div>
      <p class="fine">${esc(TRANSLATIONS[rtr].name)} — built in, works offline. BSB reads a lot like the NIV; RV1909 is the Reina-Valera before the 1960 revision. NIV and RVR1960 are copyrighted, so those buttons open online.</p>
      <p class="label">NIV / RVR1960 buttons open in</p>
      <div class="seg" id="app-seg"><button data-a="bg" class="${F.app !== "yv" ? "on" : ""}">Bible Gateway</button><button data-a="yv" class="${F.app === "yv" ? "on" : ""}">YouVersion app</button></div>
      <label class="toggle"><span>Spanish book names<small>Génesis, Juan, Salmos…</small></span><span class="switch"><input type="checkbox" id="es-names" ${es ? "checked" : ""}><i></i></span></label>
      <button class="btn wide-btn" id="dl-bible" style="margin-top:14px">⬇ Save the whole ${rtr} for offline</button>
    </details>
    <div class="panel"><p class="label">Antiguo · Old Testament</p><div class="bk-grid">${ot.map(tile).join("")}</div>
      <p class="label" style="margin-top:14px">Nuevo · New Testament</p><div class="bk-grid">${nt.map(tile).join("")}</div></div>`;
  const qa = (s) => box.querySelectorAll(s);
  qa(".plan-opt").forEach((b) => (b.onclick = () => { F.plan = b.dataset.p; ctx.save(); ctx.render(); ctx.toast(`Plan: ${PLANS[F.plan].name}`); }));
  qa("#goal-seg button").forEach((b) => (b.onclick = () => { F.goal = +b.dataset.g; ctx.save(); ctx.render(); }));
  qa("#tr-seg button").forEach((b) => (b.onclick = () => { F.rtr = b.dataset.t; ctx.save(); ctx.render(); }));
  qa("#app-seg button").forEach((b) => (b.onclick = () => { F.app = b.dataset.a; ctx.save(); ctx.render(); }));
  box.querySelector("#es-names").onchange = (e) => { F.es = e.target.checked; ctx.save(); ctx.render(); };
  box.querySelector(".rd-settings").ontoggle = (e) => (setOpen = e.target.open);
  box.querySelector("#dl-bible").onclick = async (e) => {
    const btn = e.currentTarget; let n = 0, bad = 0;
    btn.disabled = true;
    for (const b of BOOKS) { try { await loadBook(rtr, b.id); } catch { bad++; } n++; btn.textContent = `Saving… ${n}/66`; }
    btn.textContent = bad ? `Saved ${66 - bad}/66 — try again with signal` : `✓ ${rtr} saved for offline`;
  };
  qa(".bk").forEach((b) => (b.onclick = () => openBookSheet(ctx, b.dataset.b)));
}

function openBookSheet(ctx, id) {
  const F = ctx.state.faith, es = esNames(F), b = BOOK[id], { esc } = ctx;
  let marking = false;
  const draw = (f) => {
    const read = new Set(F.reads.map((r) => r.k));
    f.querySelector("#ch-grid").innerHTML = Array.from({ length: b.ch }, (_, i) => `<button type="button" class="ch ${read.has(`${id}.${i + 1}`) ? "on" : ""}" data-c="${i + 1}">${i + 1}</button>`).join("");
    f.querySelector("#ch-n").textContent = `${[...read].filter((k) => k.startsWith(id + ".")).length}/${b.ch} read · ${marking ? "tap to check off" : "tap a chapter to read it"}`;
    f.querySelectorAll(".ch").forEach((c) => (c.onclick = () => {
      const k = `${id}.${c.dataset.c}`;
      if (!marking) { document.getElementById("sheet").close(); openReader(ctx, k); return; }
      if (read.has(k)) { const i = F.reads.map((r) => r.k).lastIndexOf(k); F.reads.splice(i, 1); }
      else F.reads.push({ id: uid(), k, d: ymd(), p: F.pass });
      ctx.save(); draw(f);
    }));
  };
  ctx.openSheet(`<h2>${esc(bookName(id, es))}</h2><p class="muted small" id="ch-n"></p>
    <label class="toggle"><span>Check-off mode<small>for chapters you read before this app</small></span><span class="switch"><input type="checkbox" id="ch-mark"><i></i></span></label>
    <div class="ch-grid" id="ch-grid"></div>
    <button type="button" class="btn" id="ch-all" hidden>Mark the whole book read</button>
    <button value="close" class="btn primary">Done</button>`, (f) => {
    draw(f);
    f.querySelector("#ch-mark").onchange = (e) => { marking = e.target.checked; f.querySelector("#ch-all").hidden = !marking; draw(f); };
    f.querySelector("#ch-all").onclick = () => {
      const read = new Set(F.reads.map((r) => r.k));
      for (let c = 1; c <= b.ch; c++) if (!read.has(`${id}.${c}`)) F.reads.push({ id: uid(), k: `${id}.${c}`, d: ymd(), p: F.pass });
      ctx.save(); draw(f);
    };
  }, () => { if (ctx.current === "faith") ctx.render(); });
}

/* =========================================================
   Reader — the Bible inside the app
   ========================================================= */
let readK = "JHN.1", sel = new Set(), jumpV = null, from = "faith";
export function openReader(ctx, k, v = null) { readK = k; sel = new Set(); jumpV = v; from = ctx.current === "reader" ? from : ctx.current; ctx.show("reader"); }
export const readerHtml = `<div id="reader-body"></div><div class="verse-bar" id="verse-bar" hidden></div>`;
const neighbor = (k, dir) => {
  const [id, c] = k.split("."), b = BOOK[id];
  if (dir > 0) return +c < b.ch ? `${id}.${+c + 1}` : b.i < 65 ? `${BOOKS[b.i + 1].id}.1` : null;
  return +c > 1 ? `${id}.${+c - 1}` : b.i > 0 ? `${BOOKS[b.i - 1].id}.${BOOKS[b.i - 1].ch}` : null;
};
export function renderReader(ctx) {
  const v = ctx.$("#reader-body"), F = ctx.state.faith, L = ctx.G.life.faith, es = esNames(F), { esc } = ctx;
  const rtr = rtrOf(F), k = readK, prev = neighbor(k, -1), next = neighbor(k, 1);
  const done = L.passSet.has(k), short = (x) => (x ? chName(x, es).replace(/^(\d?\s?\S{1,4})\S*/, "$1") : "");
  v.innerHTML = `<div class="rd-top"><button class="back" id="rd-back">‹ ${from === "home" ? "Home" : "Faith"}</button>
      <div class="rd-size"><button class="btn small ghost" data-fs="-1" aria-label="Smaller text">A−</button><button class="btn small ghost" data-fs="1" aria-label="Bigger text">A+</button></div></div>
    <div class="panel rd-head">
      <h2 class="rd-title">${esc(chName(k, es))}</h2>
      <div class="seg" id="rt-seg">${BUILT_IN.map((t) => `<button data-t="${t}" class="${rtr === t ? "on" : ""}">${t}</button>`).join("")}</div>
      <div class="rd-links"><a class="tr-chip" href="${readUrl(k, "NIV", F.app)}" target="_blank" rel="noopener">NIV ↗</a><a class="tr-chip" href="${readUrl(k, "RVR1960", F.app)}" target="_blank" rel="noopener">RVR1960 ↗</a></div>
    </div>
    <article class="panel rd-text" id="rd-text" style="--fs:${F.fs || 18}px"><p class="muted">Opening ${esc(chName(k, es))}…</p></article>
    <div class="rd-nav">
      <button class="btn" id="rd-prev" ${prev ? "" : "disabled"}>‹ ${esc(short(prev))}</button>
      <button class="btn ${done ? "" : "primary"}" id="rd-mark">${done ? "✓ Read" : "✓ Mark as read"}</button>
      <button class="btn" id="rd-next" ${next ? "" : "disabled"}>${esc(short(next))} ›</button>
    </div>`;
  const q = (s) => v.querySelector(s);
  q("#rd-back").onclick = () => { hideBar(); ctx.show(from || "faith"); };
  v.querySelectorAll("[data-fs]").forEach((b) => (b.onclick = () => { F.fs = Math.min(28, Math.max(14, (F.fs || 18) + 2 * +b.dataset.fs)); ctx.save(); q("#rd-text").style.setProperty("--fs", `${F.fs}px`); }));
  v.querySelectorAll("#rt-seg button").forEach((b) => (b.onclick = () => { F.rtr = b.dataset.t; ctx.save(); renderReader(ctx); }));
  q("#rd-prev").onclick = () => { readK = prev; sel = new Set(); hideBar(); renderReader(ctx); window.scrollTo({ top: 0 }); };
  q("#rd-next").onclick = () => { readK = next; sel = new Set(); hideBar(); renderReader(ctx); window.scrollTo({ top: 0 }); };
  q("#rd-mark").onclick = () => { if (done) { ctx.toast("Already read this pass ✓"); return; } hideBar(); markRead(ctx, k); };
  loadChapter(rtr, k).then((verses) => {
    if (readK !== k || !document.body.contains(q("#rd-text"))) return;
    q("#rd-text").innerHTML = verses.map((t, i) => t ? `<span class="vs ${F.hl[`${k}.${i + 1}`] ? "hl" : ""} ${sel.has(i + 1) ? "sel" : ""}" data-v="${i + 1}"><sup>${i + 1}</sup>${esc(t)} </span>` : "").join("")
      + `<p class="rd-foot">${esc(TRANSLATIONS[rtr].name)}</p>`;
    v.querySelectorAll(".vs").forEach((s) => (s.onclick = () => { const n = +s.dataset.v; sel.has(n) ? sel.delete(n) : sel.add(n); s.classList.toggle("sel"); showBar(ctx, verses); }));
    if (jumpV) { const el = q(`.vs[data-v="${jumpV}"]`); if (el) { el.classList.add("flash"); setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 80); } jumpV = null; }
  }).catch(() => { q("#rd-text").innerHTML = `<p class="muted">Couldn't open this chapter offline yet. Connect once (or use “Save for offline” in Bible settings) and it'll be saved on your phone.</p>`; });
}
function hideBar() { const b = document.getElementById("verse-bar"); if (b) b.hidden = true; }
function showBar(ctx, verses) {
  const bar = document.getElementById("verse-bar"), F = ctx.state.faith, es = esNames(F), rtr = rtrOf(F);
  if (!sel.size) { bar.hidden = true; return; }
  const vs = [...sel].sort((a, b) => a - b), [id, c] = readK.split(".");
  const ref = `${bookName(id, es)} ${c}:${vs[0]}${vs.length > 1 ? `-${vs.at(-1)}` : ""}`;
  const text = vs.map((n) => verses[n - 1]).join(" ");
  const allHl = vs.every((n) => F.hl[`${readK}.${n}`]);
  bar.innerHTML = `<b>${ctx.esc(ref)}</b><div><button data-a="mem">♥ Memorize</button><button data-a="hl">${allHl ? "Unhighlight" : "🖍 Highlight"}</button><button data-a="copy">Copy</button><button data-a="x" aria-label="Clear">✕</button></div>`;
  bar.hidden = false;
  bar.querySelectorAll("button").forEach((b) => (b.onclick = async () => {
    const a = b.dataset.a;
    if (a === "mem") addMemVerse(ctx, `${ref} (${rtr})`, text);
    if (a === "hl") { vs.forEach((n) => { const key = `${readK}.${n}`; if (allHl) delete F.hl[key]; else F.hl[key] = 1; }); ctx.save(); ctx.toast(allHl ? "Highlight removed" : "Highlighted"); }
    if (a === "copy") { try { await navigator.clipboard.writeText(`“${text}” — ${ref} (${rtr})`); ctx.toast("Copied"); } catch { ctx.toast("Couldn't copy"); } }
    sel = new Set(); bar.hidden = true;
    if (a !== "mem") renderReader(ctx);
  }));
}

/* ---------- Prayer list ---------- */
function fPrayer(ctx, box, F, L) {
  const { esc, md } = ctx, today = ymd();
  const open = F.requests.filter((r) => !r.ans), done = F.requests.filter((r) => r.ans).sort((a, b) => b.ans.localeCompare(a.ans));
  const days14 = [...Array(14)].map((_, i) => addDays(today, i - 13)), mx = Math.max(10, ...days14.map((d) => F.prayer[d]?.min || 0));
  box.innerHTML = `
    <div class="panel">
      <div class="card-head"><div><h2>Prayer list</h2><p class="muted small">Keep track of what you're bringing to God — and write down when He answers.</p></div></div>
      <form id="rq-form" class="rq-form"><input id="rq-t" maxlength="140" placeholder="What are you praying for?" required><input id="rq-w" maxlength="40" placeholder="For who? (optional)"><button class="btn primary">Add</button></form>
      ${open.length ? `<ul class="rq-list">${open.map((r) => `<li><div><b>${esc(r.t)}</b><small>${r.w ? `${esc(r.w)} · ` : ""}since ${md(r.added)}</small></div>
        <button class="btn small" data-ans="${r.id}">Answered</button><button class="del" data-del="${r.id}" aria-label="Remove">×</button></li>`).join("")}</ul>` : `<p class="muted">Nothing on the list yet.</p>`}
    </div>
    <div class="panel praise">
      <div class="card-head"><h2>🕊️ Answered</h2><span class="muted small">${done.length}</span></div>
      ${done.length ? `<ul class="rq-list">${done.map((r) => `<li><div><b>${esc(r.t)}</b><small>Prayed ${md(r.added)} → answered ${md(r.ans)}${r.note ? ` · ${esc(r.note)}` : ""}</small></div><button class="del" data-un="${r.id}" aria-label="Undo">↺</button></li>`).join("")}</ul>`
        : `<p class="muted">When a prayer is answered, mark it. Looking back at this list is how faith grows.</p>`}
    </div>
    <div class="panel">
      <div class="card-head"><h2>Last 14 days</h2><span class="muted small">${L.prayerDays} days · ${L.prayerMin} min total</span></div>
      <div class="mini-bars">${days14.map((d) => `<div><i style="height:${((F.prayer[d]?.min || 0) / mx) * 100}%" class="${F.prayer[d] ? "on" : ""}"></i><small>${"SMTWTFS"[parse(d).getDay()]}</small></div>`).join("")}</div>
    </div>`;
  box.querySelector("#rq-form").onsubmit = (e) => {
    e.preventDefault();
    F.requests.unshift({ id: uid(), t: box.querySelector("#rq-t").value.trim(), w: box.querySelector("#rq-w").value.trim(), added: today, ans: null });
    ctx.save(); ctx.render();
  };
  box.querySelectorAll("[data-ans]").forEach((b) => (b.onclick = () => {
    const r = F.requests.find((x) => x.id === b.dataset.ans);
    ctx.openSheet(`<h2>Answered 🕊️</h2><p class="muted">${esc(r.t)}</p><label>How did God answer? (optional)<textarea id="ans-n" rows="3"></textarea></label>
      <div class="sheet-row"><button value="cancel" class="btn">Cancel</button><button value="save" class="btn primary">Praise God</button></div>`, null, (rv) => {
      if (rv !== "save") return;
      r.ans = today; const n = document.getElementById("ans-n").value.trim(); if (n) r.note = n;
      ctx.save(); ctx.render(); ctx.toast(`Answered prayer · +${FXP.answered} ${X(ctx)}`);
    });
  }));
  box.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => { if (!confirm("Remove this request?")) return; F.requests = F.requests.filter((x) => x.id !== b.dataset.del); ctx.save(); ctx.render(); }));
  box.querySelectorAll("[data-un]").forEach((b) => (b.onclick = () => { const r = F.requests.find((x) => x.id === b.dataset.un); r.ans = null; delete r.note; ctx.save(); ctx.render(); }));
}

/* ---------- Journal + memory verses + highlights ---------- */
function fJournal(ctx, box, F, L, es) {
  const { esc, md } = ctx, today = ymd(), rtr = rtrOf(F);
  const due = F.mem.filter((m) => m.due <= today && (m.box || 0) < 6);
  const notes = F.reads.filter((r) => r.n).sort((a, b) => b.d.localeCompare(a.d));
  const recent = F.reads.filter((r) => !r.n).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 5);
  const hls = Object.keys(F.hl).sort((a, b) => { const [x, c1, v1] = a.split("."), [y, c2, v2] = b.split("."); return BOOK[x].i - BOOK[y].i || c1 - c2 || v1 - v2; });
  box.innerHTML = `
    <div class="panel">
      <div class="card-head"><div><h2>Memory verses</h2><p class="muted small">${F.mem.length} verses · ${L.memMastered} known by heart · ${due.length} due</p></div>
        <button class="btn small" id="mv-add">+ Add</button></div>
      ${due.length ? `<button class="btn primary wide-btn" id="mv-review">Review ${due.length} verse${due.length > 1 ? "s" : ""}</button>` : F.mem.length ? `<p class="fine">Nothing due — come back tomorrow.</p>` : ""}
      ${F.mem.length ? `<ul class="mv-verses">${F.mem.map((m) => `<li><div><b>${esc(m.ref)}</b><small>${esc((m.text || "").slice(0, 80))}${(m.text || "").length > 80 ? "…" : ""}</small></div>
        <span class="dots">${[1, 2, 3, 4, 5].map((i) => `<i class="${(m.box || 0) >= i ? "on" : ""}"></i>`).join("")}</span><button class="del" data-mdel="${m.id}" aria-label="Remove">×</button></li>`).join("")}</ul>`
        : `<p class="muted">Tap ♥ Memorize on the verse of the day, or tap any verse while you read. Five reviews spaced out over a month and it's yours.</p>`}
    </div>
    <div class="panel">
      <div class="card-head"><div><h2>Journal</h2><p class="muted small">Your SOAP notes · ${notes.length} entries</p></div></div>
      ${recent.length ? `<p class="label">Write about a recent chapter</p><div class="chip-row">${recent.map((r) => `<button class="chip" data-soap="${r.id}">${esc(chName(r.k, es))}</button>`).join("")}</div>` : ""}
      ${notes.length ? `<ul class="soap-list">${notes.map((r) => `<li data-soap="${r.id}"><p class="label">${esc(chName(r.k, es))} · ${md(r.d)}</p>
        ${r.n.s ? `<p><b>S</b> ${esc(r.n.s)}</p>` : ""}${r.n.o ? `<p><b>O</b> ${esc(r.n.o)}</p>` : ""}${r.n.a ? `<p><b>A</b> ${esc(r.n.a)}</p>` : ""}${r.n.p ? `<p><b>P</b> ${esc(r.n.p)}</p>` : ""}</li>`).join("")}</ul>`
        : `<p class="muted">After you read, jot down one verse, what it means, how to live it and a short prayer.</p>`}
    </div>
    <div class="panel">
      <div class="card-head"><div><h2>🖍 Highlights</h2><p class="muted small">${hls.length} verses</p></div></div>
      ${hls.length ? `<ul class="hl-list">${hls.slice(0, 60).map((h) => { const [id, c, vv] = h.split("."); return `<li data-k="${id}.${c}" data-v="${vv}"><b>${esc(bookName(id, es))} ${c}:${vv}</b><span class="hl-t" data-h="${h}">…</span></li>`; }).join("")}</ul>`
        : `<p class="muted">Tap a verse while you read and choose Highlight.</p>`}
    </div>`;
  box.querySelectorAll(".hl-list li").forEach((li) => {
    const [id, c] = li.dataset.k.split("."), vv = +li.dataset.v;
    loadChapter(rtr, li.dataset.k).then((ch) => { const s = li.querySelector(".hl-t"); if (s) s.textContent = ch[vv - 1] || ""; }).catch(() => {});
    li.onclick = () => openReader(ctx, `${id}.${c}`, vv);
  });
  box.querySelectorAll("[data-soap]").forEach((b) => (b.onclick = () => openSoap(ctx, b.dataset.soap)));
  box.querySelectorAll("[data-mdel]").forEach((b) => (b.onclick = () => { if (!confirm("Remove this verse?")) return; F.mem = F.mem.filter((m) => m.id !== b.dataset.mdel); ctx.save(); ctx.render(); }));
  box.querySelector("#mv-add").onclick = () => ctx.openSheet(`<h2>Add a verse</h2>
    <label>Reference<input type="text" id="mv-ref" placeholder="e.g. Romans 8:28"></label>
    <button type="button" class="btn small" id="mv-fill">Fill in the words (${rtr})</button>
    <label>Text<textarea id="mv-text" rows="4" placeholder="Fills in from the built-in Bible, or type your own"></textarea></label>
    <div class="sheet-row"><button value="cancel" class="btn">Cancel</button><button value="save" class="btn primary">Add</button></div>`, (f) => {
    f.querySelector("#mv-fill").onclick = async () => {
      const r = f.querySelector("#mv-ref").value.trim(); if (!r) return;
      try { const t = await loadRef(rtr, r); if (t) f.querySelector("#mv-text").value = t; else ctx.toast("Try a reference like John 3:16"); } catch { ctx.toast("Couldn't load that verse"); }
    };
  }, async (rv) => {
    if (rv !== "save") return;
    const ref = document.getElementById("mv-ref").value.trim(); let text = document.getElementById("mv-text").value.trim();
    if (!ref) return;
    if (!text) { try { text = (await loadRef(rtr, ref)) || ""; } catch {} }
    addMemVerse(ctx, parseRef(ref) ? `${ref} (${rtr})` : ref, text);
  });
  box.querySelector("#mv-review") && (box.querySelector("#mv-review").onclick = () => review(ctx, due));
}

function review(ctx, list) {
  const { esc } = ctx;
  let i = 0, known = 0;
  const step = (f) => {
    if (i >= list.length) { f.innerHTML = `<h2>Done ✓</h2><p class="muted">${known}/${list.length} from memory. They'll come back on a spaced schedule.</p><button value="close" class="btn primary">Close</button>`; return; }
    const m = list[i];
    f.innerHTML = `<p class="label">${i + 1} of ${list.length}</p><h2>${esc(m.ref)}</h2>
      <p class="muted small">Say it out loud from memory, then check.</p>
      <div class="mv-card" id="mv-card"><span>Tap to reveal</span></div>
      <div class="sheet-row" id="mv-btns" hidden><button type="button" class="btn" id="mv-again">Not yet</button><button type="button" class="btn primary" id="mv-got">Got it</button></div>
      <button value="close" class="btn ghost">Stop</button>`;
    f.querySelector("#mv-card").onclick = (e) => { e.currentTarget.innerHTML = `<p>${esc(m.text || "(no words saved for this one)")}</p>`; f.querySelector("#mv-btns").hidden = false; };
    f.querySelector("#mv-got").onclick = () => { m.box = Math.min(6, (m.box || 0) + 1); m.due = addDays(ymd(), GAPS[m.box]); known++; i++; ctx.save(); if (m.box === 5) ctx.toast(`${esc(m.ref)} — hidden in your heart · +${FXP.verse} ${X(ctx)}`); step(f); };
    f.querySelector("#mv-again").onclick = () => { m.box = Math.min(1, m.box || 0); m.due = addDays(ymd(), 1); i++; ctx.save(); step(f); };
  };
  ctx.openSheet("", step, () => ctx.render());
}

/* ---------- small home card (Bloom) ---------- */
export function faithHome(ctx) {
  const F = ctx.state.faith, L = ctx.G.life.faith, es = esNames(F), { esc } = ctx;
  const [vref, vkjv] = verseOfDay();
  return `<div class="panel faith-home">
    <div class="panel-tag">${esc(TX(ctx).homeTag || "Quiet time")}</div>
    <p class="fh-v" id="fh-v">“${esc(vkjv)}”</p><p class="fh-r">— ${esc(refLabel(vref, es))}</p>
    <div class="fh-row">
      <button class="fh-b ${L.chToday >= L.goal ? "ok" : ""}" id="fh-read"><span>📖</span><b>${L.chToday >= L.goal ? "Read today ✓" : L.next ? esc(chName(L.next, es)) : "Bible complete"}</b><small>${L.wordStreak ? `${L.wordStreak}-day streak` : "chapter a day"}</small></button>
      <button class="fh-b ${L.prayedToday ? "ok" : ""}" id="fh-pray"><span>🙏</span><b>${L.prayedToday ? `Prayed ✓` : "Pray"}</b><small>${L.prayerStreak ? `${L.prayerStreak}-day streak` : "a few minutes"}</small></button>
    </div></div>`;
}
export function bindFaithHome(ctx) {
  const F = ctx.state.faith, L = ctx.G.life.faith, rtr = rtrOf(F), [vref] = verseOfDay();
  if (rtr !== "KJV") loadRef(rtr, vref).then((t) => { const el = document.getElementById("fh-v"); if (t && el) el.textContent = `“${t}”`; }).catch(() => {});
  const r = document.getElementById("fh-read"); if (r) r.onclick = () => (L.next && L.chToday < L.goal ? openReader(ctx, L.next) : ctx.show("faith"));
  const p = document.getElementById("fh-pray"); if (p) p.onclick = () => { seg = "today"; ctx.show("faith"); setTimeout(() => document.querySelector(".prayer")?.scrollIntoView({ block: "center", behavior: "smooth" }), 100); };
}
