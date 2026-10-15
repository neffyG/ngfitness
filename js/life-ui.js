// Status-screen hub, habits and the weekly System report.
import { ymd, addDays, weekStart, parse, between } from "./engine.js";
import { LXP, LINKS, DEFAULT_HABITS, habitList, weekSummary, uid } from "./life.js";
import { chName } from "./bible.js";
import { esNames } from "./faith.js";
import { hardCheck } from "./hard-ui.js";

const DOW = ["S", "M", "T", "W", "T", "F", "S"];

/* =========================================================
   Status hub (homeTop)
   ========================================================= */
export function homeTop(ctx) {
  const { state, G, esc } = ctx, L = G.life, F = L.faith, X = L.hard, today = ymd();
  const book = L.books.reading[0];
  const hs = L.habits.stats.filter((s) => s.sched);
  const lastWeek = addDays(weekStart(today), -7);
  const reportNew = state.life.reportSeen !== lastWeek && (state.weights.length || state.faith.reads.length || state.cardio.length);
  const prog = X.today ? Object.values(X.today).filter((t) => t.ok).length : 0;
  return `
    ${X.debt.length ? `<button class="panel pen-zone pz-banner" data-nav="hard"><p class="sys-head">[ PENALTY ZONE ]</p>
      <p>${X.debt.length} penalty quest${X.debt.length > 1 ? "s" : ""} owed${X.debt.some((p) => p.late) ? " · some are OVERDUE" : ""}. Clear them to get out.</p></button>` : ""}
    ${reportNew ? `<button class="panel sys report-banner" id="rep-open"><p class="sys-head">[ WEEKLY REPORT READY ]</p><p>Your grade for last week is in. Tap to see it.</p></button>` : ""}
    <div class="life-grid">
      <button class="lg-tile" data-nav="faith"><span class="lg-i">✝️</span><b>The Word</b><small>${F.chToday >= F.goal ? `✓ ${F.chToday} ch today` : F.next ? esc(chName(F.next, esNames(state.faith))) : "Pass complete"}</small>${F.wordStreak ? `<em>${F.wordStreak}🔥</em>` : ""}</button>
      <button class="lg-tile" data-nav="faith"><span class="lg-i">🙏</span><b>Prayer</b><small>${F.prayedToday ? `✓ ${state.faith.prayer[today].min || 0} min` : "Not yet today"}</small>${F.prayerStreak ? `<em>${F.prayerStreak}🔥</em>` : ""}</button>
      <button class="lg-tile ${X.debt.length ? "red" : ""}" data-nav="hard"><span class="lg-i">🔥</span><b>75 Hard</b><small>${X.cur && !X.cur.over ? `Day ${X.cur.dayN} · ${prog}/7` : X.cur ? "Round complete" : "Not started"}</small></button>
      <button class="lg-tile" data-nav="books"><span class="lg-i">📚</span><b>Reading</b><small>${book ? `${esc(book.t.length > 22 ? book.t.slice(0, 21) + "…" : book.t)} · ${book.pages ? Math.round(((book.page || 0) / book.pages) * 100) : 0}%` : "Pick a book"}</small>${L.books.readStreak ? `<em>${L.books.readStreak}🔥</em>` : ""}</button>
    </div>
    <div class="panel habits-panel">
      <div class="card-head"><div><h2>Habits</h2><p class="muted small">${hs.filter((s) => s.todayDone).length}/${hs.length} today · +${LXP.habitsAll} XP when they're all done</p></div><button class="btn small" data-nav="habits">Manage</button></div>
      <ul class="hb-list">${hs.map((s) => habitRow(ctx, s)).join("")}</ul>
      <button class="btn ghost wide-btn" id="rep-btn">📜 Weekly System report</button>
    </div>`;
}
function habitRow(ctx, s) {
  const { esc } = ctx, h = s.h;
  const count = !h.link && h.kind === "count";
  return `<li class="${s.todayDone ? "ok" : ""}" data-h="${h.id}"><span class="q-box">${s.todayDone ? "✓" : ""}</span><span class="hb-i">${esc(h.icon || "•")}</span>
    <span class="hb-n"><b>${esc(h.n)}</b><small>${h.link ? "auto" : count ? `${s.todayVal}/${s.target} ${esc(h.unit || "")}` : ""}${s.cur ? `${h.link || count ? " · " : ""}${s.cur}-day streak` : ""}</small></span>
    ${count ? `<button class="btn small" data-plus="${h.id}">+1</button>` : ""}</li>`;
}
export function bindHome(ctx) {
  const v = ctx.$("#view-home"), { state } = ctx;
  v.querySelectorAll("[data-nav]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); ctx.show(b.dataset.nav); }));
  const open = () => { repWeek = addDays(weekStart(ymd()), -7); state.life.reportSeen = repWeek; ctx.save(); ctx.show("report"); };
  v.querySelector("#rep-open") && (v.querySelector("#rep-open").onclick = open);
  v.querySelector("#rep-btn").onclick = () => { repWeek = weekStart(ymd()); ctx.show("report"); };
  v.querySelectorAll(".hb-list li").forEach((li) => (li.onclick = () => {
    const h = habitList(state).find((x) => x.id === li.dataset.h);
    if (h.link) { ctx.show({ prayer: "faith", bible: "faith", grat: "faith", pages: "books", water: "hard", train: "train" }[h.link]); return; }
    toggleHabit(ctx, h);
  }));
  v.querySelectorAll("[data-plus]").forEach((b) => (b.onclick = (e) => { e.stopPropagation(); const h = habitList(state).find((x) => x.id === b.dataset.plus); bump(ctx, h, 1); }));
}
function toggleHabit(ctx, h, d = ymd()) {
  const log = (ctx.state.habits.log[d] ||= {});
  if (h.kind === "count") { bump(ctx, h, 1, d); return; }
  if (log[h.id]) delete log[h.id]; else log[h.id] = 1;
  if (!Object.keys(log).length) delete ctx.state.habits.log[d];
  ctx.save(); if (log[h.id]) ctx.toast(`${ctx.esc(h.n)} ✓ · +${LXP.habit} XP`, 1500); ctx.render();
}
function bump(ctx, h, n, d = ymd()) {
  const log = (ctx.state.habits.log[d] ||= {});
  log[h.id] = Math.max(0, (log[h.id] || 0) + n);
  if (!log[h.id]) delete log[h.id];
  ctx.save(); ctx.render();
}

/* =========================================================
   Habits view
   ========================================================= */
export const habitsHtml = `<div id="habits-body"></div>`;
export function renderHabits(ctx) {
  const v = ctx.$("#habits-body"), { state, G, esc } = ctx, L = G.life.habits, today = ymd();
  const weeks = 12, start = addDays(weekStart(today), -7 * (weeks - 1));
  v.innerHTML = `<button class="back" id="hb-back">‹ Status</button>
    <div class="panel sys"><p class="sys-head">[ HABITS ]</p><p class="sys-sub" style="margin-bottom:0">Build the man you want to be, one day at a time · best streak ${L.bestHabit} · ${L.fullHabitDays} perfect days</p></div>
    ${L.stats.map((s) => { const h = s.h;
      const cells = [...Array(weeks * 7)].map((_, i) => { const d = addDays(start, i); if (d > today) return `<i class="hm future"></i>`; if (!L.sched(h, d)) return `<i class="hm off"></i>`;
        const val = L.hval(h, d), t = L.target(h); return `<i class="hm ${val >= t ? "on" : val > 0 ? "part" : ""}" title="${d}"></i>`; }).join("");
      return `<div class="panel hb-card" data-id="${h.id}">
        <div class="card-head"><div class="hb-title"><span class="hb-i">${esc(h.icon || "•")}</span><div><b>${esc(h.n)}</b><small>${h.link ? esc(LINKS[h.link]) : h.kind === "count" ? `Goal ${s.target} ${esc(h.unit || "")} a day` : "Check it off each day"}${h.days?.length && h.days.length < 7 ? ` · ${h.days.map((x) => DOW[x]).join(" ")}` : ""}</small></div></div>
          <button class="btn small ghost" data-edit="${h.id}">Edit</button></div>
        <div class="hb-stats"><div><b>${s.cur}</b><small>streak</small></div><div><b>${s.best}</b><small>best</small></div><div><b>${Math.round(s.rate * 100)}%</b><small>last 30 days</small></div></div>
        <div class="heat">${cells}</div>
      </div>`; }).join("")}
    <button class="btn primary wide-btn" id="hb-add">+ New habit</button>
    <button class="btn ghost wide-btn" id="hb-reset">Restore default habits</button>`;
  v.querySelector("#hb-back").onclick = () => ctx.show("home");
  v.querySelector("#hb-add").onclick = () => editHabit(ctx, null);
  v.querySelector("#hb-reset").onclick = () => {
    if (!confirm("Bring back the default habits (Pray, Bible, Thankful, Read)? Your custom habits stay.")) return;
    const list = habitList(state); const ids = new Set(list.map((h) => h.id));
    state.habits.list = [...DEFAULT_HABITS.filter((h) => !ids.has(h.id)), ...list]; ctx.save(); ctx.render();
  };
  v.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => editHabit(ctx, b.dataset.edit)));
}

function editHabit(ctx, id) {
  const { state, esc } = ctx, list = habitList(state).map((h) => ({ ...h }));
  const h = id ? list.find((x) => x.id === id) : { id: `h-${uid()}`, n: "", icon: "⭐", kind: "check", target: 1, unit: "", days: [] };
  const days = new Set(h.days?.length ? h.days : [0, 1, 2, 3, 4, 5, 6]);
  ctx.openSheet(`<h2>${id ? "Edit habit" : "New habit"}</h2>
    <div class="sheet-row"><label style="flex:0 0 74px">Icon<input type="text" id="he-i" maxlength="4" value="${esc(h.icon || "")}"></label><label>Name<input type="text" id="he-n" value="${esc(h.n)}" placeholder="e.g. No energy drinks"></label></div>
    <p class="label">Linked to</p>
    <select id="he-l"><option value="">Nothing — I'll check it off myself</option>${Object.entries({ prayer: "Prayer (Faith)", bible: "Bible chapter (Faith)", grat: "Gratitude (Faith)", pages: "10 pages (Books)", water: "Gallon of water (75 Hard)", train: "Today's training" }).map(([k, l]) => `<option value="${k}" ${h.link === k ? "selected" : ""}>${l}</option>`).join("")}</select>
    <div id="he-own" ${h.link ? "hidden" : ""}>
      <p class="label">Type</p>
      <div class="seg" id="he-k"><button type="button" data-k="check" class="${h.kind !== "count" ? "on" : ""}">Yes / no</button><button type="button" data-k="count" class="${h.kind === "count" ? "on" : ""}">Count</button></div>
      <div class="sheet-row" id="he-c" ${h.kind === "count" ? "" : "hidden"}><label>Daily goal<input type="number" id="he-t" min="1" value="${h.target || 1}"></label><label>Unit<input type="text" id="he-u" value="${esc(h.unit || "")}" placeholder="glasses, min…"></label></div>
    </div>
    <p class="label">Days</p>
    <div class="dow">${DOW.map((d, i) => `<button type="button" class="${days.has(i) ? "on" : ""}" data-d="${i}">${d}</button>`).join("")}</div>
    <div class="sheet-row">${id ? `<button type="button" class="btn ghost danger" id="he-del">Delete</button>` : ""}<button value="cancel" class="btn">Cancel</button><button value="save" class="btn primary">Save</button></div>`, (f) => {
    let kind = h.kind || "check";
    f.querySelector("#he-l").onchange = (e) => (f.querySelector("#he-own").hidden = !!e.target.value);
    f.querySelectorAll("#he-k button").forEach((b) => (b.onclick = () => { kind = b.dataset.k; f.querySelectorAll("#he-k button").forEach((x) => x.classList.toggle("on", x === b)); f.querySelector("#he-c").hidden = kind !== "count"; f._kind = kind; }));
    f._kind = kind;
    f.querySelectorAll(".dow button").forEach((b) => (b.onclick = () => { const d = +b.dataset.d; days.has(d) ? days.delete(d) : days.add(d); b.classList.toggle("on"); }));
    f.querySelector("#he-del") && (f.querySelector("#he-del").onclick = () => { if (!confirm(`Delete “${h.n}”? Its history goes too.`)) return; state.habits.list = list.filter((x) => x.id !== id); ctx.save(); document.getElementById("sheet").close(); ctx.render(); });
  }, (rv) => {
    if (rv !== "save") return;
    const f = document.getElementById("sheet-form");
    h.n = f.querySelector("#he-n").value.trim(); if (!h.n) return;
    h.icon = f.querySelector("#he-i").value.trim() || "•"; h.link = f.querySelector("#he-l").value || undefined;
    h.kind = f._kind; h.target = Math.max(1, parseInt(f.querySelector("#he-t").value) || 1); h.unit = f.querySelector("#he-u").value.trim();
    h.days = days.size === 7 || !days.size ? [] : [...days].sort();
    if (!h.link) delete h.link;
    state.habits.list = id ? list : [...list, h];
    ctx.save(); ctx.render(); ctx.toast("Habit saved");
  });
}

/* =========================================================
   Weekly System report
   ========================================================= */
let repWeek = null;
export const reportHtml = `<div id="report-body"></div>`;
const ADVICE = {
  Training: "Put your gym days on the calendar before the week fills up — Monday, Tuesday, Thursday is enough to move the needle.",
  "The road": "Stack walks onto things you already do: a lap after dinner or a walk with Madi. Miles add up quietly.",
  "The Word": "Read before your phone does anything else. One chapter is about five minutes.",
  Prayer: "Tie prayer to something daily — the drive to work, or right after your chapter. Even five minutes counts.",
  Reading: "Keep the book where your phone usually goes. Ten pages before bed.",
  Habits: "Too many habits? Cut to the two that matter most and make them automatic first.",
  "Weigh-ins": "Weigh in right after you wake up, three mornings a week — trends need data.",
  "75 Hard": "Plan tomorrow's two workouts and water tonight. Penalties are cheaper to avoid than to pay.",
};
export function renderReport(ctx) {
  const v = ctx.$("#report-body"), { state, G, esc, num, md, fmt } = ctx;
  const ws = repWeek || weekStart(ymd());
  const R = weekSummary(state, G, ws), P = weekSummary(state, G, addDays(ws, -7));
  const isNow = ws === weekStart(ymd());
  const arrow = (a, b) => (a > b ? `<em class="up">▲</em>` : a < b ? `<em class="dn">▼</em>` : "");
  const tile = (k, val, sub, a, b) => `<div><p class="label">${k}</p><p class="mid">${val} ${a != null ? arrow(a, b) : ""}</p>${sub ? `<small>${sub}</small>` : ""}</div>`;
  v.innerHTML = `<button class="back" id="rp-back">‹ Status</button>
    <div class="panel sys report">
      <div class="rp-nav"><button class="btn small" id="rp-prev">‹</button><div><p class="sys-head">[ WEEKLY REPORT ]</p><p class="sys-sub">${md(ws)} – ${md(addDays(ws, 6))}${isNow ? " · so far" : ""}</p></div><button class="btn small" id="rp-next" ${isNow ? "disabled" : ""}>›</button></div>
      <div class="grade g-${R.grade}">${R.grade}</div>
      <p class="center fine">Overall ${Math.round(R.score * 100)}% · last week ${P.grade}</p>
      <ul class="rp-parts">${R.parts.map((p) => `<li><span>${esc(p.k)}</span><i><b style="width:${Math.round(p.s * 100)}%"></b></i><small>${Math.round(p.s * 100)}%</small></li>`).join("")}</ul>
      <div class="rp-call"><p><b>Strongest:</b> ${esc(R.best.k)}</p><p><b>Weakest:</b> ${esc(R.worst.k)}</p><p class="fine">[SYSTEM] ${esc(ADVICE[R.worst.k] || "")}</p></div>
    </div>
    <div class="panel"><div class="card-head"><h2>🏋️ Body & training</h2></div><div class="rp-grid">
      ${tile("Gym days", R.gym, "", R.gym, P.gym)}${tile("Miles", (Math.round(R.mi * 10) / 10), `goal ${G.goalMi}`, R.mi, P.mi)}${tile("Sets", R.sets, `${num(R.lbs)} lb moved`, R.sets, P.sets)}
      ${tile("Weight", R.wChange == null ? "—" : `${R.wChange > 0 ? "+" : ""}${fmt(R.wChange)}`, `${R.weighIns} weigh-ins`)}${tile("Avg calories", R.avgCal ? num(R.avgCal) : "—", `${R.calDays}/7 days logged`)}</div></div>
    <div class="panel"><div class="card-head"><h2>✝️ Faith</h2></div><div class="rp-grid">
      ${tile("Chapters", R.ch, `${R.wordDays}/7 days`, R.ch, P.ch)}${tile("Prayer", `${R.prayMin} min`, `${R.prayDays}/7 days`, R.prayMin, P.prayMin)}${tile("Thankful", `${R.gratDays}/7`, "", R.gratDays, P.gratDays)}</div></div>
    <div class="panel"><div class="card-head"><h2>📚 Reading</h2></div><div class="rp-grid">
      ${tile("Pages", R.pages, `${R.readDays}/7 days`, R.pages, P.pages)}${tile("Finished", R.finished.length, R.finished.slice(0, 2).map(esc).join(", "))}</div></div>
    ${R.hardDays ? `<div class="panel"><div class="card-head"><h2>🔥 75 Hard</h2></div><div class="rp-grid">
      ${tile("Perfect days", `${R.hardPerfect}/${R.hardDays}`, "", R.hardPerfect, P.hardPerfect)}${tile("Penalties", R.pensMade, `${R.pensPaid} paid this week`)}</div></div>` : ""}
    <div class="panel"><div class="card-head"><h2>✅ Habits</h2></div><div class="rp-grid">${tile("Completion", R.habitRate == null ? "—" : `${Math.round(R.habitRate * 100)}%`, "", R.habitRate || 0, P.habitRate || 0)}</div></div>`;
  v.querySelector("#rp-back").onclick = () => ctx.show("home");
  v.querySelector("#rp-prev").onclick = () => { repWeek = addDays(ws, -7); renderReport(ctx); };
  v.querySelector("#rp-next").onclick = () => { repWeek = addDays(ws, 7); renderReport(ctx); };
}

export function beforeRender(ctx) { hardCheck(ctx); }
