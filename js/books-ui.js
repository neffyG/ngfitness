// Books — a private Goodreads/StoryGraph: shelves, progress, timer, challenge, ratings, reviews, quotes, stats.
import { ymd, addDays, between, parse } from "./engine.js";
import { LXP, uid } from "./life.js";

const SHELVES = { reading: "Reading", want: "Want to read", read: "Read", dnf: "Did not finish" };
const MOODS = ["adventurous", "challenging", "dark", "emotional", "funny", "hopeful", "informative", "inspiring", "lighthearted", "mysterious", "reflective", "sad", "tense"];
const FORMATS = { print: "Print", ebook: "E-book", audio: "Audiobook" };
let seg = "reading", shelfF = "all", query = "", sortBy = "recent", tagF = "", statYear = String(new Date().getFullYear()), tick = null;

/* ---------- small pieces ---------- */
const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
export function cover(b, esc, cls = "") {
  const fb = `<div class="cv-fb" style="--h:${hue(b.t)}"><b>${esc(b.t)}</b><small>${esc(b.a || "")}</small></div>`;
  return `<div class="cv ${cls}">${b.cover ? `<img src="${esc(b.cover)}" alt="" loading="lazy" onerror="this.remove()">` : ""}${fb}</div>`;
}
export const stars = (r) => `<span class="stars" aria-label="${r} stars"><span class="s-bg">★★★★★</span><span class="s-fg" style="width:${(r / 5) * 100}%">★★★★★</span></span>`;
const pct = (b) => (b.pages ? Math.min(100, Math.round(((b.page || 0) / b.pages) * 100)) : 0);
const GENRES = [[/christian|bible|religio|spiritual|church|theolog|prayer/i, "Christian"], [/self-help|personal development|success|habit|motivation/i, "Self-help"], [/biograph|memoir|autobiograph/i, "Biography"],
  [/business|econom|finance|money|leadership|entrepreneur|invest/i, "Business"], [/psycholog/i, "Psychology"], [/history/i, "History"], [/fantasy/i, "Fantasy"], [/science fiction/i, "Sci-fi"],
  [/thriller|mystery|detective|suspense|crime/i, "Thriller"], [/romance|love stories/i, "Romance"], [/horror/i, "Horror"], [/comic|manga|graphic novel/i, "Comics"], [/poetry/i, "Poetry"],
  [/computer|programming|security|software|technology/i, "Tech"], [/education|teaching|mathematic/i, "Education"], [/health|fitness|nutrition|exercise/i, "Health"], [/philosoph/i, "Philosophy"], [/science/i, "Science"], [/fiction|novel/i, "Fiction"]];
const guessGenre = (subs = []) => { const s = subs.slice(0, 25).join(" | "); for (const [re, g] of GENRES) if (re.test(s)) return g; return ""; };
const guessNonfic = (subs = []) => !subs.slice(0, 25).some((x) => /fiction|novel|fantasy/i.test(x) && !/nonfiction|non-fiction/i.test(x));

function newBook(o) {
  return { id: uid(), t: o.t || "Untitled", a: o.a || "", pages: o.pages || null, cover: o.cover || "", isbn: o.isbn || "", shelf: o.shelf || "want", tags: [], genre: o.genre || "", nonfic: o.nonfic ?? true,
    rating: 0, review: "", fmt: "print", series: "", seriesN: "", page: 0, sessions: [], quotes: [], reads: [], mood: [], added: ymd(), started: o.shelf === "reading" ? ymd() : null, q: Date.now(), year: o.year || null };
}

/* =========================================================
   render
   ========================================================= */
export function renderBooks(ctx) {
  const v = ctx.$("#view-books");
  clearInterval(tick);
  v.innerHTML = `<div class="seg wide" id="b-seg">${[["reading", "Reading"], ["shelves", "Shelves"], ["stats", "Stats"], ["quotes", "Quotes"]].map(([k, l]) => `<button data-s="${k}" class="${seg === k ? "on" : ""}">${l}</button>`).join("")}</div><div id="b-body"></div>`;
  v.querySelectorAll("#b-seg button").forEach((b) => (b.onclick = () => { seg = b.dataset.s; renderBooks(ctx); window.scrollTo({ top: 0 }); }));
  ({ reading: bReading, shelves: bShelves, stats: bStats, quotes: bQuotes })[seg](ctx, v.querySelector("#b-body"));
}

/* ---------- Reading ---------- */
function bReading(ctx, box) {
  const { state, G, esc, num, md } = ctx, B = state.books, S = G.life.books, today = ymd(), yr = today.slice(0, 4);
  const goal = B.goals[yr] || 0, done = S.yearBooks[yr] || 0;
  const doy = between(`${yr}-01-01`, today) + 1, diy = between(`${yr}-01-01`, `${+yr + 1}-01-01`);
  const expected = goal ? (goal * doy) / diy : 0, diff = Math.round((done - expected) * 10) / 10;
  const last14 = [...Array(14)].reduce((s, _, i) => s + (S.pagesByDay[addDays(today, -i)] || 0), 0) / 14;
  const up = B.list.filter((b) => b.shelf === "want").sort((a, b) => (a.q || 0) - (b.q || 0));
  const T = B.timer, tb = T && B.list.find((b) => b.id === T.id);
  box.innerHTML = `
    ${tb ? `<div class="panel sys timer-bar"><div><p class="label">Reading now</p><b>${esc(tb.t)}</b></div><p class="pr-clock" id="bt-clock">0:00</p><button class="btn primary" id="bt-stop">■ Stop</button></div>` : ""}
    <div class="panel challenge">
      <div class="panel-tag">${yr} reading challenge</div>
      ${goal ? `<div class="ch-row"><div class="ring-wrap sm"><svg class="ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" class="ring-bg"/><circle cx="60" cy="60" r="52" class="ring-fg" style="stroke-dashoffset:${326.7 * (1 - Math.min(1, done / goal))}"/></svg><div class="ring-text"><span>${done}</span><small>of ${goal}</small></div></div>
        <div><p class="mid">${done >= goal ? "Challenge complete 🎉" : diff >= 0.5 ? `${Math.floor(diff)} book${Math.floor(diff) === 1 ? "" : "s"} ahead of schedule` : diff <= -0.5 ? `${Math.ceil(-diff)} book${Math.ceil(-diff) === 1 ? "" : "s"} behind schedule` : "Right on schedule"}</p>
        <p class="fine">${num(S.pages)} pages all-time · reading streak ${S.readStreak} day${S.readStreak === 1 ? "" : "s"}</p><button class="btn small" id="b-goal">Change goal</button></div></div>`
      : `<p class="muted">How many books do you want to read in ${yr}?</p><button class="btn primary" id="b-goal">Set a reading goal</button>`}
    </div>
    <button class="btn primary wide-btn" id="b-add">+ Add a book</button>
    ${S.reading.length ? S.reading.map((b) => { const left = b.pages ? b.pages - (b.page || 0) : null, eta = left && last14 > 0 ? Math.ceil(left / last14) : null;
      return `<div class="panel cur-book" data-id="${b.id}">
        <div class="cb-row">${cover(b, esc, "md")}
          <div class="cb-info"><b class="cb-t">${esc(b.t)}</b><small>${esc(b.a)}</small>
            <div class="bar"><div class="bar-fill" style="width:${pct(b)}%"></div></div>
            <p class="fine">${b.pages ? `p. ${b.page || 0} of ${b.pages} · ${pct(b)}%` : `p. ${b.page || 0}`}${eta ? ` · done in ~${eta} day${eta === 1 ? "" : "s"}` : ""}</p>
            ${b.nonfic ? `<span class="tag">nonfiction · counts for 75 Hard</span>` : ""}</div></div>
        <div class="cb-btns"><button class="btn small" data-act="page">Update page</button><button class="btn small" data-act="timer" ${T ? "disabled" : ""}>▶ Timer</button><button class="btn small" data-act="done">Finished</button><button class="btn small ghost" data-act="open">⋯</button></div>
      </div>`; }).join("") : `<div class="panel"><p class="muted">Nothing on your Reading shelf. Add a book or start one from Up next.</p></div>`}
    <div class="panel">
      <div class="card-head"><div><h2>Up next</h2><p class="muted small">${up.length} on your want-to-read list</p></div>${up.length ? `<button class="btn small" id="b-jar">🫙 TBR jar</button>` : ""}</div>
      ${up.length ? `<ul class="up-list">${up.slice(0, 6).map((b, i) => `<li data-id="${b.id}">${cover(b, esc, "xs")}<div><b>${esc(b.t)}</b><small>${esc(b.a)}${b.pages ? ` · ${b.pages} p` : ""}</small></div>
        ${i ? `<button class="btn small ghost" data-top="${b.id}" aria-label="Move to top">↑</button>` : ""}<button class="btn small" data-start="${b.id}">Start</button></li>`).join("")}</ul>` : `<p class="muted small">Books you want to read land here. The TBR jar picks one for you.</p>`}
    </div>
    <div class="panel"><div class="card-head"><h2>Recently finished</h2></div>
      ${(() => { const fin = B.list.filter((b) => b.reads?.length).sort((a, b) => b.reads.at(-1).localeCompare(a.reads.at(-1))).slice(0, 4);
        return fin.length ? `<ul class="up-list">${fin.map((b) => `<li data-open="${b.id}">${cover(b, esc, "xs")}<div><b>${esc(b.t)}</b><small>${md(b.reads.at(-1))}${b.rating ? ` · ${stars(b.rating)}` : ""}</small></div></li>`).join("")}</ul>` : `<p class="muted small">Nothing yet — your first finish is worth +${LXP.bookDone} XP.</p>`; })()}
    </div>`;
  const q = (s) => box.querySelector(s), qa = (s) => box.querySelectorAll(s);
  q("#b-goal").onclick = () => setGoal(ctx, yr);
  q("#b-add").onclick = () => openAdd(ctx);
  q("#b-jar") && (q("#b-jar").onclick = () => tbrJar(ctx, up));
  qa("[data-top]").forEach((b) => (b.onclick = () => { const bk = B.list.find((x) => x.id === b.dataset.top); bk.q = Math.min(...up.map((x) => x.q || 0)) - 1; ctx.save(); ctx.render(); }));
  qa("[data-start]").forEach((b) => (b.onclick = () => startBook(ctx, b.dataset.start)));
  qa("[data-open]").forEach((b) => (b.onclick = () => openBook(ctx, b.dataset.open)));
  qa(".cur-book").forEach((el) => {
    const b = B.list.find((x) => x.id === el.dataset.id);
    el.querySelectorAll("[data-act]").forEach((btn) => (btn.onclick = () => {
      const a = btn.dataset.act;
      if (a === "page") updatePage(ctx, b);
      if (a === "timer") { B.timer = { id: b.id, t0: Date.now(), from: b.page || 0 }; ctx.save(); ctx.render(); }
      if (a === "done") finishBook(ctx, b);
      if (a === "open") openBook(ctx, b.id);
    }));
    el.querySelector(".cv").onclick = () => openBook(ctx, b.id);
  });
  if (tb) {
    const draw = () => { const el = document.getElementById("bt-clock"); if (!el) return clearInterval(tick); const s = Math.floor((Date.now() - T.t0) / 1000); el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
    draw(); tick = setInterval(draw, 1000);
    q("#bt-stop").onclick = () => updatePage(ctx, tb, Math.max(1, Math.round((Date.now() - T.t0) / 60000)));
  }
}

function setGoal(ctx, yr) {
  const B = ctx.state.books;
  ctx.openSheet(`<h2>${yr} reading goal</h2><label>Books this year<input type="number" id="g-n" min="1" max="365" value="${B.goals[yr] || 12}"></label>
    <p class="fine">12 is a book a month. 24 is two. 52 is one a week.</p>
    <div class="sheet-row"><button value="cancel" class="btn">Cancel</button><button value="save" class="btn primary">Save</button></div>`, null, (rv) => {
    if (rv !== "save") return; const n = parseInt(document.getElementById("g-n").value); if (n > 0) B.goals[yr] = n; ctx.save(); ctx.render();
  });
}

export function updatePage(ctx, b, minutes = 0) {
  const B = ctx.state.books, { esc } = ctx;
  ctx.openSheet(`<h2>${esc(b.t)}</h2>${minutes ? `<p class="muted">You read for <b>${minutes} min</b>. What page are you on now?</p>` : `<p class="muted">What page are you on?</p>`}
    <div class="weigh-row"><input type="number" id="pg-n" inputmode="numeric" min="0" ${b.pages ? `max="${b.pages}"` : ""} value="${b.page || 0}"><span class="unit">${b.pages ? `/ ${b.pages}` : "page"}</span></div>
    ${b.pages ? `<div class="pr-quick">${[10, 25, 50].map((n) => `<button type="button" class="btn small" data-add="${n}">+${n}</button>`).join("")}<button type="button" class="btn small" data-add="end">End</button></div>` : ""}
    <div class="sheet-row"><button value="cancel" class="btn">${minutes ? "Discard" : "Cancel"}</button><button value="save" class="btn primary">Save</button></div>`, (f) => {
    f.querySelectorAll("[data-add]").forEach((x) => (x.onclick = () => { const i = f.querySelector("#pg-n"); i.value = x.dataset.add === "end" ? b.pages : Math.min(b.pages || 1e5, (+i.value || 0) + +x.dataset.add); }));
    setTimeout(() => f.querySelector("#pg-n").select(), 50);
  }, (rv) => {
    if (minutes || rv === "save") { if (B.timer) B.timer = null; }
    if (rv !== "save") { ctx.save(); ctx.render(); return; }
    const to = Math.max(0, parseInt(document.getElementById("pg-n").value) || 0), from = b.page || 0;
    if (to !== from || minutes) b.sessions.push({ d: ymd(), from, to: Math.max(to, from), min: minutes });
    b.page = to; if (b.shelf !== "reading") { b.shelf = "reading"; b.started ||= ymd(); }
    ctx.save(); ctx.toast(`${Math.max(0, to - from)} pages${minutes ? ` in ${minutes} min` : ""} · +${Math.round(Math.max(0, to - from) * LXP.page)} XP`); ctx.render();
    if (b.pages && to >= b.pages) setTimeout(() => finishBook(ctx, b), 400);
  });
}

function startBook(ctx, id) {
  const b = ctx.state.books.list.find((x) => x.id === id);
  b.shelf = "reading"; b.started = ymd(); b.page = 0; ctx.save(); ctx.render(); ctx.toast(`Started ${ctx.esc(b.t)}`);
}

export function finishBook(ctx, b) {
  const { esc } = ctx;
  if (b.pages && (b.page || 0) < b.pages) b.sessions.push({ d: ymd(), from: b.page || 0, to: b.pages, min: 0 });
  b.page = b.pages || b.page; b.shelf = "read"; b.reads = [...(b.reads || []), ymd()]; b.finished = ymd();
  if (ctx.state.books.timer?.id === b.id) ctx.state.books.timer = null;
  ctx.save(); ctx.render();
  ctx.popup(`<p class="ov-k">[ SYSTEM ]</p><div class="ov-icon">📖</div><h2 class="ov-h">BOOK CLEARED</h2><p class="ov-gold">${esc(b.t)}</p><p class="ov-p">+${LXP.bookDone} XP. Rate it and leave a few thoughts while it's fresh.</p>`);
  setTimeout(() => openBook(ctx, b.id, true), 300);
}

function tbrJar(ctx, up) {
  const { esc } = ctx;
  let b = up[Math.floor(Math.random() * up.length)];
  const draw = (f) => {
    f.innerHTML = `<p class="label center">The jar has spoken</p><div class="jar">${cover(b, esc, "lg")}</div><h2 class="center">${esc(b.t)}</h2><p class="muted center">${esc(b.a)}${b.pages ? ` · ${b.pages} pages` : ""}</p>
      <div class="sheet-row"><button type="button" class="btn" id="jar-again">Shake again</button><button type="button" class="btn primary" id="jar-go">Start reading</button></div><button value="close" class="btn ghost">Close</button>`;
    f.querySelector("#jar-again").onclick = () => { if (up.length > 1) { let n; do n = up[Math.floor(Math.random() * up.length)]; while (n === b); b = n; } draw(f); };
    f.querySelector("#jar-go").onclick = () => { document.getElementById("sheet").close(); startBook(ctx, b.id); };
  };
  ctx.openSheet("", draw);
}

/* ---------- Shelves ---------- */
function bShelves(ctx, box) {
  const { state, esc } = ctx, B = state.books;
  const tags = [...new Set(B.list.flatMap((b) => [...(b.tags || []), b.genre].filter(Boolean)))].sort();
  let list = B.list.filter((b) => shelfF === "all" || b.shelf === shelfF).filter((b) => !tagF || b.genre === tagF || (b.tags || []).includes(tagF));
  if (query) { const qq = query.toLowerCase(); list = list.filter((b) => `${b.t} ${b.a} ${b.series}`.toLowerCase().includes(qq)); }
  const sorters = { recent: (a, b) => (b.reads?.at(-1) || b.started || b.added || "").localeCompare(a.reads?.at(-1) || a.started || a.added || ""), title: (a, b) => a.t.localeCompare(b.t), author: (a, b) => (a.a || "").localeCompare(b.a || ""), rating: (a, b) => (b.rating || 0) - (a.rating || 0), length: (a, b) => (b.pages || 0) - (a.pages || 0) };
  list.sort(sorters[sortBy]);
  const count = (s) => B.list.filter((b) => s === "all" || b.shelf === s).length;
  box.innerHTML = `
    <div class="chip-row shelf-chips">${[["all", "All"], ...Object.entries(SHELVES)].map(([k, l]) => `<button class="chip ${shelfF === k ? "on" : ""}" data-sh="${k}">${l} <i>${count(k)}</i></button>`).join("")}</div>
    <div class="shelf-tools"><input type="search" id="b-q" placeholder="Search your library" value="${esc(query)}">
      <select id="b-sort">${[["recent", "Recent"], ["title", "Title"], ["author", "Author"], ["rating", "Rating"], ["length", "Length"]].map(([k, l]) => `<option value="${k}" ${sortBy === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>
    ${tags.length ? `<div class="chip-row">${tags.map((t) => `<button class="chip sm ${tagF === t ? "on" : ""}" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</div>` : ""}
    ${list.length ? `<div class="shelf-grid">${list.map((b) => `<button class="sg" data-open="${b.id}">${cover(b, esc)}${b.shelf === "reading" ? `<i class="sg-p" style="width:${pct(b)}%"></i>` : ""}<b>${esc(b.t)}</b>${b.rating ? stars(b.rating) : `<small>${esc(SHELVES[b.shelf])}</small>`}</button>`).join("")}</div>`
      : `<div class="panel"><p class="muted">${B.list.length ? "No books match." : "Your library is empty. Add a book, or import your Goodreads library."}</p><button class="btn primary" id="b-add2">+ Add a book</button></div>`}`;
  box.querySelectorAll("[data-sh]").forEach((b) => (b.onclick = () => { shelfF = b.dataset.sh; ctx.render(); }));
  box.querySelectorAll("[data-tag]").forEach((b) => (b.onclick = () => { tagF = tagF === b.dataset.tag ? "" : b.dataset.tag; ctx.render(); }));
  box.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openBook(ctx, b.dataset.open)));
  box.querySelector("#b-sort").onchange = (e) => { sortBy = e.target.value; ctx.render(); };
  const qi = box.querySelector("#b-q"); qi.oninput = () => { query = qi.value; clearTimeout(bShelves._t); bShelves._t = setTimeout(() => { ctx.render(); const n = document.getElementById("b-q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 350); };
  box.querySelector("#b-add2") && (box.querySelector("#b-add2").onclick = () => openAdd(ctx));
}

/* ---------- Stats ---------- */
function bStats(ctx, box) {
  const { state, G, esc, num } = ctx, B = state.books, S = G.life.books;
  const years = [...new Set([String(new Date().getFullYear()), ...Object.keys(S.yearBooks)])].sort().reverse();
  const fin = B.list.flatMap((b) => (b.reads || []).filter((d) => d.startsWith(statYear)).map((d) => ({ b, d })));
  const books = fin.map((x) => x.b);
  const pagesY = Object.entries(S.monthPages).filter(([m]) => m.startsWith(statYear)).reduce((s, [, p]) => s + p, 0);
  const rated = books.filter((b) => b.rating), avgR = rated.length ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : null;
  const avgLen = books.filter((b) => b.pages).length ? books.filter((b) => b.pages).reduce((s, b) => s + b.pages, 0) / books.filter((b) => b.pages).length : null;
  const longest = [...books].sort((a, b) => (b.pages || 0) - (a.pages || 0))[0];
  const fastest = books.map((b) => ({ b, days: b.started ? between(b.started, b.reads.at(-1)) + 1 : null })).filter((x) => x.days > 0).sort((a, b) => a.days - b.days)[0];
  const months = [...Array(12)].map((_, i) => S.monthPages[`${statYear}-${String(i + 1).padStart(2, "0")}`] || 0), mx = Math.max(1, ...months);
  const tally = (arr) => { const o = {}; arr.forEach((k) => k && (o[k] = (o[k] || 0) + 1)); return Object.entries(o).sort((a, b) => b[1] - a[1]); };
  const genres = tally(books.map((b) => b.genre || "Other")), moods = tally(books.flatMap((b) => b.mood || [])), fmts = tally(books.map((b) => FORMATS[b.fmt || "print"]));
  const nf = books.filter((b) => b.nonfic).length;
  const bars = (rows) => { const m = Math.max(1, ...rows.map((r) => r[1])); return `<ul class="hbars">${rows.slice(0, 8).map(([k, n]) => `<li><span>${esc(k)}</span><i style="width:${(n / m) * 100}%"></i><b>${n}</b></li>`).join("")}</ul>`; };
  box.innerHTML = `
    <div class="seg" id="y-seg">${years.map((y) => `<button data-y="${y}" class="${statYear === y ? "on" : ""}">${y}</button>`).join("")}</div>
    <div class="panel"><div class="f-stats">
      <div><b>${books.length}</b><small>books</small></div><div><b>${num(pagesY)}</b><small>pages</small></div><div><b>${avgR ? avgR.toFixed(2) : "—"}</b><small>avg rating</small></div>
      <div><b>${avgLen ? num(avgLen) : "—"}</b><small>avg length</small></div><div><b>${S.pph ? Math.round(S.pph) : "—"}</b><small>pages / hour</small></div><div><b>${Math.round(S.minutes / 60)}</b><small>hours timed</small></div>
    </div><p class="fine">Reading streak ${S.readStreak} · best ${S.bestRead} · ${S.quotes} quotes saved · ${S.reviews} reviews</p></div>
    <div class="panel"><div class="card-head"><h2>Pages by month</h2></div>
      <div class="mini-bars months">${months.map((p, i) => `<div><i class="${p ? "on" : ""}" style="height:${(p / mx) * 100}%"></i><small>${"JFMAMJJASOND"[i]}</small></div>`).join("")}</div></div>
    ${books.length ? `<div class="panel"><div class="card-head"><h2>Genres</h2><span class="muted small">${nf} nonfiction · ${books.length - nf} fiction</span></div>${bars(genres)}</div>
    ${moods.length ? `<div class="panel"><div class="card-head"><h2>Moods</h2></div>${bars(moods)}</div>` : ""}
    <div class="panel"><div class="card-head"><h2>Highlights</h2></div><ul class="hl">
      ${longest ? `<li><span>Longest</span><b>${esc(longest.t)}</b><small>${longest.pages || "?"} pages</small></li>` : ""}
      ${fastest ? `<li><span>Fastest</span><b>${esc(fastest.b.t)}</b><small>${fastest.days} day${fastest.days === 1 ? "" : "s"}</small></li>` : ""}
      ${rated.length ? `<li><span>Top rated</span><b>${esc([...rated].sort((a, b) => b.rating - a.rating)[0].t)}</b><small>${stars([...rated].sort((a, b) => b.rating - a.rating)[0].rating)}</small></li>` : ""}
      <li><span>Formats</span><b>${fmts.map(([k, n]) => `${esc(k)} ${n}`).join(" · ")}</b></li></ul></div>` : `<div class="panel"><p class="muted">Finish a book in ${statYear} to see your stats.</p></div>`}`;
  box.querySelectorAll("#y-seg button").forEach((b) => (b.onclick = () => { statYear = b.dataset.y; ctx.render(); }));
}

/* ---------- Quotes ---------- */
function bQuotes(ctx, box) {
  const { state, esc, md } = ctx;
  const all = state.books.list.flatMap((b) => (b.quotes || []).map((q) => ({ ...q, b }))).sort((a, b) => (b.d || "").localeCompare(a.d || ""));
  box.innerHTML = all.length ? all.map((q) => `<div class="panel quote" data-open="${q.b.id}"><p class="qt">“${esc(q.t)}”</p><p class="fine">— ${esc(q.b.t)}${q.p ? `, p. ${esc(q.p)}` : ""}${q.d ? ` · ${md(q.d)}` : ""}</p></div>`).join("")
    : `<div class="panel"><h2>Quotes & highlights</h2><p class="muted">Open any book and tap “+ Quote” to save a line you want to keep.</p></div>`;
  box.querySelectorAll("[data-open]").forEach((b) => (b.onclick = () => openBook(ctx, b.dataset.open)));
}

/* =========================================================
   book detail / edit
   ========================================================= */
export function openBook(ctx, id, afterFinish = false) {
  const { state, esc, md } = ctx, B = state.books, b = B.list.find((x) => x.id === id); if (!b) return;
  const w = { ...b, tags: [...(b.tags || [])], mood: [...(b.mood || [])], quotes: [...(b.quotes || [])] };
  const draw = (f) => {
    f.innerHTML = `
      <div class="bd-head">${cover(w, esc, "lg")}<div><h2>${esc(w.t)}</h2><p class="muted">${esc(w.a)}</p>
        ${w.reads?.length ? `<p class="fine">Read ${w.reads.length}× · last ${md(w.reads.at(-1))}</p>` : ""}${w.series ? `<p class="fine">${esc(w.series)}${w.seriesN ? ` #${esc(w.seriesN)}` : ""}</p>` : ""}</div></div>
      <p class="label">Rating</p>
      <div class="rate-row">${stars(w.rating)}<b id="r-v">${w.rating ? w.rating.toFixed(2).replace(/0$/, "") : "—"}</b></div>
      <input type="range" id="r-in" min="0" max="5" step="0.25" value="${w.rating || 0}">
      <label>Review<textarea id="bd-rev" rows="3" placeholder="What did you think?">${esc(w.review || "")}</textarea></label>
      <p class="label">Mood</p><div class="chip-row">${MOODS.map((m) => `<button type="button" class="chip sm ${w.mood.includes(m) ? "on" : ""}" data-mood="${m}">${m}</button>`).join("")}</div>
      <div class="card-head"><p class="label">Quotes</p><button type="button" class="btn small" id="bd-q">+ Quote</button></div>
      ${w.quotes.length ? `<ul class="bd-quotes">${w.quotes.map((q, i) => `<li>“${esc(q.t)}”${q.p ? ` <small>p. ${esc(q.p)}</small>` : ""}<button type="button" class="del" data-qd="${i}">×</button></li>`).join("")}</ul>` : ""}
      <details class="bd-more"><summary>Details</summary>
        <label>Title<input type="text" id="bd-t" value="${esc(w.t)}"></label>
        <label>Author<input type="text" id="bd-a" value="${esc(w.a)}"></label>
        <div class="sheet-row"><label>Pages<input type="number" id="bd-p" value="${w.pages || ""}"></label><label>Shelf<select id="bd-s">${Object.entries(SHELVES).map(([k, l]) => `<option value="${k}" ${w.shelf === k ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
        <div class="sheet-row"><label>Genre<input type="text" id="bd-g" value="${esc(w.genre || "")}"></label><label>Format<select id="bd-f">${Object.entries(FORMATS).map(([k, l]) => `<option value="${k}" ${w.fmt === k ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
        <div class="sheet-row"><label>Series<input type="text" id="bd-se" value="${esc(w.series || "")}"></label><label>#<input type="text" id="bd-sn" value="${esc(w.seriesN || "")}"></label></div>
        <label>Tags (comma separated)<input type="text" id="bd-tags" value="${esc(w.tags.join(", "))}"></label>
        <div class="sheet-row"><label>Started<input type="date" id="bd-st" value="${w.started || ""}"></label><label>Cover URL<input type="text" id="bd-cv" value="${esc(w.cover || "")}"></label></div>
        <label class="toggle"><span>Nonfiction<small>counts toward 75 Hard reading</small></span><span class="switch"><input type="checkbox" id="bd-nf" ${w.nonfic ? "checked" : ""}><i></i></span></label>
        ${w.sessions?.length ? `<p class="label">Sessions</p><ul class="bd-sess">${[...w.sessions].reverse().slice(0, 12).map((s) => `<li>${md(s.d)} · p. ${s.from}→${s.to}${s.min ? ` · ${s.min} min` : ""}</li>`).join("")}</ul>` : ""}
        <div class="sheet-row">${w.shelf === "read" ? `<button type="button" class="btn" id="bd-again">📖 Read again</button>` : ""}<button type="button" class="btn ghost danger" id="bd-del">Delete book</button></div>
      </details>
      <div class="sheet-row"><button value="cancel" class="btn">Cancel</button><button value="save" class="btn primary">Save</button></div>`;
    const q = (s) => f.querySelector(s);
    q("#r-in").oninput = (e) => { w.rating = +e.target.value; q(".rate-row").innerHTML = `${stars(w.rating)}<b id="r-v">${w.rating ? w.rating.toFixed(2).replace(/0$/, "") : "—"}</b>`; };
    f.querySelectorAll("[data-mood]").forEach((c) => (c.onclick = () => { const m = c.dataset.mood; w.mood = w.mood.includes(m) ? w.mood.filter((x) => x !== m) : [...w.mood, m]; c.classList.toggle("on"); }));
    f.querySelectorAll("[data-qd]").forEach((c) => (c.onclick = () => { keep(); w.quotes.splice(+c.dataset.qd, 1); draw(f); }));
    q("#bd-q").onclick = () => { keep(); const t = prompt("Quote or highlight:"); if (!t?.trim()) return; const p = prompt("Page (optional):") || ""; w.quotes.push({ id: uid(), t: t.trim(), p: p.trim(), d: ymd() }); draw(f); };
    q("#bd-again") && (q("#bd-again").onclick = () => { keep(); w.shelf = "reading"; w.page = 0; w.started = ymd(); draw(f); ctx.toast("Back on your Reading shelf — save to keep it"); });
    q("#bd-del").onclick = () => { if (!confirm(`Delete “${b.t}” and all its sessions?`)) return; B.list = B.list.filter((x) => x.id !== b.id); if (B.timer?.id === b.id) B.timer = null; document.getElementById("sheet").close(); ctx.save(); ctx.render(); };
  };
  const keep = () => {
    const g = (s) => document.querySelector(s);
    if (!g("#bd-t")) return;
    w.review = g("#bd-rev").value; w.t = g("#bd-t").value.trim() || w.t; w.a = g("#bd-a").value.trim(); w.pages = parseInt(g("#bd-p").value) || null;
    w.shelf = g("#bd-s").value; w.genre = g("#bd-g").value.trim(); w.fmt = g("#bd-f").value; w.series = g("#bd-se").value.trim(); w.seriesN = g("#bd-sn").value.trim();
    w.tags = g("#bd-tags").value.split(",").map((x) => x.trim()).filter(Boolean); w.started = g("#bd-st").value || null; w.cover = g("#bd-cv").value.trim(); w.nonfic = g("#bd-nf").checked;
  };
  ctx.openSheet("", draw, (rv) => {
    if (rv !== "save") return;
    keep();
    const wasRead = b.shelf === "read";
    const newReview = !(b.review || "").trim() && (w.review || "").trim();
    Object.assign(b, w);
    if (b.shelf === "read" && !wasRead && !b.reads.length) { b.reads = [ymd()]; b.page = b.pages || b.page; }
    if (b.shelf === "reading" && !b.started) b.started = ymd();
    ctx.save(); ctx.render(); ctx.toast(newReview ? `Review saved · +${LXP.review} XP` : "Saved");
  });
  if (afterFinish) setTimeout(() => document.getElementById("r-in")?.focus(), 200);
}

/* =========================================================
   add: search Open Library · ISBN · barcode · manual · Goodreads import
   ========================================================= */
const OL = "https://openlibrary.org/search.json";
const FIELDS = "key,title,author_name,number_of_pages_median,cover_i,isbn,subject,first_publish_year";
async function olSearch(params) {
  const r = await fetch(`${OL}?${params}&limit=12&fields=${FIELDS}`); if (!r.ok) throw 0;
  return (await r.json()).docs || [];
}
const fromDoc = (d, shelf) => newBook({ t: d.title, a: (d.author_name || []).slice(0, 2).join(", "), pages: d.number_of_pages_median || null, cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : "",
  isbn: (d.isbn || []).find((x) => x.length === 13) || (d.isbn || [])[0] || "", genre: guessGenre(d.subject), nonfic: guessNonfic(d.subject), shelf, year: d.first_publish_year });

export function openAdd(ctx) {
  const { esc } = ctx, B = ctx.state.books;
  let shelf = "want", results = [];
  const add = (b) => {
    if (B.list.some((x) => x.t.toLowerCase() === b.t.toLowerCase() && (x.a || "").toLowerCase() === (b.a || "").toLowerCase())) { ctx.toast("That book's already in your library"); return; }
    b.shelf = shelf; if (shelf === "reading") b.started = ymd(); if (shelf === "read") { b.reads = [ymd()]; b.page = b.pages || 0; }
    B.list.push(b); ctx.save(); document.getElementById("sheet").close(); ctx.render(); ctx.toast(`Added to ${SHELVES[shelf]}`);
  };
  const draw = (f) => {
    f.innerHTML = `<h2>Add a book</h2>
      <div class="seg wide" id="ad-shelf">${["want", "reading", "read"].map((k) => `<button type="button" data-k="${k}" class="${shelf === k ? "on" : ""}">${SHELVES[k]}</button>`).join("")}</div>
      <div class="ad-search"><input type="search" id="ad-q" placeholder="Title, author or ISBN" autocomplete="off"><button type="button" class="btn primary" id="ad-go">Search</button></div>
      <div class="sheet-row"><button type="button" class="btn" id="ad-scan">📷 Scan barcode</button><button type="button" class="btn" id="ad-man">✍️ Add by hand</button></div>
      <div id="ad-res"><p class="fine">Searches Open Library for covers and page counts. Needs internet; everything else works offline.</p></div>
      <label class="btn ghost file-btn">⇪ Import Goodreads library (.csv)<input type="file" id="ad-gr" accept=".csv,text/csv" hidden></label>
      <p class="fine">Goodreads → My Books → Import and export → Export library.</p>
      <button value="close" class="btn">Close</button>`;
    const q = (s) => f.querySelector(s);
    f.querySelectorAll("#ad-shelf button").forEach((b) => (b.onclick = () => { shelf = b.dataset.k; f.querySelectorAll("#ad-shelf button").forEach((x) => x.classList.toggle("on", x === b)); }));
    const go = async () => {
      const text = q("#ad-q").value.trim(); if (!text) return;
      const res = q("#ad-res"); res.innerHTML = `<p class="muted">Searching…</p>`;
      try {
        const isbn = text.replace(/[-\s]/g, "");
        results = await olSearch(/^\d{9}[\dX]$|^\d{13}$/i.test(isbn) ? `isbn=${isbn}` : `q=${encodeURIComponent(text)}`);
        res.innerHTML = results.length ? `<ul class="ad-list">${results.map((d, i) => `<li data-i="${i}">${cover({ t: d.title, a: (d.author_name || [])[0], cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-S.jpg` : "" }, esc, "xs")}
          <div><b>${esc(d.title)}</b><small>${esc((d.author_name || []).slice(0, 2).join(", "))}${d.first_publish_year ? ` · ${d.first_publish_year}` : ""}${d.number_of_pages_median ? ` · ${d.number_of_pages_median} p` : ""}</small></div><span class="ad-plus">+</span></li>`).join("")}</ul>`
          : `<p class="muted">Nothing found. Try fewer words, or add it by hand.</p>`;
        res.querySelectorAll("[data-i]").forEach((li) => (li.onclick = () => add(fromDoc(results[+li.dataset.i], shelf))));
      } catch { res.innerHTML = `<p class="muted">Couldn't reach Open Library. Check your connection, or add it by hand.</p>`; }
    };
    q("#ad-go").onclick = go;
    q("#ad-q").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); go(); } };
    q("#ad-man").onclick = () => manual(f);
    q("#ad-scan").onclick = () => scan(f, (code) => { q("#ad-q").value = code; go(); });
    q("#ad-gr").onchange = async (e) => { const file = e.target.files[0]; if (!file) return; const n = importGoodreads(ctx, await file.text()); document.getElementById("sheet").close(); ctx.render(); ctx.toast(n ? `Imported ${n} books from Goodreads` : "No new books found in that file", 3200); };
  };
  const manual = (f) => {
    f.innerHTML = `<h2>Add by hand</h2><label>Title<input type="text" id="m-t"></label><label>Author<input type="text" id="m-a"></label>
      <div class="sheet-row"><label>Pages<input type="number" id="m-p"></label><label>Genre<input type="text" id="m-g" placeholder="e.g. Christian"></label></div>
      <label class="toggle"><span>Nonfiction</span><span class="switch"><input type="checkbox" id="m-nf" checked><i></i></span></label>
      <div class="sheet-row"><button type="button" class="btn" id="m-back">Back</button><button type="button" class="btn primary" id="m-add">Add</button></div>`;
    f.querySelector("#m-back").onclick = () => draw(f);
    f.querySelector("#m-add").onclick = () => { const t = f.querySelector("#m-t").value.trim(); if (!t) return; add(newBook({ t, a: f.querySelector("#m-a").value.trim(), pages: parseInt(f.querySelector("#m-p").value) || null, genre: f.querySelector("#m-g").value.trim(), nonfic: f.querySelector("#m-nf").checked })); };
  };
  ctx.openSheet("", draw);
}

/* barcode scanning — loads the scanner library only when you use it */
let zx = null;
function loadZX() { return (zx ||= new Promise((res, rej) => { if (window.ZXing) return res(window.ZXing); const s = document.createElement("script"); s.src = "vendor/zxing.min.js"; s.onload = () => res(window.ZXing); s.onerror = rej; document.head.appendChild(s); })); }
async function scan(f, done) {
  const res = f.querySelector("#ad-res");
  res.innerHTML = `<div class="scan"><video id="sc-v" playsinline muted></video><i class="scan-line"></i></div><p class="fine">Point the camera at the barcode on the back cover.</p>
    <div class="sheet-row"><button type="button" class="btn" id="sc-stop">Stop</button><label class="btn file-btn">Use a photo<input type="file" id="sc-file" accept="image/*" capture="environment" hidden></label></div>`;
  let reader = null;
  const stop = () => { try { reader?.reset(); } catch {} };
  f.querySelector("#sc-stop").onclick = () => { stop(); res.innerHTML = ""; };
  f.closest("dialog").addEventListener("close", stop, { once: true });
  try {
    const Z = await loadZX();
    const hints = new Map([[Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A]]]);
    reader = new Z.BrowserMultiFormatReader(hints);
    f.querySelector("#sc-file").onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const url = URL.createObjectURL(file);
      try { const r = await reader.decodeFromImageUrl(url); stop(); done(r.getText()); } catch { res.querySelector(".fine").textContent = "Couldn't read a barcode in that photo — try again closer."; }
    };
    await reader.decodeFromVideoDevice(undefined, f.querySelector("#sc-v"), (r) => { if (r) { stop(); if (navigator.vibrate) navigator.vibrate(40); done(r.getText()); } });
  } catch { res.querySelector(".fine").textContent = "Camera not available — use a photo instead, or type the ISBN."; }
}

/* Goodreads CSV */
function parseCSV(text) {
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(cell); cell = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}
export function importGoodreads(ctx, text) {
  const rows = parseCSV(text); if (rows.length < 2) return 0;
  const h = rows[0].map((x) => x.trim()), col = (r, n) => (r[h.indexOf(n)] || "").trim();
  if (!h.includes("Title")) return 0;
  const B = ctx.state.books; let n = 0;
  const gd = (s) => (s ? s.replace(/\//g, "-").replace(/^(\d{4})-(\d{1,2})-(\d{1,2})$/, (_, y, m, d) => `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`) : "");
  for (const r of rows.slice(1)) {
    const t = col(r, "Title"); if (!t) continue;
    const a = col(r, "Author");
    if (B.list.some((x) => x.t.toLowerCase() === t.toLowerCase())) continue;
    const isbn = (col(r, "ISBN13") || col(r, "ISBN")).replace(/[="]/g, "");
    const ex = col(r, "Exclusive Shelf"), shelf = ex === "read" ? "read" : ex === "currently-reading" ? "reading" : ex === "did-not-finish" ? "dnf" : "want";
    const b = newBook({ t, a, pages: parseInt(col(r, "Number of Pages")) || null, isbn, shelf, cover: isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false` : "" });
    b.rating = parseInt(col(r, "My Rating")) || 0; b.review = col(r, "My Review").replace(/<br\s*\/?>/g, "\n");
    b.added = gd(col(r, "Date Added")) || ymd();
    const dr = gd(col(r, "Date Read")), cnt = parseInt(col(r, "Read Count")) || 0;
    if (shelf === "read") { b.reads = [dr || b.added]; for (let i = 1; i < cnt; i++) b.reads.unshift(dr || b.added); b.page = b.pages || 0; }
    if (shelf === "reading") b.started = b.added;
    b.tags = col(r, "Bookshelves").split(",").map((x) => x.trim()).filter((x) => x && !["read", "to-read", "currently-reading"].includes(x));
    B.list.push(b); n++;
  }
  ctx.save();
  return n;
}
