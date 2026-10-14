// 75 Hard — no restarts. Miss a task and the System hands you a Penalty Quest instead.
import { ymd, addDays, between, parse } from "./engine.js";
import { HARD_TASKS, DEFAULT_PENALTIES, LXP, penaltyFor, uid } from "./life.js";

/* ---------- progress photos live in IndexedDB (too big for localStorage) ---------- */
let dbp = null;
const db = () => (dbp ||= new Promise((res) => { try { const r = indexedDB.open("arise-photos", 1); r.onupgradeneeded = () => r.result.createObjectStore("p"); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }));
const idb = async (mode, fn) => { const d = await db(); if (!d) return null; return new Promise((res) => { const tx = d.transaction("p", mode), st = tx.objectStore("p"); const rq = fn(st); tx.oncomplete = () => res(rq?.result ?? null); tx.onerror = () => res(null); }); };
export const photoPut = (k, v) => idb("readwrite", (s) => s.put(v, k));
export const photoGet = (k) => idb("readonly", (s) => s.get(k));
export const photoDel = (k) => idb("readwrite", (s) => s.delete(k));
async function shrink(file, max = 720) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.72);
}

export const penText = (state, p) => { const P = penaltyFor(state, p.task); return `${P.n * (p.late && !p.paid ? 2 : 1)} ${P.what}${P.plus ? ` ${P.plus}` : ""}`; };
const taskName = (id) => HARD_TASKS.find((t) => t.id === id)?.n.split(" · ")[0] || id;

// called before every render: announce new penalty quests once
export function hardCheck(ctx) {
  const H = ctx.state.hard, debt = ctx.G.life.hard.debt;
  const fresh = debt.filter((p) => !H.ack.includes(p.key));
  if (!fresh.length) return;
  H.ack = [...new Set([...H.ack.filter((k) => debt.some((p) => p.key === k)), ...fresh.map((p) => p.key)])];
  ctx.save();
  ctx.popup(`<p class="ov-k pen">[ SYSTEM ]</p><div class="ov-icon">⛓️</div><h2 class="ov-h pen">PENALTY QUEST</h2>
    <p class="ov-p">You missed ${fresh.length === 1 ? "a task" : `${fresh.length} tasks`}. The challenge does <b>not</b> restart — you pay it back instead.</p>
    <ul class="ov-pen">${fresh.slice(0, 4).map((p) => `<li><b>${ctx.esc(taskName(p.task))}</b> · ${ctx.md(p.d)}<br>→ ${ctx.esc(penText(ctx.state, p))}</li>`).join("")}</ul>
    ${fresh.length > 4 ? `<p class="ov-p">…and ${fresh.length - 4} more in the Penalty Zone (75 tab).</p>` : ""}
    <p class="ov-gold">Clear it by the end of tomorrow, or it doubles.</p>`);
}

let showSettings = false, showAllPen = false;
export function renderHard(ctx) {
  const v = ctx.$("#view-hard"), { state, G, esc, md } = ctx, H = state.hard, X = G.life.hard, today = ymd();
  const cur = X.cur;
  if (!cur) { v.innerHTML = intro(ctx, X); bindIntro(ctx, v); return; }
  if (cur.over) { v.innerHTML = finished(ctx, cur); bindFinished(ctx, v, cur); return; }

  const ts = X.today, done = HARD_TASKS.filter((t) => ts[t.id].ok).length, L = H.log[today] || {};
  const pages = X.hardPages(today), water = L.water || 0, oz = H.oz || 128, cmin = X.cardioMin(today);
  const grid = [...Array(75)].map((_, i) => {
    const d = addDays(cur.start, i);
    if (d > today) return `<i class="hd future" data-d="${d}">${i + 1}</i>`;
    const t = X.taskState(d), ok = HARD_TASKS.every((k) => t[k.id].ok);
    if (d === today) return `<i class="hd today ${ok ? "perfect" : ""}" data-d="${d}">${i + 1}</i>`;
    const pens = cur.pens.filter((p) => p.d === d);
    return `<i class="hd ${ok ? "perfect" : pens.every((p) => p.paid) ? "paid" : "owed"}" data-d="${d}">${i + 1}</i>`;
  }).join("");
  const row = (t) => {
    const s = ts[t.id];
    let extra = "";
    if (t.id === "water") extra = `<div class="wt-row"><div class="bar"><div class="bar-fill water" style="width:${Math.min(100, (water / oz) * 100)}%"></div></div><span>${water}/${oz} oz</span></div>
      <div class="pr-quick">${[8, 16, 24, 32].map((n) => `<button class="btn small" data-oz="${n}">+${n}</button>`).join("")}<button class="btn small ghost" data-oz="-8">−8</button></div>`;
    if (t.id === "read") extra = `<p class="fine">${pages}/10 pages counted${H.bibleCounts && G.life.faith.chToday ? ` · Bible ${G.life.faith.chToday} ch = ${G.life.faith.chToday * (H.pageCh || 3)}` : ""}${G.life.books.nonficByDay?.[today] ? ` · books ${G.life.books.nonficByDay[today]}` : ""}</p>
      <div class="pr-quick"><button class="btn small" data-pg="5">+5 pages</button><button class="btn small" data-pg="10">+10 pages</button><button class="btn small" data-go="books">Log in Books</button></div>`;
    if (t.id === "w1" && !s.ok) extra = `<div class="pr-quick"><button class="btn small" data-go="train">Go to today's training</button></div>`;
    if (t.id === "w2") extra = `<p class="fine">${cmin ? `${Math.round(cmin)} min logged today` : "Log a 45-minute walk or run"}</p>${s.ok ? "" : `<div class="pr-quick"><button class="btn small" data-go="walk">Log a walk</button></div>`}`;
    if (t.id === "photo") extra = `<div class="pr-quick"><label class="btn small file-btn">📷 ${L.photo ? "Retake" : "Take photo"}<input type="file" accept="image/*" capture="user" data-photo hidden></label></div>`;
    const tap = !s.auto && t.id !== "water" && t.id !== "read";
    return `<li class="${s.ok ? "ok" : ""}"><div class="ht-top" ${tap ? `data-t="${t.id}"` : ""}><span class="q-box">${s.ok ? "✓" : ""}</span><span class="ht-i">${t.icon}</span>
      <div class="ht-n"><b>${esc(t.n)}</b>${s.auto ? `<small class="auto">auto-checked from your logs</small>` : t.sub ? `<small>${esc(t.sub)}</small>` : ""}</div></div>${extra}</li>`;
  };

  v.innerHTML = `
    <div class="panel sys hard-hero">
      <p class="sys-head">[ 75 HARD · ROUND ${X.rounds.length} ]</p>
      <div class="hh-row">
        <div class="hh-day"><small>DAY</small><b>${cur.dayN}</b><small>of 75</small></div>
        <div class="hh-stats"><div><b>${cur.perfect}</b><small>perfect</small></div><div><b>${cur.cleared}</b><small>cleared</small></div><div class="${X.debt.length ? "red" : ""}"><b>${X.debt.length}</b><small>owed</small></div></div>
      </div>
      <div class="bar big"><div class="bar-fill" style="width:${(cur.dayN / 75) * 100}%"></div></div>
      <p class="fine">Missing a task never resets you — it becomes a penalty quest. ${done}/7 done today.</p>
    </div>

    ${X.debt.length ? `<div class="panel pen-zone">
      <p class="sys-head">[ PENALTY ZONE ]</p>
      <ul class="pen-list">${X.debt.sort((a, b) => a.d.localeCompare(b.d)).slice(0, showAllPen ? 999 : 4).map((p) => `<li class="${p.late ? "late" : ""}"><div><b>${esc(penText(state, p))}</b>
        <small>Day ${between(cur.start, p.d) + 1} · missed ${esc(taskName(p.task))} · ${p.late ? "OVERDUE — doubled" : `due by end of ${md(p.due)}`}</small></div>
        <button class="btn small" data-pay="${p.key}">Paid ✓</button></li>`).join("")}</ul>
      ${X.debt.length > 4 ? `<button class="btn small ghost wide-btn" id="pen-all">${showAllPen ? "Show less" : `Show all ${X.debt.length}`}</button>` : ""}
      <p class="fine">+${LXP.penaltyPaid} XP for every penalty you pay off.</p>
    </div>` : ""}

    <div class="panel">
      <div class="card-head"><div><h2>Today · Day ${cur.dayN}</h2><p class="muted small">+${LXP.hardTask} XP a task · +${LXP.hardPerfect} for a perfect day</p></div><span class="hh-pct">${done}/7</span></div>
      <ul class="hard-list">${HARD_TASKS.map(row).join("")}</ul>
    </div>

    <div class="panel">
      <div class="card-head"><h2>The 75</h2><span class="muted small">tap a day to fix it</span></div>
      <div class="hd-grid">${grid}</div>
      <p class="fine"><span class="lg perfect"></span>perfect <span class="lg paid"></span>penalty paid <span class="lg owed"></span>owed</p>
    </div>

    <div class="panel" id="ph-panel"><div class="card-head"><h2>Progress photos</h2><span class="muted small" id="ph-n"></span></div><div id="ph-body"><p class="muted small">Loading…</p></div></div>

    <details class="panel hard-set" ${showSettings ? "open" : ""}><summary><b>Penalties & rules</b><small>edit what a missed task costs</small></summary>
      ${HARD_TASKS.map((t) => { const P = penaltyFor(state, t.id); return `<div class="pen-edit" data-t="${t.id}"><p class="label">${t.icon} ${esc(taskName(t.id))}</p>
        <div class="pe-row"><input type="number" class="pe-n" min="0" max="2000" value="${P.n}"><input class="pe-w" value="${esc(P.what)}"></div><input class="pe-p" value="${esc(P.plus || "")}" placeholder="and…"></div>`; }).join("")}
      <button class="btn small ghost" id="pe-reset">Reset penalties to default</button>
      <label class="toggle"><span>Bible chapters count toward the 10 pages<small>each chapter counts as ${H.pageCh || 3} pages</small></span><span class="switch"><input type="checkbox" id="h-bible" ${H.bibleCounts ? "checked" : ""}><i></i></span></label>
      <div class="sheet-row"><label class="lbl">Water goal (oz)<input type="number" id="h-oz" value="${oz}" min="32" max="200"></label><label class="lbl">Pages per chapter<input type="number" id="h-pc" value="${H.pageCh || 3}" min="1" max="10"></label></div>
      <button class="btn" id="h-save">Save rules</button>
      <button class="btn ghost danger" id="h-end">End this round early</button>
    </details>`;

  const q = (s) => v.querySelector(s), qa = (s) => v.querySelectorAll(s);
  const log = (d = today) => (H.log[d] ||= {});
  qa("[data-t]").forEach((el) => (el.onclick = () => { const L2 = log(); L2[el.dataset.t] = !L2[el.dataset.t] || undefined; if (!L2[el.dataset.t]) delete L2[el.dataset.t]; ctx.save(); ctx.render(); }));
  qa("[data-oz]").forEach((b) => (b.onclick = () => { const L2 = log(); L2.water = Math.max(0, (L2.water || 0) + +b.dataset.oz); ctx.save(); ctx.render(); if (L2.water >= oz && L2.water - +b.dataset.oz < oz) ctx.toast("Gallon done 💧"); }));
  qa("[data-pg]").forEach((b) => (b.onclick = () => { const L2 = log(); L2.pages = (L2.pages || 0) + +b.dataset.pg; ctx.save(); ctx.render(); }));
  qa("[data-go]").forEach((b) => (b.onclick = () => { const g = b.dataset.go; if (g === "train") ctx.goTrain("workout"); else if (g === "walk") ctx.goTrain("cardio", "walk"); else ctx.show(g); }));
  qa("[data-pay]").forEach((b) => (b.onclick = () => { H.paid[b.dataset.pay] = today; ctx.save(); ctx.toast(`Penalty paid · +${LXP.penaltyPaid} XP`); ctx.render(); }));
  q("#pen-all") && (q("#pen-all").onclick = () => { showAllPen = !showAllPen; renderHard(ctx); });
  const ph = q("[data-photo]");
  ph.onchange = async () => {
    const f = ph.files[0]; if (!f) return;
    try { await photoPut(today, await shrink(f)); log().photo = true; ctx.save(); ctx.toast("Progress photo saved 📸"); ctx.render(); } catch { ctx.toast("Couldn't read that photo"); }
  };
  qa(".hd:not(.future)").forEach((c) => (c.onclick = () => openDay(ctx, c.dataset.d, cur)));
  q(".hard-set").ontoggle = (e) => (showSettings = e.target.open);
  q("#pe-reset").onclick = () => { H.pen = null; ctx.save(); ctx.render(); ctx.toast("Penalties reset"); };
  q("#h-save").onclick = () => {
    const pen = {};
    qa(".pen-edit").forEach((el) => { pen[el.dataset.t] = { n: Math.max(0, parseInt(el.querySelector(".pe-n").value) || 0), what: el.querySelector(".pe-w").value.trim() || "push-ups", plus: el.querySelector(".pe-p").value.trim() }; });
    H.pen = pen; H.bibleCounts = q("#h-bible").checked;
    H.oz = Math.min(200, Math.max(32, parseInt(q("#h-oz").value) || 128)); H.pageCh = Math.min(10, Math.max(1, parseInt(q("#h-pc").value) || 3));
    ctx.save(); ctx.render(); ctx.toast("Rules saved");
  };
  q("#h-end").onclick = () => { if (!confirm("End this round now? Your days and penalties stay in your history.")) return; H.rounds.at(-1).done = today; ctx.save(); ctx.render(); };
  drawPhotos(ctx, cur);
}

async function drawPhotos(ctx, r) {
  const body = document.getElementById("ph-body"); if (!body) return;
  const days = r.days.filter((d) => ctx.state.hard.log[d]?.photo);
  const pics = (await Promise.all(days.map(async (d) => [d, await photoGet(d)]))).filter(([, p]) => p);
  document.getElementById("ph-n") && (document.getElementById("ph-n").textContent = `${pics.length} saved`);
  if (!pics.length) { body.innerHTML = `<p class="muted small">Take one a day. On day 75 you'll slide between day 1 and today.</p>`; return; }
  const [d0, p0] = pics[0], [d1, p1] = pics.at(-1);
  body.innerHTML = `${pics.length > 1 ? `<div class="ba"><img src="${p1}" alt="Latest"><div class="ba-top" id="ba-top"><img src="${p0}" alt="First"></div><input type="range" id="ba-r" min="0" max="100" value="50"><span class="ba-l">Day ${between(r.start, d0) + 1}</span><span class="ba-r">Day ${between(r.start, d1) + 1}</span></div>` : ""}
    <div class="ph-strip">${pics.map(([d, p]) => `<figure><img src="${p}" alt=""><figcaption>Day ${between(r.start, d) + 1}</figcaption></figure>`).join("")}</div>
    <p class="fine">Photos stay on this phone only and aren't in your backup file.</p>`;
  const rg = document.getElementById("ba-r");
  if (rg) { const set = () => (document.getElementById("ba-top").style.clipPath = `inset(0 ${100 - rg.value}% 0 0)`); rg.oninput = set; set(); }
}

function openDay(ctx, d, r) {
  const { state, G, esc, wmd } = ctx, H = state.hard, X = G.life.hard;
  const draw = (f) => {
    const ts = X.taskState(d), L = H.log[d] || {};
    f.innerHTML = `<h2>Day ${between(r.start, d) + 1} · ${esc(wmd(d))}</h2>
      <p class="muted small">Forgot to check something off? Fix it here. Paid penalties stay paid.</p>
      <ul class="hard-list sm">${HARD_TASKS.map((t) => `<li class="${ts[t.id].ok ? "ok" : ""}"><div class="ht-top" ${ts[t.id].auto || t.id === "water" || t.id === "read" ? "" : `data-t="${t.id}"`}><span class="q-box">${ts[t.id].ok ? "✓" : ""}</span><span class="ht-i">${t.icon}</span><div class="ht-n"><b>${esc(t.n)}</b>${ts[t.id].auto ? `<small class="auto">auto</small>` : ""}</div></div></li>`).join("")}</ul>
      <div class="sheet-row"><label>Water (oz)<input type="number" id="dw" value="${L.water || 0}"></label><label>Extra pages<input type="number" id="dp" value="${L.pages || 0}"></label></div>
      <button value="close" class="btn primary">Done</button>`;
    f.querySelectorAll("[data-t]").forEach((el) => (el.onclick = () => { const L2 = (H.log[d] ||= {}); if (L2[el.dataset.t]) delete L2[el.dataset.t]; else L2[el.dataset.t] = true; ctx.save(); ctx.G.life.hard = ctx.G.life.hard; draw(f); }));
    f.querySelector("#dw").onchange = (e) => { (H.log[d] ||= {}).water = Math.max(0, +e.target.value || 0); ctx.save(); };
    f.querySelector("#dp").onchange = (e) => { (H.log[d] ||= {}).pages = Math.max(0, +e.target.value || 0); ctx.save(); };
  };
  // taskState reads live state, so redraws reflect edits immediately
  ctx.openSheet("", draw, () => ctx.render());
}

/* ---------- start / finish ---------- */
function intro(ctx, X) {
  const { esc, md } = ctx;
  return `<div class="panel sys"><p class="sys-head">[ 75 HARD ]</p><p class="sys-sub">75 days. 7 tasks a day. No restarts — but the System keeps score.</p>
      <ul class="hard-rules">${HARD_TASKS.map((t) => `<li><span>${t.icon}</span>${esc(t.n)}</li>`).join("")}</ul></div>
    <div class="panel pen-zone soft"><p class="sys-head">[ HOW PENALTIES WORK ]</p>
      <p class="muted small">Miss a task and the day doesn't reset your challenge. Instead you get a <b>Penalty Quest</b> — like ${esc(penText(ctx.state, { task: "w1" }))} for a missed workout. Pay it off by the end of the next day or it <b>doubles</b>. Unpaid penalties sit in the Penalty Zone on your Status screen until you clear them.</p>
      <p class="fine">Penalties are push-ups and walks only — nothing that breaks your back's hard limits. You can change them once you start.</p></div>
    <div class="panel"><h2>Start a round</h2>
      <label class="lbl">Day 1 is<input type="date" id="h-start" value="${ymd()}"></label>
      <button class="btn primary wide-btn" id="h-go">⚔️ Begin 75 Hard</button></div>
    ${X.rounds.length ? `<div class="panel"><h2>Past rounds</h2><ul class="rq-list">${X.rounds.map((r, i) => `<li><div><b>Round ${i + 1}</b><small>${md(r.start)} – ${md(r.days.at(-1) || r.start)} · ${r.cleared} cleared · ${r.perfect} perfect · ${r.pens.length} penalties</small></div></li>`).join("")}</ul></div>` : ""}`;
}
function bindIntro(ctx, v) {
  v.querySelector("#h-go").onclick = () => {
    const s = v.querySelector("#h-start").value || ymd();
    ctx.state.hard.rounds.push({ id: uid(), start: s });
    ctx.save(); ctx.render();
    ctx.popup(`<p class="ov-k">[ SYSTEM ]</p><div class="ov-icon">🔥</div><h2 class="ov-h">75 HARD BEGINS</h2><p class="ov-p">Day 1 starts ${ctx.esc(ctx.wmd(s))}. Seven tasks a day. Missed tasks become penalty quests — never a restart.</p>`);
  };
}
function finished(ctx, r) {
  const owed = r.pens.filter((p) => !p.paid).length;
  return `<div class="panel sys"><p class="sys-head">[ ROUND COMPLETE ]</p>
    <div class="ov-icon">🔥</div><h2 class="center">You finished 75 days.</h2>
    <div class="hh-stats wide"><div><b>${r.perfect}</b><small>perfect</small></div><div><b>${r.cleared}</b><small>cleared</small></div><div><b>${Math.round((r.cleared / 75) * 100)}%</b><small>completion</small></div><div><b>${r.pens.filter((p) => p.paid).length}</b><small>penalties paid</small></div></div>
    ${owed ? `<p class="fine center">${owed} penalties were left unpaid. They stay on the record.</p>` : ""}
    <button class="btn primary wide-btn" id="h-close">Close the round</button></div>`;
}
function bindFinished(ctx, v, r) {
  v.querySelector("#h-close").onclick = () => { ctx.state.hard.rounds.at(-1).done = r.end; ctx.save(); ctx.render(); };
}
