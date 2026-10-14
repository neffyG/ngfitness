// Shared app shell for ARISE and Bloom. Each app passes its config, workout plan and extras.
import { compute, claim, migrate, ymd, parse, addDays, between, weekStart, slug, setsOf, repsOf, XP, paceOf, fmtPace, cardioXP,
  lastSession, makeCode, readCode, maintenance, rankOf, levelOf, DAY_MS } from "./engine.js";
import { figureSvg, hasFigure, FIGURE_KEYS } from "./figures.js";

/* ---------- tiny helpers ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => r.querySelectorAll(s);
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const fmt = (n) => (n == null || isNaN(n) ? "—" : (Math.round(n * 10) / 10).toFixed(1));
export const num = (n) => Math.round(n || 0).toLocaleString();
export const md = (s) => parse(s).toLocaleDateString(undefined, { month: "short", day: "numeric" });
export const wmd = (s) => parse(s).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
export const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
export const signed = (n) => { if (n == null) return "—"; const v = Math.round(n * 10) / 10; return `${v > 0 ? "+" : ""}${v.toFixed(1)}`; };
export const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const mi1 = (n) => (Math.round(n * 10) / 10).toString();
export function setupCanvas(cv) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext("2d"); c.scale(dpr, dpr); c.clearRect(0, 0, W, H);
  return { c, W, H };
}
const CHECK_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>`;
const ICONS = {
  home: `<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>`,
  status: `<path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 16.6 6.5 19.5l1-6.3L3 8.9 9 8z"/>`,
  train: `<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>`,
  bosses: `<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/>`,
  flower: `<circle cx="12" cy="8" r="3"/><path d="M12 11v10M12 16c-3 0-5-2-5-4M12 18c3 0 5-2 5-4"/><path d="M9 8a3 3 0 1 1 3-3 3 3 0 1 1 3 3"/>`,
  body: `<path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z"/><path d="M12 8v4l3 2"/>`,
  heart: `<path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z"/>`,
  cycle: `<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z"/>`,
  book: `<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>`,
  cross: `<path d="M12 2v20M6 8h12"/>`,
  sun: `<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`,
  flame: `<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7z"/>`,
  gear: `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
};
export const icon = (k, s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.status}</svg>`;

/* =========================================================
   startApp
   ========================================================= */
export function startApp({ cfg, plan, extra = {} }) {
  const T = cfg.text;
  /* ---------- state ---------- */
  const load = () => { try { return migrate(JSON.parse(localStorage.getItem(cfg.storageKey)), cfg, extra.defaults || {}); } catch { return migrate(null, cfg, extra.defaults || {}); } };
  let state = load();
  const save = () => { try { localStorage.setItem(cfg.storageKey, JSON.stringify(state)); } catch {} };
  let G = compute(state, cfg, plan);
  const ctx = { cfg, plan, get state() { return state; }, get G() { return G; }, save, toast, render: () => render(), show: (v) => show(v), esc, md, wmd, plural, fmt, num, $, $$, setupCanvas, css, openSheet,
    popup: (h) => popup(h), get current() { return current; }, figureSvg, hasFigure, openFig: (it) => openFig(it), goTrain: (seg, type) => { trainSeg = seg || "workout"; if (type) cardioType = type; selectedDay = plan.todayId(); show("train"); } };

  /* ---------- toast + popups ---------- */
  function toast(msg, ms = 2400) {
    const t = $("#toast"); t.innerHTML = `${T.toastTag ? `<b>${T.toastTag}</b>` : ""}${msg}`; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), ms);
  }
  const popups = [];
  function popup(html) { popups.push(html); if ($("#overlay").hidden) nextPopup(); }
  function nextPopup() {
    const h = popups.shift();
    if (!h) { $("#overlay").hidden = true; return; }
    $("#ov-box").innerHTML = h + `<button class="btn primary" id="ov-ok">${esc(T.popupOk)}</button>`;
    $("#overlay").hidden = false;
    $("#ov-ok").onclick = nextPopup;
    if (navigator.vibrate) navigator.vibrate([30, 40, 60]);
  }

  /* ---------- recompute + rewards ---------- */
  function update({ silent = false } = {}) {
    G = compute(state, cfg, plan);
    const { newBosses, newLoot } = claim(state, cfg, G);
    if (newBosses.length || newLoot.length) G = compute(state, cfg, plan);
    if (state.seenLevel == null) {
      state.seenLevel = G.level; save();
      if (!silent) setTimeout(() => toast(G.xp ? cfg.text.welcomeBack(G) : cfg.text.welcomeNew, 4200), 500);
      return;
    }
    const titled = cfg.loot.some((l) => l.id === state.title && state.earned[l.id]);
    if (!titled) { const t = [...newLoot, ...cfg.loot.filter((l) => state.earned[l.id])].find((l) => l.title); state.title = t ? t.id : null; }
    newBosses.forEach((b) => { const loot = cfg.loot.find((l) => l.boss === b.id); popup(cfg.bossPopup(b, loot)); });
    newLoot.filter((l) => !l.boss || !newBosses.some((b) => b.id === l.boss)).forEach((l) => popup(cfg.lootPopup(l)));
    if (G.level > state.seenLevel) {
      const oldRank = rankOf(cfg.ranks, state.seenLevel);
      popup(cfg.levelPopup(state.seenLevel, G.level, G.rank.name !== oldRank.name ? G.rank : null));
    }
    state.seenLevel = Math.max(state.seenLevel, G.level); // highest level ever reached — popups only fire above it
    save();
  }

  /* =========================================================
     SHELL
     ========================================================= */
  const builtIn = { home: renderHome, train: renderTrain, bosses: renderBosses, body: renderBody };
  const extraTabs = Object.fromEntries((extra.tabs || []).map((t) => [t.id, t]));
  document.querySelector("#app").innerHTML = `
    ${cfg.sceneHtml || ""}
    <header class="top">
      <div><p class="eyebrow" id="today-date"></p><p class="logo">${cfg.logoHtml}</p></div>
      <button class="icon-btn" id="settings-btn" aria-label="Settings">${icon("gear")}</button>
    </header>
    <main>${cfg.tabs.map((t) => `<section class="view" id="view-${t.id}" hidden>${extraTabs[t.id]?.html || ""}</section>`).join("")}</main>
    <div class="rest" id="rest" hidden><span class="rest-l">${esc(T.rest)}</span><span class="rest-t" id="rest-t">1:30</span><button id="rest-add">+15s</button><button id="rest-skip">Skip</button><i class="rest-bar" id="rest-bar"></i></div>
    <nav class="tabbar">${cfg.tabs.filter((t) => !t.hidden).map((t, i) => `<button data-view="${t.id}" class="${i ? "" : "on"}">${icon(t.icon)}<span>${esc(t.label)}</span></button>`).join("")}</nav>
    <dialog id="sheet"><form method="dialog" class="sheet" id="sheet-form"></form></dialog>
    <div class="overlay" id="overlay" hidden><div class="ov-box" id="ov-box"></div></div>
    <div class="toast" id="toast"></div>
    ${(extra.tabs || []).map((t) => t.chrome || "").join("")}`;

  let current = cfg.tabs[0].id;
  function show(view) {
    current = view;
    $$(".view").forEach((v) => (v.hidden = v.id !== `view-${view}`));
    const navId = cfg.tabs.find((t) => t.id === view)?.navAs || view;
    $$(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.view === navId));
    window.scrollTo({ top: 0 });
    render();
  }
  function render() {
    update();
    extra.beforeRender?.(ctx);
    $("#today-date").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
    (builtIn[current] || extraTabs[current]?.render)?.(ctx);
  }
  $$(".tabbar button").forEach((b) => (b.onclick = () => show(b.dataset.view)));
  $("#settings-btn").onclick = openSettings;

  /* generic sheet */
  function openSheet(html, bind, onClose) {
    const dlg = $("#sheet");
    $("#sheet-form").innerHTML = html;
    dlg.returnValue = "";
    dlg.onclose = () => onClose?.(dlg.returnValue);
    bind?.($("#sheet-form"));
    dlg.showModal();
  }

  /* =========================================================
     HOME
     ========================================================= */
  function renderHome() {
    const v = $("#view-home");
    const rk = G.rank;
    const title = cfg.loot.find((l) => l.id === state.title && state.earned[l.id]);
    const q = G.questsFor(ymd());
    const allOk = q.every((x) => x.ok);
    const today = ymd(), ws = weekStart(today);
    const week = [...Array(7)].map((_, i) => addDays(ws, i));
    const wkMi = G.weekMi[G.thisWeek] || 0;
    const day = plan.byId[plan.todayId()];
    const opts = extra.trainOpts?.(ctx, day) || {};
    const prog = dayProgress(day, opts);
    const nextBoss = G.bosses.filter((b) => !b.earned && !b.duo).sort((a, b) => b.pct - a.pct)[0];
    const moves = G.moves, doneMoves = new Set(state.mob[today] || []);

    v.innerHTML = `
      <div class="panel player">
        <div class="panel-tag">${esc(T.statusTag)}</div>
        <div class="p-top">
          <div class="emblem" style="--rk:${rk.c}">${cfg.emblem(rk)}</div>
          <div class="p-id">
            <p class="label">${esc(rk.name)}</p>
            <p class="p-name">${esc(state.name || "Player")}</p>
            <button class="p-title ${title ? "" : "none"}" id="p-title">${title ? `${esc(title.icon)} ${esc(title.title)}` : esc(T.noTitle)}</button>
          </div>
        </div>
        <div class="lvl-row"><b>${esc(T.lv)} ${G.level}</b><span>${num(G.into)} / ${num(G.need)} ${esc(cfg.xpName)}</span></div>
        <div class="xpbar"><i style="width:${(G.into / G.need) * 100}%"></i></div>
        ${cfg.playerExtra ? cfg.playerExtra(G, state) : ""}
      </div>

      ${extra.homeTop?.(ctx) || ""}

      <div class="panel streak">
        <div class="streak-top">
          <div><p class="label">${esc(T.streakLabel)}</p><p class="streak-n">${G.streak.cur}<small> ${G.streak.cur === 1 ? "day" : "days"}</small></p></div>
          <div class="streak-side"><p class="label">Best</p><p class="mid">${G.streak.best}</p></div>
        </div>
        <div class="streak-week">${week.map((d, i) => {
          const k = d > today ? "future" : G.streak.days[d] || (d === today ? "today" : "off");
          return `<div class="sd ${k}"><span>${cfg.streakMark(k)}</span><small>${"MTWTFSS"[i]}</small></div>`; }).join("")}</div>
        <p class="fine">${G.streak.todayDone ? esc(T.streakDone) : esc(T.streakTodo)} · rest days left this week: <b>${G.streak.restLeft}/2</b></p>
      </div>

      <div class="panel sys quests">
        <p class="sys-head">${esc(T.questHead)}</p>
        <p class="sys-sub">${esc(T.questSub)} · <b>+${XP.quest} ${esc(cfg.xpName)}</b></p>
        <ul class="q-list">${q.map((x) => `<li class="${x.ok ? "ok" : ""}" data-q="${x.id}"><span class="q-box">${x.ok ? CHECK_SVG : ""}</span><span class="q-n">${esc(x.n)}</span><span class="q-x">+${x.x}</span></li>`).join("")}</ul>
        ${allOk ? `<p class="q-clear">${esc(T.questClear)}</p>` : ""}
        <div class="q-foot"><span>Resets in <b id="q-timer"></b></span></div>
      </div>

      <div class="panel mob">
        <div class="card-head"><div><h2>${esc(T.mobHead)}</h2><p class="muted small">+${XP.move} each · +${XP.mobilityBonus} for all ${moves.length}</p></div>
          <button class="btn small" id="mob-edit">Edit</button></div>
        <ul class="mob-list">${moves.map((m) => `<li class="${doneMoves.has(m.id) ? "ok" : ""}">
          ${m.fig && hasFigure(m.fig) ? `<button type="button" class="fig sm" data-fig="${esc(m.fig)}" data-n="${esc(m.n)}" data-s="${esc(m.s)}">${figureSvg(m.fig)}</button>` : `<span class="fig sm empty"></span>`}
          <label><input type="checkbox" data-m="${esc(m.id)}" ${doneMoves.has(m.id) ? "checked" : ""}><span class="check">${CHECK_SVG}</span>
          <span class="mob-t"><b>${esc(m.n)}</b><small>${esc(m.s || "")}</small></span></label></li>`).join("")}</ul>
        <div class="bar"><div class="bar-fill" style="width:${moves.length ? (doneMoves.size / moves.length) * 100 : 0}%"></div></div>
      </div>

      <div class="panel miles">
        <div class="panel-tag">${esc(T.milesTag)}</div>
        <div class="card-head"><div><p class="label">This week</p><p class="miles-n">${mi1(wkMi)}<small> / ${mi1(G.goalMi)} mi</small></p></div>
          <div class="streak-side"><p class="label">Week streak</p><p class="mid">${G.weekStreak} ${cfg.weekStreakIcon}</p></div></div>
        <div class="bar big"><div class="bar-fill" style="width:${Math.min(100, (wkMi / G.goalMi) * 100)}%"></div></div>
        <p class="fine">${wkMi >= G.goalMi ? esc(T.weekGoalHit) : `${mi1(G.goalMi - wkMi)} mi to go · +${XP.weekGoal} ${esc(cfg.xpName)} bonus when you hit it`}</p>
        <div class="two"><button class="btn" data-go="walk">${cfg.walkIcon} Log walk</button><button class="btn" data-go="run">${cfg.runIcon} Log run</button></div>
      </div>

      <button class="panel today-link" id="today-link">
        <div><p class="label">${esc(T.todayTraining)}</p><p class="today-title">${extra.todayTitle?.(ctx, day, opts) || day.title}</p><p class="today-sub">${esc(day.sub)}</p></div>
        <div class="today-progress">${prog.pct}%</div>
      </button>

      ${nextBoss ? `<button class="panel boss-tease" id="boss-tease">
        <span class="b-icon">${nextBoss.icon}</span>
        <div><p class="label">${esc(T.nextBoss)}</p><p class="bt-name">${esc(nextBoss.name)}</p>
        <div class="hp"><i style="width:${100 - nextBoss.pct}%"></i></div><p class="fine">${bossProgressText(nextBoss)}</p></div></button>` : ""}`;

    $("#p-title").onclick = openTitles;
    $("#today-link").onclick = () => { selectedDay = plan.todayId(); trainSeg = "workout"; show("train"); };
    $("#boss-tease") && ($("#boss-tease").onclick = () => show("bosses"));
    $$("[data-go]", v).forEach((b) => (b.onclick = () => { trainSeg = "cardio"; cardioType = b.dataset.go; show("train"); }));
    $$(".q-list li", v).forEach((li) => (li.onclick = () => {
      const id = li.dataset.q;
      if (id === "train") { selectedDay = plan.todayId(); trainSeg = "workout"; show("train"); }
      if (id === "weigh" || id === "cal") show("body");
      if (id === "mob") $(".mob", v).scrollIntoView({ behavior: "smooth", block: "center" });
    }));
    $("#mob-edit").onclick = openMovesEditor;
    $$(".mob-list input", v).forEach((cb) => (cb.onchange = () => {
      const s = new Set(state.mob[today] || []);
      cb.checked ? s.add(cb.dataset.m) : s.delete(cb.dataset.m);
      if (s.size) state.mob[today] = [...s]; else delete state.mob[today];
      const full = moves.every((m) => s.has(m.id));
      save();
      if (cb.checked) toast(full ? `${esc(T.mobDone)} +${XP.move + XP.mobilityBonus} ${esc(cfg.xpName)}` : `+${XP.move} ${esc(cfg.xpName)}`, 1600);
      if (navigator.vibrate) navigator.vibrate(8);
      render();
    }));
    bindFigs(v);
    extra.bindHome?.(ctx);
    tickQuest();
  }
  function tickQuest() {
    const el = $("#q-timer"); if (!el) return;
    const now = new Date(), mid = new Date(now); mid.setHours(24, 0, 0, 0);
    const s = Math.floor((mid - now) / 1000);
    el.textContent = `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m ${String(s % 60).padStart(2, "0")}s`;
  }
  setInterval(() => { if (current === "home") tickQuest(); }, 1000);

  function bossProgressText(b) {
    if (b.unit === "%") return `${Math.round(b.cur)}% / 100%`;
    const f = (x) => (b.unit === "lb" ? num(x) : b.unit === "mi" ? mi1(x) : Math.floor(x));
    return `${f(Math.min(b.cur, b.target))} / ${f(b.target)} ${b.unit}`;
  }

  /* titles */
  function openTitles() {
    const owned = cfg.loot.filter((l) => state.earned[l.id] && l.title);
    openSheet(`<h2>${esc(T.titlesHead)}</h2>
      ${owned.length ? `<div class="title-list">${owned.map((l) => `<button type="button" class="title-opt ${state.title === l.id ? "on" : ""}" data-id="${l.id}"><span>${l.icon}</span><b>${esc(l.title)}</b><small>${esc(l.name)}</small></button>`).join("")}
      <button type="button" class="title-opt ${!state.title ? "on" : ""}" data-id=""><span>—</span><b>No title</b></button></div>`
      : `<p class="muted">${esc(T.noTitlesYet)}</p>`}
      <button value="close" class="btn primary">Done</button>`, (f) => {
      $$(".title-opt", f).forEach((b) => (b.onclick = () => { state.title = b.dataset.id || null; save(); $("#sheet").close(); render(); }));
    });
  }

  /* mobility editor */
  function openMovesEditor() {
    let list = (state.moves || cfg.defaultMoves).map((m) => ({ ...m }));
    const figOpts = (sel) => `<option value="">No picture</option>${FIGURE_KEYS.map((k) => `<option value="${k}" ${k === sel ? "selected" : ""}>${k}</option>`).join("")}`;
    const draw = (f) => {
      $("#mv-list", f).innerHTML = list.map((m, i) => `<li data-i="${i}">
        <span class="fig sm">${m.fig && hasFigure(m.fig) ? figureSvg(m.fig) : ""}</span>
        <div class="mv-fields"><input class="mv-n" value="${esc(m.n)}" placeholder="Move name"><input class="mv-s" value="${esc(m.s || "")}" placeholder="e.g. 2 × 10 / side">
        <select class="mv-f">${figOpts(m.fig)}</select></div>
        <button type="button" class="del" aria-label="Remove">×</button></li>`).join("");
      $$("#mv-list li", f).forEach((li) => {
        const m = list[+li.dataset.i];
        $(".mv-n", li).oninput = (e) => (m.n = e.target.value);
        $(".mv-s", li).oninput = (e) => (m.s = e.target.value);
        $(".mv-f", li).onchange = (e) => { m.fig = e.target.value; draw(f); };
        $(".del", li).onclick = () => { list.splice(+li.dataset.i, 1); draw(f); };
      });
    };
    openSheet(`<h2>${esc(T.mobHead)}</h2><p class="muted small">Rename, add or remove moves. Pick a picture for each one.</p>
      <ul class="mv-list" id="mv-list"></ul>
      <button type="button" class="btn" id="mv-add">+ Add a move</button>
      <button type="button" class="btn ghost" id="mv-reset">Reset to default moves</button>
      <div class="sheet-row"><button value="cancel" class="btn">Cancel</button><button value="save" class="btn primary">Save</button></div>`,
    (f) => {
      draw(f);
      $("#mv-add", f).onclick = () => { list.push({ id: `m-${Date.now().toString(36)}`, n: "", s: "", fig: "" }); draw(f); $$(".mv-n", f)[list.length - 1]?.focus(); };
      $("#mv-reset", f).onclick = () => { list = cfg.defaultMoves.map((m) => ({ ...m })); draw(f); };
    }, (rv) => {
      if (rv !== "save") return;
      list = list.filter((m) => m.n.trim()).map((m) => ({ ...m, n: m.n.trim() }));
      state.moves = list.length ? list : null; save(); render(); toast("Moves saved");
    });
  }

  /* =========================================================
     TRAIN
     ========================================================= */
  let selectedDay = plan.todayId(), trainSeg = "workout", cardioType = "walk";
  function dayProgress(day, opts) {
    const key = plan.keyFor(day, opts), done = checksFor(key);
    const total = plan.blocksFor(day, opts).reduce((n, b) => n + b.items.length, 0);
    return { done: done.size, total, pct: Math.round((done.size / total) * 100) };
  }
  function checksFor(key, d = ymd()) { const r = state.checks[d]; return r && r.day === key ? new Set(r.done) : new Set(); }
  function setCheck(key, k, on) {
    const d = ymd();
    const rec = state.checks[d]?.day === key ? state.checks[d] : { day: key, done: [] };
    const s = new Set(rec.done); on ? s.add(k) : s.delete(k);
    state.checks[d] = { day: key, done: [...s] };
  }

  function renderTrain() {
    const v = $("#view-train");
    v.innerHTML = `<div class="seg wide" id="train-seg">
        <button data-s="workout" class="${trainSeg === "workout" ? "on" : ""}">Workout</button>
        <button data-s="cardio" class="${trainSeg === "cardio" ? "on" : ""}">${esc(T.cardioTab)}</button>
        <button data-s="lifts" class="${trainSeg === "lifts" ? "on" : ""}">Lift log</button></div>
      <div id="train-body"></div>`;
    $$("#train-seg button").forEach((b) => (b.onclick = () => { trainSeg = b.dataset.s; renderTrain(); }));
    ({ workout: renderWorkout, cardio: renderCardio, lifts: renderLiftLog })[trainSeg]();
  }

  function renderWorkout() {
    const box = $("#train-body");
    const todayId = plan.todayId();
    const day = plan.byId[selectedDay];
    const isToday = day.id === todayId;
    const opts = isToday ? extra.trainOpts?.(ctx, day) || {} : {};
    const key = plan.keyFor(day, opts);
    const done = checksFor(key);
    const blocks = plan.blocksFor(day, opts);
    box.innerHTML = `
      ${extra.trainBanner?.(ctx, day, isToday, opts) || ""}
      <div class="rail" id="rail">${plan.DAYS.map((d) => `<button data-id="${d.id}" class="${d.id === selectedDay ? "on" : ""} ${d.id === todayId ? "today" : ""}">${esc(d.tab)}</button>`).join("")}</div>
      <div class="day-head"><p class="label">${isToday ? esc(T.todayKicker) : "Preview"}</p><h2>${extra.todayTitle && isToday ? extra.todayTitle(ctx, day, opts) : day.title}</h2><p class="day-sub">${esc(day.sub)}</p>
        <div class="bar"><div class="bar-fill" id="day-bar"></div></div></div>
      ${blocks.map((b) => {
        const n = b.items.filter((_, i) => done.has(`${b.key}.${i}`)).length, all = n === b.items.length;
        return `<details class="panel block" ${all ? "" : "open"}>
          <summary><div><div class="block-t">${esc(b.t)}</div><div class="block-w">${esc(b.w)}</div></div><span class="block-count ${all ? "done" : ""}">${n}/${b.items.length}</span></summary>
          ${b.note ? `<p class="block-note">${esc(b.note)}</p>` : ""}
          <ol class="ex">${b.items.map((it, i) => exRow(b, it, i, done, isToday)).join("")}</ol></details>`;
      }).join("")}
      <button class="btn wide-btn" id="quick-lift">+ Log another lift</button>
      ${extra.trainFooter?.(ctx) || ""}`;
    extra.bindTrainBanner?.(ctx, () => renderWorkout());
    $$("#rail button").forEach((b) => (b.onclick = () => { selectedDay = b.dataset.id; renderWorkout(); }));
    $("#rail .on")?.scrollIntoView({ inline: "center", block: "nearest" });
    $("#quick-lift").onclick = () => openLiftSheet();
    bindFigs(box, blocks);
    $$(".ex-head input", box).forEach((cb) => (cb.onchange = () => {
      setCheck(key, cb.dataset.k, cb.checked); save(); afterTrain(day, opts);
      if (navigator.vibrate) navigator.vibrate(8);
    }));
    $$(".lift", box).forEach((el) => bindLift(el, blocks, key, day, opts));
    $("#day-bar").style.width = `${dayProgress(day, opts).pct}%`;
    afterTrain._cleared = !!G.train[ymd()]?.cleared;
  }

  function suggestion(sl, it) {
    const last = lastSession(state, sl);
    const inc = it.inc || 5;
    if (!last) return { w: null, reps: repsOf(it.s), text: T.firstLift };
    const reps = last.reps || repsOf(it.s);
    const target = Math.max(setsOf(it.s), (last.sets || []).length);
    const hit = (last.sets || []).filter((x) => x === 1).length;
    if (hit >= setsOf(it.s) && last.w) return { w: last.w + inc, reps, last, text: `Last ${md(last.d)}: <b>${last.w} lb × ${reps}</b> · all sets ✓ → <span class="go">${T.goUp(last.w + inc)}</span>` };
    return { w: last.w, reps, last, text: `Last ${md(last.d)}: <b>${last.w} lb × ${reps}</b> · ${hit}/${target} sets → stay at ${last.w} lb until you hit them all` };
  }

  function exRow(b, it, i, done, isToday) {
    const k = `${b.key}.${i}`;
    let lift = "";
    if (b.lift && it.w) {
      const sl = slug(it.n), sug = suggestion(sl, it);
      const best = G.lifts.board[sl]?.best;
      if (isToday) {
        const cur = state.lifts[sl]?.[ymd()];
        const w = cur?.w ?? sug.w ?? "", reps = cur?.reps ?? sug.reps;
        const n = Math.max(setsOf(it.s), cur?.sets?.length || 0);
        const inc = it.inc || 5;
        lift = `<div class="lift" data-slug="${sl}" data-k="${k}" data-b="${b.key}" data-i="${i}">
          <div class="lift-row">
            <div class="wt"><button type="button" data-d="-${inc}">−</button><input class="lw" type="number" inputmode="decimal" step="${inc}" value="${w}" placeholder="0"><span>lb</span><button type="button" data-d="${inc}">+</button></div>
            <div class="wt reps"><button type="button" data-r="-1">−</button><input class="lr" type="number" inputmode="numeric" value="${reps}"><span>reps</span><button type="button" data-r="1">+</button></div>
          </div>
          <div class="sets">${[...Array(n)].map((_, j) => `<button type="button" class="set s${cur?.sets?.[j] || 0}" data-s="${j}">${j + 1}</button>`).join("")}<button type="button" class="set add" aria-label="Add a set">+</button></div>
          <p class="lift-hint">${sug.text}${best ? ` · <span class="pr">${esc(T.pbShort)} ${best} lb</span>` : ""}</p></div>`;
      } else if (sug.last) lift = `<div class="lift"><p class="lift-hint" style="margin:0">${sug.text}</p></div>`;
    }
    return `<li class="ex-row">
      ${it.fig && hasFigure(it.fig) ? `<button type="button" class="fig" data-b="${b.key}" data-i="${i}" aria-label="Show ${esc(it.n)}">${figureSvg(it.fig)}</button>` : ""}
      <div class="ex-main">
        <label class="ex-head"><input type="checkbox" data-k="${k}" ${done.has(k) ? "checked" : ""} ${isToday ? "" : "disabled"}><span class="check">${CHECK_SVG}</span><span class="ex-n">${esc(it.n)}</span></label>
        <span class="ex-s">${esc(it.s)}</span>
        ${it.note ? `<p class="ex-note">${esc(it.note)}</p>` : ""}${lift}
      </div></li>`;
  }

  function bindLift(el, blocks, key, day, opts) {
    const sl = el.dataset.slug, it = blocks[+el.dataset.b].items[+el.dataset.i];
    const lw = $(".lw", el), lr = $(".lr", el);
    const sess = () => {
      state.lifts[sl] ||= {};
      const s = (state.lifts[sl][ymd()] ||= { n: it.n, w: parseFloat(lw.value) || 0, reps: parseInt(lr.value) || repsOf(it.s), sets: [] });
      while (s.sets.length < $$(".set:not(.add)", el).length) s.sets.push(0);
      return s;
    };
    const sync = () => { const s = state.lifts[sl]?.[ymd()]; if (s) { s.w = parseFloat(lw.value) || 0; s.reps = parseInt(lr.value) || 1; save(); } };
    $$("[data-d]", el).forEach((b) => (b.onclick = () => { lw.value = Math.max(0, (parseFloat(lw.value) || 0) + parseFloat(b.dataset.d)); sync(); }));
    $$("[data-r]", el).forEach((b) => (b.onclick = () => { lr.value = Math.max(1, (parseInt(lr.value) || 0) + parseInt(b.dataset.r)); sync(); }));
    lw.onchange = sync; lr.onchange = sync;
    $(".set.add", el).onclick = () => {
      const s = sess(); s.sets.push(0); save(); renderWorkout();
    };
    $$(".set:not(.add)", el).forEach((b) => (b.onclick = () => {
      const s = sess(); const i = +b.dataset.s;
      s.w = parseFloat(lw.value) || 0; s.reps = parseInt(lr.value) || 1;
      s.sets[i] = s.sets[i] === 0 ? 1 : s.sets[i] === 1 ? 2 : 0;
      b.className = `set s${s.sets[i]}`;
      const planned = s.sets.slice(0, setsOf(it.s));
      if (planned.length >= setsOf(it.s) && planned.every((x) => x === 1) && !checksFor(key).has(el.dataset.k)) {
        setCheck(key, el.dataset.k, true); el.closest("li").querySelector(".ex-head input").checked = true;
      }
      const prevBest = Math.max(0, ...Object.entries(state.lifts[sl]).filter(([d, x]) => d < ymd() && (x.sets || []).some((v) => v === 1)).map(([, x]) => x.w || 0));
      save();
      if (s.sets[i] === 1) {
        if (prevBest > 0 && s.w > prevBest && s.sets.filter((x) => x === 1).length === 1) toast(T.newPR(it.n, s.w), 3200);
        s.sets.every((x) => x === 1) ? stopRest() : startRest();
      }
      afterTrain(day, opts);
    }));
  }

  function afterTrain(day, opts) {
    $("#day-bar") && ($("#day-bar").style.width = `${dayProgress(day, opts).pct}%`);
    $$("#train-body .block").forEach((el) => {
      const items = $$(".ex-head input", el), n = [...items].filter((x) => x.checked).length;
      const tag = $(".block-count", el); tag.textContent = `${n}/${items.length}`; tag.classList.toggle("done", n === items.length);
    });
    update();
    const cleared = !!G.train[ymd()]?.cleared;
    if (cleared && !afterTrain._cleared) toast(T.trainCleared(day.rest ? XP.restDay : XP.gym), 2800);
    afterTrain._cleared = cleared;
  }

  /* exercise picture sheet */
  function bindFigs(root, blocks) {
    $$(".fig[data-b]", root).forEach((b) => (b.onclick = () => openFig(blocks[+b.dataset.b].items[+b.dataset.i])));
    $$(".fig[data-fig]", root).forEach((b) => (b.onclick = () => openFig({ n: b.dataset.n, s: b.dataset.s, fig: b.dataset.fig })));
  }
  function openFig(it) {
    const sl = slug(it.n);
    const hist = Object.entries(state.lifts[sl] || {}).sort(([a], [b]) => b.localeCompare(a)).slice(0, 8);
    const q = encodeURIComponent(`${it.n} exercise proper form`);
    openSheet(`
      <div class="fig-big">${figureSvg(it.fig, true)}<span class="fig-badge">${esc(T.figBadge)}</span></div>
      <h2>${esc(it.n)}</h2><p class="fig-sets">${esc(it.s || "")}</p>
      ${it.note ? `<p class="muted" style="margin:0">${esc(it.note)}</p>` : ""}
      ${hist.length ? `<ul class="hist">${hist.map(([d, s]) => `<li><span>${md(d)}</span><span><b>${s.w} lb</b> × ${s.reps || repsOf(it.s)} · ${(s.sets || []).filter((x) => x === 1).length}/${(s.sets || []).length} sets</span></li>`).join("")}</ul>` : ""}
      <a class="btn" href="https://www.youtube.com/results?search_query=${q}" target="_blank" rel="noopener">▶ Watch a video demo</a>
      <button value="close" class="btn primary">Got it</button>`);
  }

  /* quick lift log */
  function openLiftSheet(prefill) {
    const names = [...new Set([...Object.values(G.items).map((i) => i.n), ...Object.values(G.lifts.board).map((b) => b.n)])].sort();
    openSheet(`<h2>Log a lift</h2>
      <label>Exercise<input type="text" id="ql-n" list="ql-list" value="${esc(prefill || "")}" placeholder="e.g. Leg press" autocomplete="off"></label>
      <datalist id="ql-list">${names.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>
      <p class="lift-hint" id="ql-hint">${esc(T.autofill)}</p>
      <div class="sheet-row three"><label>Weight (lb)<input type="number" id="ql-w" inputmode="decimal" step="2.5"></label>
        <label>Sets<input type="number" id="ql-s" inputmode="numeric" value="3" min="1" max="12"></label>
        <label>Reps<input type="number" id="ql-r" inputmode="numeric" value="10" min="1" max="100"></label></div>
      <label>Date<input type="date" id="ql-d" value="${ymd()}" max="${ymd()}"></label>
      <div class="sheet-row"><button value="cancel" class="btn">Cancel</button><button value="save" class="btn primary">Save</button></div>`,
    (f) => {
      const fill = () => {
        const n = $("#ql-n", f).value.trim(); if (!n) return;
        const last = lastSession(state, slug(n), addDays(ymd(), 1));
        const item = G.items[slug(n)];
        if (last) {
          $("#ql-w", f).value = last.w; $("#ql-r", f).value = last.reps || (item ? repsOf(item.s) : 10); $("#ql-s", f).value = (last.sets || []).length || 3;
          $("#ql-hint", f).innerHTML = `Last time ${md(last.d)}: <b>${last.w} lb</b> · ${(last.sets || []).length} × ${last.reps || "?"} — filled in for you`;
        } else if (item) { $("#ql-s", f).value = setsOf(item.s); $("#ql-r", f).value = repsOf(item.s); $("#ql-hint", f).textContent = `From your plan: ${item.s}`; }
        else $("#ql-hint", f).textContent = "New exercise";
      };
      $("#ql-n", f).onchange = fill; $("#ql-n", f).onblur = fill; if (prefill) fill();
    }, (rv) => {
      if (rv !== "save") return;
      const n = $("#ql-n").value.trim(), w = parseFloat($("#ql-w").value), sets = Math.min(12, Math.max(1, parseInt($("#ql-s").value) || 1)), reps = Math.max(1, parseInt($("#ql-r").value) || 1);
      const d = $("#ql-d").value || ymd();
      if (!n || !(w >= 0)) { toast("Add the exercise and weight"); return; }
      const sl = slug(n);
      const prev = G.lifts.board[sl]?.best || 0;
      (state.lifts[sl] ||= {})[d] = { n, w, reps, sets: Array(sets).fill(1) };
      save(); render();
      toast(prev && w > prev ? T.newPR(n, w) : `Logged ${esc(n)} · ${w} lb · ${sets} × ${reps} · +${sets * XP.set} ${esc(cfg.xpName)}`, 2800);
    });
  }

  /* lift log list */
  function renderLiftLog() {
    const box = $("#train-body");
    const rows = Object.values(G.lifts.board).sort((a, b) => b.last.d.localeCompare(a.last.d));
    box.innerHTML = `
      <div class="panel">
        <div class="panel-tag">${esc(T.liftTag)}</div>
        <div class="week-grid">
          <div><p class="label">Lifted</p><p class="mid">${num(G.lifts.lbs)}<small> lb</small></p></div>
          <div><p class="label">Sets</p><p class="mid">${num(G.lifts.sets)}</p></div>
          <div><p class="label">PRs</p><p class="mid">${G.lifts.prs}</p></div>
        </div>
        <button class="btn primary wide-btn" id="ll-add">+ Log a lift</button>
      </div>
      <div class="panel"><div class="card-head"><h2>Personal bests</h2></div>
        ${rows.length ? `<ul class="ll-list">${rows.map((r) => `<li data-sl="${r.sl}">
          ${r.fig && hasFigure(r.fig) ? `<span class="fig sm">${figureSvg(r.fig)}</span>` : `<span class="fig sm empty">${cfg.liftIcon}</span>`}
          <div class="ll-t"><b>${esc(r.n)}</b><small>Last ${md(r.last.d)}: ${r.last.w} lb · ${(r.last.sets || []).filter((x) => x === 1).length} × ${r.last.reps}</small></div>
          <span class="pr-w">${r.best} lb</span></li>`).join("")}</ul>` : `<p class="muted">Log weights in your workout (or tap Log a lift) and your bests show up here.</p>`}
      </div>`;
    $("#ll-add").onclick = () => openLiftSheet();
    $$(".ll-list li", box).forEach((li) => (li.onclick = () => openLiftHistory(li.dataset.sl)));
  }
  function openLiftHistory(sl) {
    const r = G.lifts.board[sl], item = G.items[sl];
    const hist = Object.entries(state.lifts[sl] || {}).sort(([a], [b]) => b.localeCompare(a));
    openSheet(`${r.fig && hasFigure(r.fig) ? `<div class="fig-big">${figureSvg(r.fig, true)}</div>` : ""}
      <h2>${esc(r.n)}</h2><p class="fig-sets">${esc(T.pbShort)} ${r.best} lb · ${md(r.bestD)}</p>
      <canvas class="mini-chart" id="lh-chart"></canvas>
      <ul class="hist">${hist.map(([d, s]) => `<li><span>${md(d)}${s.w === r.best && d === r.bestD ? " 🏆" : ""}</span><span><b>${s.w} lb</b> × ${s.reps || (item ? repsOf(item.s) : 10)} · ${(s.sets || []).filter((x) => x === 1).length}/${(s.sets || []).length} sets <button type="button" class="del" data-d="${d}">×</button></span></li>`).join("")}</ul>
      <div class="sheet-row"><button type="button" class="btn" id="lh-log">Log again</button><button value="close" class="btn primary">Done</button></div>`,
    (f) => {
      $("#lh-log", f).onclick = () => { $("#sheet").close(); setTimeout(() => openLiftSheet(r.n), 50); };
      $$(".del", f).forEach((b) => (b.onclick = () => {
        if (!confirm("Delete this session?")) return;
        delete state.lifts[sl][b.dataset.d]; if (!Object.keys(state.lifts[sl]).length) delete state.lifts[sl];
        save(); $("#sheet").close(); render();
      }));
      const pts = hist.filter(([, s]) => (s.sets || []).some((x) => x === 1)).reverse();
      const cv = $("#lh-chart", f);
      requestAnimationFrame(() => {
        if (pts.length < 2) { cv.remove(); return; }
        const { c, W, H } = setupCanvas(cv);
        const vals = pts.map(([, s]) => s.w), lo = Math.min(...vals) * 0.95, hi = Math.max(...vals) * 1.05 || 1;
        const x = (i) => 10 + (i / (pts.length - 1)) * (W - 20), y = (v) => 10 + (1 - (v - lo) / (hi - lo || 1)) * (H - 20);
        c.strokeStyle = css("--accent"); c.lineWidth = 2.5; c.beginPath(); vals.forEach((v, i) => (i ? c.lineTo : c.moveTo).call(c, x(i), y(v))); c.stroke();
        c.fillStyle = css("--accent"); vals.forEach((v, i) => { c.beginPath(); c.arc(x(i), y(v), 3, 0, 7); c.fill(); });
      });
    });
  }

  /* cardio */
  function renderCardio() {
    const box = $("#train-body");
    const wkMi = G.weekMi[G.thisWeek] || 0;
    const list = [...state.cardio].sort((a, b) => b.d.localeCompare(a.d) || b.id.localeCompare(a.id));
    const runs = state.cardio.filter((c) => c.type === "run" && c.min > 0 && c.mi >= 1);
    const bestPace = runs.length ? Math.min(...runs.map((c) => c.min / c.mi)) : null;
    const partnerName = state.partner?.n || T.partnerName;
    box.innerHTML = `
      <div class="panel">
        <div class="panel-tag">${esc(T.cardioTag)}</div>
        <form id="cf" class="cardio-form">
          <div class="seg wide" id="cf-type"><button type="button" data-t="walk" class="${cardioType === "walk" ? "on" : ""}">${cfg.walkIcon} Walk</button><button type="button" data-t="run" class="${cardioType === "run" ? "on" : ""}">${cfg.runIcon} Run</button></div>
          <div class="sheet-row"><label>Miles<input id="cf-mi" type="number" inputmode="decimal" step="0.01" min="0.01" max="100" placeholder="0.0" required></label>
            <label>Minutes<input id="cf-min" type="number" inputmode="decimal" step="1" min="1" max="1440" placeholder="0" required></label></div>
          <label class="toggle"><span>${esc(T.togetherLabel(partnerName))}<small>×${XP.together} ${esc(cfg.xpName)}</small></span><span class="switch"><input type="checkbox" id="cf-tg"><i></i></span></label>
          <div class="sheet-row"><label>Day<select id="cf-d">${[0, 1, 2, 3, 4, 5, 6].map((k) => { const d = addDays(ymd(), -k); return `<option value="${d}">${k === 0 ? "Today" : k === 1 ? "Yesterday" : wmd(d)}</option>`; }).join("")}</select></label>
            <div class="cf-prev"><p class="label">Pace</p><p class="mid" id="cf-pace">—</p><p class="xp-prev" id="cf-xp"></p></div></div>
          <button class="btn primary" type="submit">Save ${esc(T.cardioWord)}</button>
        </form>
      </div>
      <div class="panel">
        <div class="card-head"><h2>This week</h2><span class="muted small">${G.weekStreak} ${G.weekStreak === 1 ? "week" : "weeks"} in a row ${cfg.weekStreakIcon}</span></div>
        <p class="miles-n">${mi1(wkMi)}<small> / ${mi1(G.goalMi)} mi</small></p>
        <div class="bar big"><div class="bar-fill" style="width:${Math.min(100, (wkMi / G.goalMi) * 100)}%"></div></div>
        <div class="week-grid four">
          <div><p class="label">Total</p><p class="mid">${mi1(G.miles)}<small> mi</small></p></div>
          <div><p class="label">Together</p><p class="mid">${mi1(G.togetherMi)}<small> mi</small></p></div>
          <div><p class="label">Longest</p><p class="mid">${mi1(G.metrics.bestSession)}<small> mi</small></p></div>
          <div><p class="label">Best run pace</p><p class="mid">${fmtPace(bestPace)}</p></div>
        </div>
      </div>
      <div class="panel"><div class="card-head"><h2>Log</h2></div>
        ${list.length ? `<ul class="c-list">${list.slice(0, 40).map((c) => `<li><span class="c-ic">${c.type === "run" ? cfg.runIcon : cfg.walkIcon}</span>
          <div><b>${mi1(c.mi)} mi ${c.type}</b>${c.together ? ` <span class="tg">${esc(T.togetherTag)}</span>` : ""}<small>${wmd(c.d)} · ${Math.round(c.min)} min · ${fmtPace(paceOf(c.mi, c.min))} /mi</small></div>
          <span class="c-xp">+${cardioXP(c)}</span><button class="del" data-id="${c.id}" aria-label="Delete">×</button></li>`).join("")}</ul>` : `<p class="muted">${esc(T.cardioEmpty)}</p>`}
      </div>`;
    const prev = () => {
      const mi = parseFloat($("#cf-mi").value) || 0, min = parseFloat($("#cf-min").value) || 0, tg = $("#cf-tg").checked;
      $("#cf-pace").textContent = mi && min ? `${fmtPace(paceOf(mi, min))} /mi` : "—";
      $("#cf-xp").textContent = mi ? `+${cardioXP({ mi, type: cardioType, together: tg })} ${cfg.xpName}` : "";
    };
    $$("#cf-type button").forEach((b) => (b.onclick = () => { cardioType = b.dataset.t; $$("#cf-type button").forEach((x) => x.classList.toggle("on", x === b)); prev(); }));
    ["#cf-mi", "#cf-min", "#cf-tg"].forEach((s) => ($(s).oninput = prev));
    $("#cf").onsubmit = (e) => {
      e.preventDefault();
      const mi = parseFloat($("#cf-mi").value), min = parseFloat($("#cf-min").value);
      if (!(mi > 0) || !(min > 0)) return;
      const c = { id: `${Date.now().toString(36)}`, d: $("#cf-d").value, type: cardioType, mi: Math.round(mi * 100) / 100, min, together: $("#cf-tg").checked };
      state.cardio.push(c); save(); document.activeElement.blur();
      toast(`${mi1(c.mi)} mi ${c.type} logged · ${fmtPace(paceOf(c.mi, c.min))} /mi · +${cardioXP(c)} ${esc(cfg.xpName)}`, 2800);
      const before = (G.weekMi[weekStart(c.d)] || 0);
      render();
      if (before < G.goalMi && (G.weekMi[weekStart(c.d)] || 0) >= G.goalMi) setTimeout(() => toast(`${esc(T.weekGoalHit)} +${XP.weekGoal} ${esc(cfg.xpName)}`, 3200), 2900);
    };
    $$(".c-list .del", box).forEach((b) => (b.onclick = () => {
      if (!confirm("Delete this entry?")) return;
      state.cardio = state.cardio.filter((c) => c.id !== b.dataset.id); save(); render();
    }));
  }

  /* rest timer */
  let restEnd = 0, restLen = 0, restT = null;
  function startRest() { restLen = (state.settings.rest || 90) * 1000; restEnd = Date.now() + restLen; $("#rest").hidden = false; clearInterval(restT); restT = setInterval(tickRest, 200); tickRest(); }
  function stopRest() { clearInterval(restT); $("#rest").hidden = true; }
  function tickRest() {
    const left = restEnd - Date.now();
    if (left <= 0) { stopRest(); beep(); toast(T.restDone, 2000); if (navigator.vibrate) navigator.vibrate([80, 60, 80]); return; }
    const s = Math.ceil(left / 1000);
    $("#rest-t").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    $("#rest-bar").style.width = `${(left / restLen) * 100}%`;
  }
  $("#rest-add").onclick = () => { restEnd += 15000; restLen += 15000; };
  $("#rest-skip").onclick = stopRest;
  function beep() {
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.18].forEach((t) => { const o = a.createOscillator(), g = a.createGain(); o.frequency.value = 880; o.connect(g); g.connect(a.destination);
        g.gain.setValueAtTime(0.0001, a.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, a.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.15);
        o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.16); });
    } catch {}
  }

  /* =========================================================
     BOSSES / PARTY / LOOT
     ========================================================= */
  function bossCard(b) {
    const p = b.duo && state.partner ? `<div class="duo-split"><span style="width:${Math.min(100, ((b.metric === "duoMi" ? G.miles : G.lifts.lbs) / b.target) * 100)}%" class="me"></span><span style="width:${Math.min(100, ((b.metric === "duoMi" ? state.partner.mi : state.partner.lb) / b.target) * 100)}%" class="them"></span></div>
      <p class="fine">You ${b.metric === "duoMi" ? `${mi1(G.miles)} mi` : `${num(G.lifts.lbs)} lb`} · ${esc(state.partner.n)} ${b.metric === "duoMi" ? `${mi1(state.partner.mi)} mi` : `${num(state.partner.lb)} lb`}</p>` : "";
    const loot = cfg.loot.find((l) => l.boss === b.id);
    return `<div class="boss ${b.earned ? "won" : ""}">
      <div class="b-icon">${b.icon}</div>
      <div class="b-body">
        <p class="b-name">${esc(b.name)}</p>
        <p class="b-desc">${esc(b.desc)}</p>
        ${b.earned ? `<p class="b-won">${esc(T.bossWon)} · ${md(b.earned)}</p>` : `<div class="hp"><i style="width:${100 - b.pct}%"></i></div><p class="fine">${bossProgressText(b)}</p>`}
        ${p}
        <p class="b-reward">+${b.xp} ${esc(cfg.xpName)}${loot ? ` · ${loot.icon} ${esc(loot.name)}` : ""}</p>
      </div></div>`;
  }
  function renderBosses() {
    const v = $("#view-bosses");
    const solo = G.bosses.filter((b) => !b.duo), duo = G.bosses.filter((b) => b.duo);
    const won = G.bosses.filter((b) => b.earned).length;
    const P = state.partner;
    v.innerHTML = `
      <div class="panel sys"><p class="sys-head">${esc(T.bossHead)}</p><p class="sys-sub" style="margin-bottom:0">${esc(T.bossSub)} · ${won}/${G.bosses.length} ${esc(T.bossCleared)}</p></div>
      ${(() => { const groups = []; solo.forEach((b) => { const g = b.group || "Training"; let x = groups.find((y) => y.g === g); if (!x) groups.push((x = { g, list: [] })); x.list.push(b); });
        return groups.map((x) => `${groups.length > 1 ? `<p class="label gate-group">${esc(x.g)} · ${x.list.filter((b) => b.earned).length}/${x.list.length}</p>` : ""}<div class="boss-list">${x.list.map(bossCard).join("")}</div>`).join(""); })()}

      <div class="panel party">
        <div class="panel-tag">${esc(T.duoTag)}</div>
        <div class="party-row">
          <div class="pm"><span class="pm-av">${cfg.emblem(G.rank)}</span><b>${esc(state.name)}</b><small>${esc(T.lv)} ${G.level} · ${mi1(G.miles)} mi · ${num(G.lifts.lbs)} lb</small></div>
          <span class="pm-amp">${cfg.duoIcon}</span>
          <div class="pm"><span class="pm-av other">${P ? esc((P.n || "?")[0]) : "?"}</span><b>${P ? esc(P.n) : esc(T.partnerName)}</b><small>${P ? `LV ${P.lv} · ${mi1(P.mi)} mi · ${num(P.lb)} lb` : "Not synced yet"}</small></div>
        </div>
        ${P ? `<p class="fine center">Last synced ${new Date(P.t).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · ${mi1(P.tg)} mi together on their side</p>` : ""}
        <div class="boss-list">${duo.map(bossCard).join("")}</div>
        <h3>${esc(T.syncHead)}</h3>
        <p class="muted small">${esc(T.syncHelp)}</p>
        <div class="two"><button class="btn primary" id="code-make">${esc(T.syncSend)}</button><button class="btn" id="code-paste">${esc(T.syncGet)}</button></div>
        <p class="fine">The code only holds your name, miles, pounds lifted, level and miles together.</p>
      </div>

      <div class="panel">
        <div class="card-head"><h2>${esc(T.lootHead)}</h2><span class="muted small">${cfg.loot.filter((l) => state.earned[l.id]).length}/${cfg.loot.length}</span></div>
        <div class="loot-grid">${cfg.loot.map((l) => { const e = state.earned[l.id];
          return `<button type="button" class="loot ${e ? "on" : ""} ${state.title === l.id ? "eq" : ""}" data-id="${l.id}"><i>${e ? l.icon : "?"}</i><b>${e ? esc(l.name) : "???"}</b><small>${esc(l.how)}</small>${e && l.title ? `<em>“${esc(l.title)}”</em>` : ""}</button>`; }).join("")}</div>
        <p class="fine">${esc(T.lootHelp)}</p>
      </div>`;
    $("#code-make").onclick = async () => {
      const code = makeCode(cfg, G, state);
      const text = T.syncMessage(code);
      try { if (navigator.share) { await navigator.share({ text }); return; } } catch (e) { if (e?.name === "AbortError") return; }
      try { await navigator.clipboard.writeText(text); toast("Code copied — paste it in a text"); }
      catch { openSheet(`<h2>Your code</h2><textarea class="code-box" readonly>${esc(text)}</textarea><button value="close" class="btn primary">Done</button>`, (f) => $("textarea", f).select()); }
    };
    $("#code-paste").onclick = () => openSheet(`<h2>${esc(T.syncGet)}</h2><p class="muted small">Paste the whole message they texted you.</p>
      <textarea class="code-box" id="code-in" placeholder="${esc(cfg.partnerPrefix)}-…"></textarea>
      <div class="sheet-row"><button value="cancel" class="btn">Cancel</button><button value="save" class="btn primary">Update</button></div>`,
      null, (rv) => {
        if (rv !== "save") return;
        try {
          const p = readCode($("#code-in").value);
          if (p.app === cfg.id) { toast("That's your own code — paste theirs"); return; }
          state.partner = p; save(); render(); toast(T.syncDone(p.n), 3000);
        } catch { toast("That code didn't work — copy the whole thing"); }
      });
    $$(".loot.on", v).forEach((b) => (b.onclick = () => {
      const l = cfg.loot.find((x) => x.id === b.dataset.id);
      if (!l.title) return;
      state.title = state.title === l.id ? null : l.id; save(); renderBosses();
      toast(state.title ? `${T.titleEquipped}: ${esc(l.title)}` : "Title removed");
    }));
  }

  /* =========================================================
     BODY
     ========================================================= */
  let range = 90, tapIdx = null, calOffset = 0;
  function renderBody() {
    const v = $("#view-body");
    const s = G.body;
    const today = state.weights.find((e) => e.d === ymd());
    const t = state.settings.kcal, tp = state.settings.protein;
    const calDate = addDays(ymd(), calOffset), calRec = state.cals[calDate];
    const todayCal = state.cals[ymd()];
    const last7 = [...Array(7)].map((_, i) => state.cals[addDays(ymd(), -i)]).filter((x) => x?.kcal);
    const avg = last7.length ? last7.reduce((a, x) => a + x.kcal, 0) / last7.length : null;
    const pr = last7.filter((x) => x.protein), avgP = pr.length ? pr.reduce((a, x) => a + x.protein, 0) / pr.length : null;
    const m = maintenance(state);
    const w = [...s.w].reverse();
    v.innerHTML = `
      <div class="panel hero">
        <div class="panel-tag">${esc(T.bodyTag)}</div>
        <div class="hero-row">
          <div><p class="label">Lost so far</p><p class="big">${s.lost == null ? "—" : `${fmt(Math.max(0, s.lost))}<small>lb</small>`}</p>
            ${s.eta ? `<p class="proj">At this pace you hit <b>${fmt(state.goal)}</b> around <b>${s.eta.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</b></p>` : ""}</div>
          <div class="ring-wrap"><svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" style="stroke-dashoffset:${326.7 * (1 - s.pct / 100)}"/></svg>
            <div class="ring-text"><span>${Math.round(s.pct)}%</span><small>to goal</small></div></div>
        </div>
        <div class="stat-grid">
          <div><p class="label">Start</p><p class="mid">${fmt(s.start)}</p></div><div><p class="label">Current</p><p class="mid">${fmt(s.cur)}</p></div>
          <div><p class="label">Goal</p><p class="mid">${fmt(state.goal)}</p></div><div><p class="label">To go</p><p class="mid">${state.goal != null && s.cur != null ? fmt(Math.max(0, s.cur - state.goal)) : "—"}</p></div>
        </div>
        <form id="weigh-form" class="weigh-form">
          <div class="weigh-row"><input id="weigh-input" type="number" inputmode="decimal" step="0.1" min="50" max="700" placeholder="Today's weight" value="${today ? today.w : ""}" required><span class="unit">lb</span><button type="submit" class="btn primary">${today ? "Update" : "Log"}</button></div>
          <input id="weigh-note" class="note-in" type="text" maxlength="140" placeholder="Note (optional) — e.g. after travel, salty dinner" value="${esc(today?.note || "")}">
        </form>
        ${extra.bodyNote?.(ctx) || ""}
      </div>

      <div class="panel">
        <div class="card-head"><h2>Weight</h2><div class="seg" id="range-seg">${[[30, "1M"], [90, "3M"], [0, "All"]].map(([r, l]) => `<button data-r="${r}" class="${range === r ? "on" : ""}">${l}</button>`).join("")}</div></div>
        <div class="chart-wrap"><canvas id="chart"></canvas><p class="empty" id="chart-empty">Log two weigh-ins to see your graph.</p></div>
        <div class="mini-stats">
          <div><p class="label">This week</p><p class="mid ${s.week < 0 ? "down" : s.week > 0 ? "up" : ""}">${signed(s.week)}</p></div>
          <div><p class="label">Avg / week</p><p class="mid ${s.rate < 0 ? "down" : s.rate > 0 ? "up" : ""}">${signed(s.rate)}</p></div>
          <div><p class="label">Weigh-ins</p><p class="mid">${state.weights.length}</p></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-tag">${esc(T.calTag)}</div>
        <div class="card-head"><h2>${esc(T.calHead)}</h2><div class="seg" id="cal-day"><button data-o="0" class="${calOffset === 0 ? "on" : ""}">Today</button><button data-o="-1" class="${calOffset === -1 ? "on" : ""}">Yesterday</button></div></div>
        <p class="muted small">${esc(T.calHint)}</p>
        <form id="cal-form" class="fuel-form">
          <label><span>Calories</span><input id="cal-kcal" type="number" inputmode="numeric" placeholder="kcal" min="0" max="10000" value="${calRec?.kcal ?? ""}"></label>
          <label><span>Protein</span><input id="cal-protein" type="number" inputmode="numeric" placeholder="grams" min="0" max="600" value="${calRec?.protein ?? ""}"></label>
          <button class="btn primary" type="submit">Save</button>
        </form>
        <div class="cal-sum">
          <p class="fuel-num">${todayCal ? num(todayCal.kcal) : "—"}<small> ${t ? `/ ${num(t)} kcal today` : "kcal today"}</small></p>
          ${t ? `<div class="meter"><i class="${todayCal && todayCal.kcal > t ? "over" : ""}" style="width:${t && todayCal ? Math.min(100, (todayCal.kcal / t) * 100) : 0}%"></i></div>` : `<p class="fine">Set a calorie target in Settings to track it here.</p>`}
          <div class="mini-stats"><div><p class="label">7-day avg</p><p class="mid">${avg ? num(avg) : "—"}</p></div>
            <div><p class="label">Protein avg</p><p class="mid">${avgP ? `${num(avgP)}g` : "—"}${tp && avgP ? `<small> / ${tp}</small>` : ""}</p></div>
            <div><p class="label">Logged</p><p class="mid">${last7.length}/7</p></div></div>
        </div>
        <div class="chart-wrap small"><canvas id="cal-chart"></canvas><p class="empty" id="cal-empty">Log a few days to see the chart.</p></div>
        ${m.ok ? `<div class="analysis"><p class="label">Your real maintenance</p><p class="mid big-ish">${num(m.tdee)} <small>kcal/day</small></p>
          <p class="fine">Averaging ${num(m.avg)} kcal while trending ${signed(m.perWeek)} lb/week. About 500 under maintenance (${num(m.tdee - 500)}) is roughly 1 lb a week. It's an estimate that gets better the more you log.</p></div>`
          : `<p class="fine">Log calories on 10+ days and weigh in 4+ times over 2 weeks, and the app works out your real maintenance calories (${m.logs}/10 · ${m.w}/4).</p>`}
      </div>

      <div class="panel">
        <div class="card-head"><h2>Weigh-ins</h2></div>
        ${w.length ? `<ul class="log-list">${w.map((e, i) => { const prev = w[i + 1], diff = prev ? e.w - prev.w : null;
          return `<li><div><div class="log-w">${fmt(e.w)} lb</div><div class="log-date">${parse(e.d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</div>${e.note ? `<div class="log-note">${esc(e.note)}</div>` : ""}</div>
            <span class="log-d ${diff < 0 ? "down" : diff > 0 ? "up" : ""}">${diff == null ? "" : signed(diff)}</span><button class="del" data-d="${e.d}" aria-label="Delete">×</button></li>`; }).join("")}</ul>`
          : `<p class="muted">No weigh-ins yet.</p>`}
      </div>`;
    $("#weigh-form").onsubmit = (e) => {
      e.preventDefault();
      const wv = parseFloat($("#weigh-input").value); if (!wv) return;
      const d = ymd(), note = $("#weigh-note").value.trim(), had = state.weights.some((x) => x.d === d);
      state.weights = state.weights.filter((x) => x.d !== d).concat({ d, w: wv, ...(note ? { note } : {}) });
      if (state.start == null) state.start = wv;
      save(); document.activeElement.blur(); render(); toast(had ? "Weigh-in updated" : `${esc(T.weighed)} +${XP.weighIn} ${esc(cfg.xpName)}`);
    };
    $$("#range-seg button").forEach((b) => (b.onclick = () => { range = +b.dataset.r; tapIdx = null; $$("#range-seg button").forEach((x) => x.classList.toggle("on", x === b)); drawWeight(); }));
    $$("#cal-day button").forEach((b) => (b.onclick = () => { calOffset = +b.dataset.o; renderBody(); }));
    $("#cal-form").onsubmit = (e) => {
      e.preventDefault();
      const kcal = parseInt($("#cal-kcal").value), protein = parseInt($("#cal-protein").value), d = addDays(ymd(), calOffset);
      if (!kcal) { delete state.cals[d]; save(); render(); toast("Calorie log cleared"); return; }
      const had = !!state.cals[d];
      state.cals[d] = { kcal, ...(protein ? { protein } : {}) };
      save(); document.activeElement.blur(); render();
      toast(had ? "Calories updated" : `Calories logged +${XP.cal} ${esc(cfg.xpName)}${t && kcal <= t ? ` · on target +${XP.calOnTarget}` : ""}`, 2600);
    };
    $$(".log-list .del", v).forEach((b) => (b.onclick = () => { if (!confirm("Delete this weigh-in?")) return; state.weights = state.weights.filter((x) => x.d !== b.dataset.d); save(); render(); }));
    $("#chart").onpointerdown = (e) => {
      const cv = e.currentTarget; if (!cv._data) return;
      const mx = e.clientX - cv.getBoundingClientRect().left;
      let best = 0, bd = Infinity; cv._data.forEach((d, i) => { const dd = Math.abs(cv._x(d.d) - mx); if (dd < bd) { bd = dd; best = i; } });
      tapIdx = best; drawWeight();
    };
    drawWeight(); drawCals();
    extra.bindBody?.(ctx);
  }

  function drawWeight() {
    const cv = $("#chart"); if (!cv) return;
    let data = G.body.w;
    if (range) { const cut = Date.now() - range * DAY_MS; data = data.filter((e) => parse(e.d).getTime() >= cut); }
    $("#chart-empty").hidden = data.length >= 2;
    const { c, W, H } = setupCanvas(cv);
    if (data.length < 2) return;
    const accent = css("--accent"), line = css("--line"), mid = css("--mid"), gold = css("--goal") || css("--gold");
    const pad = { l: 40, r: 14, t: 16, b: 26 };
    const vals = data.map((e) => e.w); if (state.goal != null) vals.push(state.goal);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const span = Math.max(hi - lo, 4); lo -= span * 0.12; hi += span * 0.12;
    const t0 = parse(data[0].d).getTime(), t1 = parse(data.at(-1).d).getTime();
    const x = (d) => pad.l + ((parse(d).getTime() - t0) / Math.max(t1 - t0, 1)) * (W - pad.l - pad.r);
    const y = (v) => pad.t + (1 - (v - lo) / (hi - lo)) * (H - pad.t - pad.b);
    extra.chartUnderlay?.(ctx, c, { x, pad, W, H, data });
    c.font = `11px ${css("--font-body") || "sans-serif"}`; c.fillStyle = mid; c.strokeStyle = line; c.lineWidth = 1; c.textAlign = "right"; c.textBaseline = "middle";
    for (let i = 0; i <= 3; i++) { const vv = lo + ((hi - lo) * i) / 3, yy = y(vv); c.beginPath(); c.moveTo(pad.l, yy); c.lineTo(W - pad.r, yy); c.stroke(); c.fillText(Math.round(vv), pad.l - 8, yy); }
    c.textAlign = "center"; c.textBaseline = "top";
    c.fillText(md(data[0].d), x(data[0].d) + 14, H - pad.b + 8); c.fillText(md(data.at(-1).d), x(data.at(-1).d) - 14, H - pad.b + 8);
    if (state.goal != null) {
      c.setLineDash([5, 5]); c.strokeStyle = gold; c.beginPath(); c.moveTo(pad.l, y(state.goal)); c.lineTo(W - pad.r, y(state.goal)); c.stroke(); c.setLineDash([]);
      c.fillStyle = gold; c.textAlign = "right"; c.textBaseline = "bottom"; c.fillText("goal", W - pad.r, y(state.goal) - 3);
    }
    const grad = c.createLinearGradient(0, pad.t, 0, H - pad.b); grad.addColorStop(0, accent + "50"); grad.addColorStop(1, accent + "00");
    c.beginPath(); c.moveTo(x(data[0].d), H - pad.b); data.forEach((e) => c.lineTo(x(e.d), y(e.w))); c.lineTo(x(data.at(-1).d), H - pad.b); c.closePath(); c.fillStyle = grad; c.fill();
    c.beginPath(); data.forEach((e, i) => (i ? c.lineTo : c.moveTo).call(c, x(e.d), y(e.w))); c.strokeStyle = accent; c.lineWidth = 2.5; c.lineJoin = "round"; c.stroke();
    c.fillStyle = accent; data.forEach((e) => { if (e.note) { c.beginPath(); c.arc(x(e.d), y(e.w), 2.5, 0, 7); c.fill(); } });
    const p = data[Math.min(tapIdx ?? data.length - 1, data.length - 1)], px = x(p.d), py = y(p.w);
    c.beginPath(); c.arc(px, py, 5, 0, Math.PI * 2); c.fill();
    const txt = `${fmt(p.w)} · ${md(p.d)}${p.note ? ` · ${p.note.slice(0, 24)}` : ""}`;
    c.font = `600 12px ${css("--font-body") || "sans-serif"}`; const tw = Math.min(c.measureText(txt).width + 16, W - pad.l - pad.r);
    const bx = Math.min(Math.max(px - tw / 2, pad.l), W - pad.r - tw), by = Math.max(py - 34, 0);
    c.fillStyle = css("--tip-bg"); c.beginPath(); c.roundRect(bx, by, tw, 24, 8); c.fill();
    c.fillStyle = css("--tip-ink"); c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(txt, bx + 8, by + 12, tw - 16);
    cv._x = x; cv._data = data;
  }
  function drawCals() {
    const cv = $("#cal-chart"); if (!cv) return;
    const days = [...Array(21)].map((_, i) => addDays(ymd(), i - 20));
    const vals = days.map((d) => state.cals[d]?.kcal || 0);
    $("#cal-empty").hidden = vals.filter(Boolean).length >= 2;
    const { c, W, H } = setupCanvas(cv);
    if (vals.filter(Boolean).length < 2) return;
    const t = state.settings.kcal, pad = { l: 36, r: 8, t: 10, b: 20 };
    const hi = Math.max(...vals, t || 0) * 1.1, bw = (W - pad.l - pad.r) / days.length;
    const y = (v) => pad.t + (1 - v / hi) * (H - pad.t - pad.b);
    c.font = `10px ${css("--font-body") || "sans-serif"}`; c.fillStyle = css("--mid"); c.textAlign = "right"; c.textBaseline = "middle";
    [0, 0.5, 1].forEach((f) => c.fillText(Math.round((hi * f) / 100) * 100, pad.l - 6, y(hi * f)));
    days.forEach((d, i) => { if (!vals[i]) return; c.fillStyle = t && vals[i] > t ? css("--up") : css("--accent");
      c.beginPath(); c.roundRect(pad.l + i * bw + bw * 0.18, y(vals[i]), bw * 0.64, H - pad.b - y(vals[i]), 3); c.fill(); });
    if (t) { c.setLineDash([4, 4]); c.strokeStyle = css("--goal") || css("--gold"); c.beginPath(); c.moveTo(pad.l, y(t)); c.lineTo(W - pad.r, y(t)); c.stroke(); c.setLineDash([]); }
    c.fillStyle = css("--mid"); c.textAlign = "center"; c.textBaseline = "top";
    [0, 10, 20].forEach((i) => c.fillText(md(days[i]), pad.l + i * bw + bw / 2, H - pad.b + 5));
  }
  window.addEventListener("resize", () => { if (current === "body") { drawWeight(); drawCals(); } });

  /* =========================================================
     SETTINGS + BACKUP
     ========================================================= */
  function openSettings() {
    const st = state.settings;
    openSheet(`<h2>Settings</h2>
      <label>Name<input id="s-name" type="text" value="${esc(state.name)}"></label>
      <div class="sheet-row"><label>Start weight (lb)<input id="s-start" type="number" step="0.1" inputmode="decimal" value="${state.start ?? ""}"></label>
        <label>Goal weight (lb)<input id="s-goal" type="number" step="0.1" inputmode="decimal" value="${state.goal ?? ""}"></label></div>
      <div class="sheet-row"><label>Calorie target<input id="s-kcal" type="number" inputmode="numeric" value="${st.kcal ?? ""}" placeholder="${esc(T.calTargetHint)}"></label>
        <label>Protein target (g)<input id="s-protein" type="number" inputmode="numeric" value="${st.protein ?? ""}"></label></div>
      <div class="sheet-row"><label>Weekly miles goal<input id="s-mi" type="number" inputmode="decimal" step="0.5" min="1" max="200" value="${st.weeklyMi ?? cfg.weeklyMi}"></label>
        <label>Rest timer (sec)<input id="s-rest" type="number" inputmode="numeric" min="15" max="600" value="${st.rest ?? 90}"></label></div>
      ${extra.settingsHtml?.(ctx) || ""}
      <h3>Backup</h3>
      <p class="muted small">Everything lives only on this phone. Export a backup now and then.</p>
      <div class="sheet-row"><button type="button" class="btn" id="s-export">Export backup</button><label class="btn file-btn">Import<input type="file" id="s-import" accept="application/json" hidden></label></div>
      <div class="sheet-row"><button value="cancel" class="btn">Cancel</button><button value="save" class="btn primary">Save</button></div>`,
    (f) => {
      extra.bindSettings?.(ctx, f);
      $("#s-export", f).onclick = () => {
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${cfg.id}-backup-${ymd()}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      };
      $("#s-import", f).onchange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          if (!Array.isArray(data.weights)) throw 0;
          const earned = { ...data.earned, ...state.earned }; // never lose something you earned
          state = migrate(data, cfg, extra.defaults || {}); state.earned = earned; state.seenLevel = null;
          save(); $("#sheet").close(); update({ silent: true }); show(cfg.tabs[0].id); toast("Backup restored");
        } catch { toast("That file didn't work"); }
      };
    }, (rv) => {
      if (rv !== "save") return;
      const n = (v) => (v === "" ? null : parseFloat(v));
      state.name = $("#s-name").value.trim() || cfg.defaultName;
      state.start = n($("#s-start").value); state.goal = n($("#s-goal").value);
      state.settings.kcal = n($("#s-kcal").value); state.settings.protein = n($("#s-protein").value);
      state.settings.weeklyMi = Math.min(200, Math.max(1, n($("#s-mi").value) || cfg.weeklyMi));
      state.settings.rest = Math.min(600, Math.max(15, parseInt($("#s-rest").value) || 90));
      extra.saveSettings?.(ctx);
      save(); render(); toast("Settings saved");
    });
  }

  /* ---------- boot ---------- */
  ctx.setState = (s) => { state = s; };
  extra.init?.(ctx);
  show(cfg.tabs[0].id);
  extra.boot?.(ctx);
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  document.addEventListener("visibilitychange", () => { if (!document.hidden) render(); });
  return ctx;
}
