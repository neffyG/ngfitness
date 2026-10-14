// Faith tab — the Word, prayer, gratitude, journal and memory verses.
import { ymd, addDays, parse } from "./engine.js";
import { BOOKS, BOOK, TOTAL_CH, TRANSLATIONS, PLANS, VERSES, PRAYER_FOCUS, ACTS, planOrder, chName, bookName, readUrl, refUrl } from "./bible.js";
import { LXP, uid } from "./life.js";

let seg = "today", tick = null;
const GAPS = [0, 1, 2, 4, 8, 16, 30];
export const verseOfDay = (d = ymd()) => { const p = parse(d); const n = Math.floor((p - new Date(p.getFullYear(), 0, 0)) / 864e5) + p.getFullYear(); return VERSES[n % VERSES.length]; };
export const esNames = (F) => F.es ?? F.tr === "RVR1960";

export function markRead(ctx, k, { soap = true } = {}) {
  const F = ctx.state.faith;
  const entry = { id: uid(), k, d: ymd(), p: F.pass };
  F.reads.push(entry);
  ctx.save();
  ctx.toast(`${ctx.esc(chName(k, esNames(F)))} read · +${LXP.chapter} XP`, 2200);
  ctx.render();
  if (soap) setTimeout(() => openSoap(ctx, entry.id, true), 350);
}

export function openSoap(ctx, id, fresh = false) {
  const F = ctx.state.faith, e = F.reads.find((r) => r.id === id); if (!e) return;
  const n = e.n || {}, es = esNames(F), { esc } = ctx;
  const f = (k, label, ph) => `<label>${label}<textarea class="soap-in" data-k="${k}" rows="2" placeholder="${esc(ph)}">${esc(n[k] || "")}</textarea></label>`;
  ctx.openSheet(`<h2>${fresh ? "Journal it?" : "Journal"} · ${esc(chName(e.k, es))}</h2>
    <p class="muted small">The SOAP method — a few words each is enough. +${LXP.soap} XP. Skip it if you're short on time.</p>
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
    ctx.save(); ctx.render(); if (!had && e.n) ctx.toast(`Journal saved · +${LXP.soap} XP`);
  });
}

export function addMemVerse(ctx, ref, text) {
  const F = ctx.state.faith;
  if (F.mem.some((m) => m.ref.toLowerCase() === ref.toLowerCase())) { ctx.toast("That verse is already in your memory deck"); return; }
  F.mem.push({ id: uid(), ref, text, added: ymd(), box: 0, due: ymd() });
  ctx.save(); ctx.toast(`${ctx.esc(ref)} added to memory verses`); ctx.render();
}

function logPrayer(ctx, min) {
  const F = ctx.state.faith, d = ymd(), had = !!F.prayer[d];
  F.prayer[d] = { ...(F.prayer[d] || {}), min: (F.prayer[d]?.min || 0) + min };
  ctx.save(); ctx.toast(had ? `+${min} min of prayer` : `Prayer logged · +${LXP.prayerDay} XP`); ctx.render();
}

export function renderFaith(ctx) {
  const v = ctx.$("#view-faith"), { state, G, esc, num } = ctx, F = state.faith, L = G.life.faith, es = esNames(F);
  clearInterval(tick);
  v.innerHTML = `<div class="seg wide" id="f-seg">${[["today", "Today"], ["bible", "Bible"], ["prayer", "Prayer"], ["journal", "Journal"]].map(([k, l]) => `<button data-s="${k}" class="${seg === k ? "on" : ""}">${l}</button>`).join("")}</div><div id="f-body"></div>`;
  ctx.$$("#f-seg button").forEach((b) => (b.onclick = () => { seg = b.dataset.s; renderFaith(ctx); window.scrollTo({ top: 0 }); }));
  const box = ctx.$("#f-body");
  ({ today: fToday, bible: fBible, prayer: fPrayer, journal: fJournal })[seg](ctx, box, F, L, es);
}

/* ---------- Today ---------- */
function fToday(ctx, box, F, L, es) {
  const { esc, num, state } = ctx, today = ymd();
  const [vref, vtext] = verseOfDay();
  const next = L.next, dow = new Date().getDay();
  const pr = F.prayer[today], grat = F.grat[today] || ["", "", ""];
  const trBtns = (k) => Object.keys(TRANSLATIONS).map((t) => `<a class="tr-chip ${t === F.tr ? "on" : ""}" href="${readUrl(k, t, F.app)}" target="_blank" rel="noopener">${t}</a>`).join("");
  box.innerHTML = `
    <div class="panel sys">
      <p class="sys-head">[ THE WORD ]</p>
      <div class="f-streaks">
        <div><b>${L.wordStreak}</b><small>Word streak</small></div>
        <div><b>${L.prayerStreak}</b><small>Prayer streak</small></div>
        <div><b>${L.pct < 10 ? L.pct.toFixed(1) : Math.round(L.pct)}%</b><small>of the Bible</small></div>
      </div>
    </div>

    <div class="panel votd">
      <div class="panel-tag">Verse of the day</div>
      <p class="votd-t">“${esc(vtext)}”</p>
      <p class="votd-r">— ${esc(vref)} <small>KJV</small></p>
      <div class="votd-a"><a class="tr-chip" href="${refUrl(vref, "NIV")}" target="_blank" rel="noopener">NIV</a><a class="tr-chip" href="${refUrl(vref, "RVR1960")}" target="_blank" rel="noopener">RVR1960</a>
        <button class="btn small" id="votd-mem">♥ Memorize</button></div>
    </div>

    <div class="panel reading">
      <div class="panel-tag">Today's chapter</div>
      ${next ? `<p class="label">${esc(PLANS[F.plan]?.name || "")} · pass ${F.pass} · ${L.passCount}/${TOTAL_CH}</p>
        <p class="rd-title">${esc(chName(next, es))}</p>
        <p class="muted small">${L.chToday >= L.goal ? `Today's reading is done ✓ (${L.chToday} ch). Keep going if you want.` : `${L.chToday}/${L.goal} chapter${L.goal > 1 ? "s" : ""} today · +${LXP.chapter} XP each`}</p>
        <p class="label" style="margin-top:12px">Open in</p>
        <div class="tr-row">${trBtns(next)}</div>
        <button class="btn primary wide-btn" id="rd-done">✓ I read ${esc(chName(next, es))}</button>`
      : `<p class="rd-title">You've read the whole Bible.</p><p class="muted">Every chapter, Genesis to Revelation. Start another pass whenever you're ready.</p>
        <button class="btn primary wide-btn" id="rd-pass">Start pass ${F.pass + 1}</button>`}
      ${L.chToday ? `<ul class="rd-today">${F.reads.filter((r) => r.d === today).map((r) => `<li><span>✓ ${esc(chName(r.k, es))}</span><button class="btn small" data-soap="${r.id}">${r.n ? "Edit journal" : "Journal"}</button></li>`).join("")}</ul>` : ""}
    </div>

    <div class="panel prayer">
      <div class="panel-tag">Prayer</div>
      <p class="label">Today's focus</p>
      <p class="pr-focus">${esc(PRAYER_FOCUS[dow])}</p>
      <details class="acts"><summary>Guide me (A.C.T.S.)</summary><ul>${ACTS.map(([a, b]) => `<li><b>${a[0]}</b><span><b>${a}</b> — ${b}</span></li>`).join("")}</ul></details>
      <div class="pr-timer">
        <div><p class="pr-clock" id="pr-clock">${F.ptimer ? "0:00" : pr ? `${pr.min || 0} min` : "—"}</p><p class="fine">${F.ptimer ? "Praying…" : pr ? "prayed today ✓" : "not yet today"}</p></div>
        <button class="btn ${F.ptimer ? "" : "primary"}" id="pr-start">${F.ptimer ? "■ Amen (stop)" : "▶ Start prayer timer"}</button>
      </div>
      <div class="pr-quick">${[5, 10, 15, 30].map((m) => `<button class="btn small" data-pm="${m}">+${m} min</button>`).join("")}</div>
      ${F.requests.filter((r) => !r.ans).length ? `<p class="fine">Praying for: ${F.requests.filter((r) => !r.ans).slice(0, 4).map((r) => esc(r.t)).join(" · ")}${F.requests.filter((r) => !r.ans).length > 4 ? " …" : ""}</p>` : ""}
    </div>

    <div class="panel">
      <div class="card-head"><div><h2>Thankful for</h2><p class="muted small">Three things from today · +${LXP.grat} XP</p></div>${L.thankfulToday ? `<span class="ok-dot">✓</span>` : ""}</div>
      <div class="grat">${[0, 1, 2].map((i) => `<input class="grat-in" data-i="${i}" maxlength="120" placeholder="${["Something small", "Someone", "Something God did"][i]}" value="${esc(grat[i] || "")}">`).join("")}</div>
      <label class="toggle church"><span>⛪ Church / worship today<small>+${LXP.church} XP</small></span><span class="switch"><input type="checkbox" id="church" ${F.church[today] ? "checked" : ""}><i></i></span></label>
    </div>

    <div class="panel">
      <div class="card-head"><h2>Your walk</h2></div>
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
  $("#votd-mem").onclick = () => addMemVerse(ctx, vref, vtext);
  $("#rd-done") && ($("#rd-done").onclick = () => markRead(ctx, next));
  $("#rd-pass") && ($("#rd-pass").onclick = () => { F.pass++; ctx.save(); ctx.render(); ctx.toast(`Pass ${F.pass} begins. Genesis 1, here we go.`); });
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
    ctx.save(); if (!had && g.some((x) => x)) { ctx.toast(`Thankful heart · +${LXP.grat} XP`); ctx.render(); }
  }));
  $("#church").onchange = (e) => { if (e.target.checked) F.church[ymd()] = 1; else delete F.church[ymd()]; ctx.save(); ctx.render(); if (e.target.checked) ctx.toast(`Worship logged · +${LXP.church} XP`); };
}

/* ---------- Bible map ---------- */
function fBible(ctx, box, F, L, es) {
  const { esc } = ctx;
  const ot = BOOKS.filter((b) => !b.nt), nt = BOOKS.filter((b) => b.nt);
  const tile = (b) => { const n = L.bookCh[b.id] || 0, p = n / b.ch; return `<button class="bk ${p >= 1 ? "done" : n ? "some" : ""}" data-b="${b.id}"><i style="height:${p * 100}%"></i><span>${esc(bookName(b.id, es))}</span><small>${n}/${b.ch}</small></button>`; };
  box.innerHTML = `
    <div class="panel">
      <div class="card-head"><div><h2>The whole Bible</h2><p class="muted small">${L.totalCh} of ${TOTAL_CH} chapters · ${L.booksDone} of 66 books</p></div></div>
      <p class="label">Old Testament · ${L.otCh}/929</p><div class="bar"><div class="bar-fill" style="width:${(L.otCh / 929) * 100}%"></div></div>
      <p class="label" style="margin-top:10px">New Testament · ${L.ntCh}/260</p><div class="bar"><div class="bar-fill" style="width:${(L.ntCh / 260) * 100}%"></div></div>
      <p class="fine">Tap a book to mark chapters you've read (even before you had this app).</p>
    </div>
    <details class="panel rd-settings"><summary><b>Reading plan & translation</b><small>${esc(PLANS[F.plan].name)} · ${F.goal}/day · ${F.tr}</small></summary>
      <p class="label">Plan</p>
      <div class="plan-opts">${Object.entries(PLANS).map(([k, p]) => `<button class="plan-opt ${F.plan === k ? "on" : ""}" data-p="${k}"><b>${esc(p.name)}</b><small>${esc(p.sub)}</small></button>`).join("")}</div>
      <p class="label">Chapters a day</p>
      <div class="seg" id="goal-seg">${[1, 2, 3, 4, 5].map((n) => `<button data-g="${n}" class="${F.goal === n ? "on" : ""}">${n}</button>`).join("")}</div>
      <p class="label">Main translation</p>
      <div class="seg" id="tr-seg">${Object.keys(TRANSLATIONS).map((t) => `<button data-t="${t}" class="${F.tr === t ? "on" : ""}">${t}</button>`).join("")}</div>
      <p class="fine">${esc(TRANSLATIONS[F.tr].name)}. You can still open any chapter in the other two.</p>
      <p class="label">Open chapters in</p>
      <div class="seg" id="app-seg"><button data-a="bg" class="${F.app !== "yv" ? "on" : ""}">Bible Gateway</button><button data-a="yv" class="${F.app === "yv" ? "on" : ""}">YouVersion app</button></div>
      <label class="toggle"><span>Spanish book names<small>Génesis, Juan, Salmos…</small></span><span class="switch"><input type="checkbox" id="es-names" ${es ? "checked" : ""}><i></i></span></label>
    </details>
    <div class="panel"><p class="label">Antiguo · Old Testament</p><div class="bk-grid">${ot.map(tile).join("")}</div>
      <p class="label" style="margin-top:14px">Nuevo · New Testament</p><div class="bk-grid">${nt.map(tile).join("")}</div></div>`;
  box.querySelectorAll(".plan-opt").forEach((b) => (b.onclick = () => { F.plan = b.dataset.p; ctx.save(); ctx.render(); ctx.toast(`Plan: ${PLANS[F.plan].name}`); }));
  box.querySelectorAll("#goal-seg button").forEach((b) => (b.onclick = () => { F.goal = +b.dataset.g; ctx.save(); ctx.render(); }));
  box.querySelectorAll("#tr-seg button").forEach((b) => (b.onclick = () => { F.tr = b.dataset.t; if (F.es == null) F.es = null; ctx.save(); ctx.render(); }));
  box.querySelectorAll("#app-seg button").forEach((b) => (b.onclick = () => { F.app = b.dataset.a; ctx.save(); ctx.render(); }));
  box.querySelector("#es-names").onchange = (e) => { F.es = e.target.checked; ctx.save(); ctx.render(); };
  box.querySelector(".rd-settings").open = !!renderFaith._open;
  box.querySelector(".rd-settings").ontoggle = (e) => (renderFaith._open = e.target.open);
  box.querySelectorAll(".bk").forEach((b) => (b.onclick = () => openBook(ctx, b.dataset.b)));
}

function openBook(ctx, id) {
  const F = ctx.state.faith, es = esNames(F), b = BOOK[id], { esc } = ctx;
  const draw = (f) => {
    const read = new Set(F.reads.map((r) => r.k));
    f.querySelector("#ch-grid").innerHTML = Array.from({ length: b.ch }, (_, i) => `<button type="button" class="ch ${read.has(`${id}.${i + 1}`) ? "on" : ""}" data-c="${i + 1}">${i + 1}</button>`).join("");
    f.querySelector("#ch-n").textContent = `${[...read].filter((k) => k.startsWith(id + ".")).length}/${b.ch} read`;
    f.querySelectorAll(".ch").forEach((c) => (c.onclick = () => {
      const k = `${id}.${c.dataset.c}`;
      if (read.has(k)) { if (!confirm(`Unmark ${chName(k, es)}?`)) return; const i = F.reads.map((r) => r.k).lastIndexOf(k); F.reads.splice(i, 1); }
      else F.reads.push({ id: uid(), k, d: ymd(), p: F.pass });
      ctx.save(); draw(f);
    }));
  };
  ctx.openSheet(`<h2>${esc(bookName(id, es))}</h2><p class="muted small" id="ch-n"></p>
    <div class="ch-grid" id="ch-grid"></div>
    <div class="sheet-row"><button type="button" class="btn" id="ch-all">Mark whole book read</button><a class="btn" href="${readUrl(`${id}.1`, F.tr, F.app)}" target="_blank" rel="noopener">Open ch. 1 (${F.tr})</a></div>
    <button value="close" class="btn primary">Done</button>`, (f) => {
    draw(f);
    f.querySelector("#ch-all").onclick = () => {
      const read = new Set(F.reads.map((r) => r.k));
      for (let c = 1; c <= b.ch; c++) if (!read.has(`${id}.${c}`)) F.reads.push({ id: uid(), k: `${id}.${c}`, d: ymd(), p: F.pass });
      ctx.save(); draw(f);
    };
  }, () => ctx.render());
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
      ctx.save(); ctx.render(); ctx.toast(`Answered prayer · +${LXP.answered} XP`);
    });
  }));
  box.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => { if (!confirm("Remove this request?")) return; F.requests = F.requests.filter((x) => x.id !== b.dataset.del); ctx.save(); ctx.render(); }));
  box.querySelectorAll("[data-un]").forEach((b) => (b.onclick = () => { const r = F.requests.find((x) => x.id === b.dataset.un); r.ans = null; delete r.note; ctx.save(); ctx.render(); }));
}

/* ---------- Journal + memory verses ---------- */
function fJournal(ctx, box, F, L, es) {
  const { esc, md } = ctx, today = ymd();
  const due = F.mem.filter((m) => m.due <= today && (m.box || 0) < 6);
  const notes = F.reads.filter((r) => r.n).sort((a, b) => b.d.localeCompare(a.d));
  const recent = F.reads.filter((r) => !r.n).sort((a, b) => b.d.localeCompare(a.d)).slice(0, 5);
  box.innerHTML = `
    <div class="panel">
      <div class="card-head"><div><h2>Memory verses</h2><p class="muted small">${F.mem.length} verses · ${L.memMastered} known by heart · ${due.length} due</p></div>
        <button class="btn small" id="mv-add">+ Add</button></div>
      ${due.length ? `<button class="btn primary wide-btn" id="mv-review">Review ${due.length} verse${due.length > 1 ? "s" : ""}</button>` : F.mem.length ? `<p class="fine">Nothing due — come back tomorrow.</p>` : ""}
      ${F.mem.length ? `<ul class="mv-verses">${F.mem.map((m) => `<li><div><b>${esc(m.ref)}</b><small>${esc((m.text || "").slice(0, 80))}${(m.text || "").length > 80 ? "…" : ""}</small></div>
        <span class="dots">${[1, 2, 3, 4, 5].map((i) => `<i class="${(m.box || 0) >= i ? "on" : ""}"></i>`).join("")}</span><button class="del" data-mdel="${m.id}" aria-label="Remove">×</button></li>`).join("")}</ul>`
        : `<p class="muted">Tap ♥ Memorize on the verse of the day, or add your own. Five reviews spaced out over a month and it's yours.</p>`}
    </div>
    <div class="panel">
      <div class="card-head"><div><h2>Journal</h2><p class="muted small">Your SOAP notes · ${notes.length} entries</p></div></div>
      ${recent.length ? `<p class="label">Write about a recent chapter</p><div class="chip-row">${recent.map((r) => `<button class="chip" data-soap="${r.id}">${esc(chName(r.k, es))}</button>`).join("")}</div>` : ""}
      ${notes.length ? `<ul class="soap-list">${notes.map((r) => `<li data-soap="${r.id}"><p class="label">${esc(chName(r.k, es))} · ${md(r.d)}</p>
        ${r.n.s ? `<p><b>S</b> ${esc(r.n.s)}</p>` : ""}${r.n.o ? `<p><b>O</b> ${esc(r.n.o)}</p>` : ""}${r.n.a ? `<p><b>A</b> ${esc(r.n.a)}</p>` : ""}${r.n.p ? `<p><b>P</b> ${esc(r.n.p)}</p>` : ""}</li>`).join("")}</ul>`
        : `<p class="muted">After you read, jot down one verse, what it means, how to live it and a short prayer.</p>`}
    </div>`;
  box.querySelectorAll("[data-soap]").forEach((b) => (b.onclick = () => openSoap(ctx, b.dataset.soap)));
  box.querySelectorAll("[data-mdel]").forEach((b) => (b.onclick = () => { if (!confirm("Remove this verse?")) return; F.mem = F.mem.filter((m) => m.id !== b.dataset.mdel); ctx.save(); ctx.render(); }));
  box.querySelector("#mv-add").onclick = () => ctx.openSheet(`<h2>Add a verse</h2>
    <label>Reference<input type="text" id="mv-ref" placeholder="e.g. Romans 8:28"></label>
    <label>Text (${esc(F.tr)})<textarea id="mv-text" rows="4" placeholder="Type or paste the verse"></textarea></label>
    <p class="fine">Need the words? <a href="#" id="mv-look">Look it up in ${esc(F.tr)}</a>, copy it, and paste it here.</p>
    <div class="sheet-row"><button value="cancel" class="btn">Cancel</button><button value="save" class="btn primary">Add</button></div>`, (f) => {
    f.querySelector("#mv-look").onclick = (e) => { e.preventDefault(); const r = f.querySelector("#mv-ref").value.trim(); if (r) window.open(refUrl(r, F.tr), "_blank"); };
  }, (rv) => {
    if (rv !== "save") return;
    const ref = document.getElementById("mv-ref").value.trim(), text = document.getElementById("mv-text").value.trim();
    if (ref) addMemVerse(ctx, ref, text);
  });
  box.querySelector("#mv-review") && (box.querySelector("#mv-review").onclick = () => review(ctx, due));
}

function review(ctx, list) {
  const F = ctx.state.faith, { esc } = ctx;
  let i = 0, known = 0;
  const step = (f) => {
    if (i >= list.length) { f.innerHTML = `<h2>Done ✓</h2><p class="muted">${known}/${list.length} from memory. They'll come back on a spaced schedule.</p><button value="close" class="btn primary">Close</button>`; return; }
    const m = list[i];
    f.innerHTML = `<p class="label">${i + 1} of ${list.length}</p><h2>${esc(m.ref)}</h2>
      <p class="muted small">Say it out loud from memory, then check.</p>
      <div class="mv-card" id="mv-card"><span>Tap to reveal</span></div>
      <div class="sheet-row" id="mv-btns" hidden><button type="button" class="btn" id="mv-again">Not yet</button><button type="button" class="btn primary" id="mv-got">Got it</button></div>
      <button value="close" class="btn ghost">Stop</button>`;
    f.querySelector("#mv-card").onclick = (e) => { e.currentTarget.innerHTML = `<p>${esc(m.text || "(no text saved — edit by re-adding)")}</p>`; f.querySelector("#mv-btns").hidden = false; };
    f.querySelector("#mv-got").onclick = () => { m.box = Math.min(6, (m.box || 0) + 1); m.due = addDays(ymd(), GAPS[m.box]); known++; i++; ctx.save(); if (m.box === 5) ctx.toast(`${esc(m.ref)} — hidden in your heart · +${LXP.verse} XP`); step(f); };
    f.querySelector("#mv-again").onclick = () => { m.box = Math.max(0, Math.min(1, (m.box || 0))); m.due = addDays(ymd(), 1); i++; ctx.save(); step(f); };
  };
  ctx.openSheet("", step, () => ctx.render());
}
