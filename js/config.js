// ARISE — everything that makes this app "yours": names, ranks, gates, loot, wording.
import { DEFAULT_MOVES } from "./workouts.js";
import { lifeCompute, LIFE_BOSSES, LIFE_LOOT } from "./life.js";

const heart = (kind) => {
  const P = "M12 21C5.2 15.6 1.2 12.1 1.2 7.3A5.3 5.3 0 0 1 12 5a5.3 5.3 0 0 1 10.8 2.3c0 4.8-4 8.3-10.8 13.7z";
  if (kind === "on") return `<svg viewBox="0 0 24 22" width="27" height="25"><path d="${P}" fill="#F25F6E" stroke="#3A1626" stroke-width="1.6"/><path d="M6 6.5a2.4 2.4 0 0 1 3-1" stroke="#FFC2C9" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>`;
  if (kind === "rest") return `<svg viewBox="0 0 24 22" width="27" height="25"><defs><linearGradient id="hh"><stop offset=".5" stop-color="#F25F6E"/><stop offset=".5" stop-color="#2A3557"/></linearGradient></defs><path d="${P}" fill="url(#hh)" stroke="#3A1626" stroke-width="1.6"/></svg>`;
  if (kind === "today") return `<svg viewBox="0 0 24 22" width="27" height="25" class="beat"><path d="${P}" fill="#2A3557" stroke="#F6C863" stroke-width="1.8"/></svg>`;
  if (kind === "future") return `<svg viewBox="0 0 24 22" width="27" height="25" opacity=".35"><path d="${P}" fill="none" stroke="#7D8BB0" stroke-width="1.6"/></svg>`;
  return `<svg viewBox="0 0 24 22" width="27" height="25"><path d="${P}" fill="#232C49" stroke="#55628A" stroke-width="1.6"/></svg>`;
};

export const CFG = {
  id: "arise", codePrefix: "ARISE", partnerPrefix: "BLOOM",
  storageKey: "fit:neftali", defaultName: "Neftali", weeklyMi: 10,
  xpName: "XP",
  logoHtml: `ARISE<span>✦ the System · body · mind · spirit</span>`,
  tabs: [
    { id: "home", label: "Status", icon: "status" },
    { id: "train", label: "Train", icon: "train" },
    { id: "faith", label: "Faith", icon: "cross" },
    { id: "books", label: "Books", icon: "book" },
    { id: "hard", label: "75", icon: "flame" },
    { id: "bosses", label: "Gates", icon: "bosses" },
    { id: "body", label: "Body", icon: "heart" },
    { id: "habits", label: "Habits", icon: "status", hidden: true, navAs: "home" },
    { id: "report", label: "Report", icon: "status", hidden: true, navAs: "home" },
  ],
  extend: (state, today, ext) => lifeCompute(state, today, ext),
  ranks: [
    { name: "E-Rank Hunter", r: "E", min: 1, c: "#A9B6CE" },
    { name: "D-Rank Hunter", r: "D", min: 6, c: "#8FD18B" },
    { name: "C-Rank Hunter", r: "C", min: 12, c: "#57D3F2" },
    { name: "B-Rank Hunter", r: "B", min: 20, c: "#A98BFF" },
    { name: "A-Rank Hunter", r: "A", min: 30, c: "#F59A6C" },
    { name: "S-Rank Hunter", r: "S", min: 42, c: "#F6C863" },
    { name: "National-Level Hunter", r: "N", min: 55, c: "#F25F6E" },
    { name: "Monarch", r: "♛", min: 70, c: "#FFE9A8" },
  ],
  emblem: (rk) => `<svg viewBox="0 0 72 80" class="crest"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2B3966"/><stop offset="1" stop-color="#141B33"/></linearGradient></defs>
    <path d="M36 3c13 6 25 6 31 8v29c0 19-14 31-31 37C19 71 5 59 5 40V11c6-2 18-2 31-8z" fill="url(#cg)" stroke="${rk.c}" stroke-width="3"/>
    <path d="M36 10c10 4 19 5 24 6v24c0 14-10 24-24 29-14-5-24-15-24-29V16c5-1 14-2 24-6z" fill="none" stroke="${rk.c}" stroke-opacity=".35" stroke-width="1.2"/>
    <text x="36" y="${rk.r.length > 1 ? 50 : 51}" text-anchor="middle" font-family="Cinzel, serif" font-weight="700" font-size="${rk.r === "♛" ? 30 : 32}" fill="${rk.c}">${rk.r}</text></svg>`,
  playerExtra: (G, state) => {
    const mobMoves = Object.values(state.mob).reduce((s, a) => s + a.length, 0);
    const L = G.life;
    const stat = {
      STR: 10 + Math.floor(G.lifts.sets / 10) + G.lifts.prs,
      AGI: 10 + Math.floor(mobMoves / 10),
      VIT: 10 + Math.floor(state.weights.length / 5) + Math.floor(G.calLogs / 5),
      END: 10 + G.gymDays + Math.floor(G.miles / 5) + (L ? L.hard.bestCleared : 0),
      INT: 10 + (L ? Math.floor(L.books.pages / 100) + L.books.finishes * 2 : 0),
      FTH: 10 + (L ? Math.floor(L.faith.totalCh / 5) + Math.floor(L.faith.prayerDays / 3) + L.faith.answered : 0),
    };
    return `<div class="p-stats">${Object.entries(stat).map(([k, v]) => `<div><b>${v}</b><small>${k}</small></div>`).join("")}</div>
      <div class="p-meta"><span>Total <b>${Math.round(G.xp).toLocaleString()} XP</b></span><span>Lifted <b>${Math.round(G.lifts.lbs).toLocaleString()} lb</b></span><span>Road <b>${(Math.round(G.miles * 10) / 10)} mi</b></span></div>`;
  },
  streakMark: heart,
  walkIcon: "🥾", runIcon: "🏃", weekStreakIcon: "🔥", duoIcon: "⚔️", liftIcon: "🏋️",
  defaultMoves: DEFAULT_MOVES,

  bosses: [
    { id: "moor-wolf", name: "The Moor Wolf", icon: "🐺", desc: "Run or walk a 5K (3.1 mi) in one go.", metric: "bestSession", target: 3.1, unit: "mi", xp: 200 },
    { id: "ridge-drake", name: "The Ridge Drake", icon: "🐉", desc: "Go 10K (6.2 mi) in one go.", metric: "bestSession", target: 6.2, unit: "mi", xp: 400 },
    { id: "twin-lanterns", name: "Twin Lantern Spirits", icon: "🏮", desc: "Walk or run 20 miles together with Madi.", metric: "togetherMi", target: 20, unit: "mi", xp: 300 },
    { id: "iron-golem", name: "The Iron Golem", icon: "🗿", desc: "Lift 50,000 lb in total.", metric: "lbs", target: 50000, unit: "lb", xp: 500 },
    { id: "weight-wraith", name: "The Weight Wraith", icon: "👻", desc: "Reach your goal weight.", metric: "weightPct", target: 100, unit: "%", xp: 1000 },
    { id: "thornroot", name: "Thornroot Warden", icon: "🌳", desc: "Finish the full mobility quest on 30 days.", metric: "mobFullDays", target: 30, unit: "days", xp: 400 },
    { id: "ember-sentinel", name: "The Ember Sentinel", icon: "🔥", desc: "Hold a 21-day streak.", metric: "bestStreak", target: 21, unit: "days", xp: 400 },
    { id: "utah-colossus", name: "Utah Summit Colossus", icon: "⛰️", desc: "Climb the 100-mile mountain together — your miles plus Madi's.", metric: "duoMi", target: 100, unit: "mi", xp: 800, duo: true },
    { id: "titan", name: "Titan of 100,000 Stones", icon: "🪨", desc: "Lift 100,000 lb between the two of you.", metric: "duoLb", target: 100000, unit: "lb", xp: 800, duo: true },
    ...LIFE_BOSSES,
  ],
  loot: [
    { id: "l-sword", name: "Wooden Sword", icon: "🗡️", title: "Fresh Hunter", how: "Clear your first workout", when: (m) => m.gymDays >= 1 },
    { id: "l-satchel", name: "Traveler's Satchel", icon: "🎒", title: "Wanderer", how: "Reach LV 5", when: (m) => m.level >= 5 },
    { id: "l-quest", name: "Quest Board Seal", icon: "📜", title: "Quest Hunter", how: "Clear 7 daily quests", when: (m) => m.questDays >= 7 },
    { id: "l-lamp", name: "Glade Lantern", icon: "🪔", title: "Lanternbearer", how: "Reach LV 10", when: (m) => m.level >= 10 },
    { id: "l-map", name: "Wayfarer's Map", icon: "🗺️", title: "Pathfinder", how: "Hit your weekly miles 4 times", when: (m) => m.weeksHit >= 4 },
    { id: "l-hammer", name: "Forge Hammer", icon: "🔨", title: "Record Smith", how: "Set 10 PRs", when: (m) => m.prs >= 10 },
    { id: "l-wolf", name: "Wolfsbane Boots", icon: "🥾", title: "Wolfslayer", how: "Beat the Moor Wolf", boss: "moor-wolf", when: (m) => !!m.earned["moor-wolf"] },
    { id: "l-drake", name: "Drakescale Cloak", icon: "🧥", title: "Dragon Strider", how: "Beat the Ridge Drake", boss: "ridge-drake", when: (m) => !!m.earned["ridge-drake"] },
    { id: "l-lantern", name: "Twin Lantern Locket", icon: "💞", title: "Twin Flame", how: "Beat the Lantern Spirits", boss: "twin-lanterns", when: (m) => !!m.earned["twin-lanterns"] },
    { id: "l-golem", name: "Golem Core", icon: "💠", title: "Ironbound", how: "Beat the Iron Golem", boss: "iron-golem", when: (m) => !!m.earned["iron-golem"] },
    { id: "l-wraith", name: "Wraithbane Blade", icon: "⚔️", title: "Wraith Slayer", how: "Beat the Weight Wraith", boss: "weight-wraith", when: (m) => !!m.earned["weight-wraith"] },
    { id: "l-thorn", name: "Thornroot Staff", icon: "🪄", title: "Rootwalker", how: "Beat the Thornroot Warden", boss: "thornroot", when: (m) => !!m.earned.thornroot },
    { id: "l-ember", name: "Eternal Ember", icon: "🕯️", title: "Flamekeeper", how: "Beat the Ember Sentinel", boss: "ember-sentinel", when: (m) => !!m.earned["ember-sentinel"] },
    { id: "l-summit", name: "Summit Banner", icon: "🚩", title: "Colossus Breaker", how: "Beat the Utah Colossus", boss: "utah-colossus", when: (m) => !!m.earned["utah-colossus"] },
    { id: "l-titan", name: "Titan's Ring", icon: "💍", title: "Titanbound", how: "Beat the Titan", boss: "titan", when: (m) => !!m.earned.titan },
    { id: "l-slate", name: "Spirit Slate", icon: "🔷", title: "Awakened", how: "Reach LV 20", when: (m) => m.level >= 20 },
    { id: "l-crown", name: "Crown of Stars", icon: "👑", title: "Star-Crowned", how: "Reach LV 40", when: (m) => m.level >= 40 },
    ...LIFE_LOOT,
  ],

  bossPopup: (b, loot) => `<p class="ov-k">[ SYSTEM ]</p><div class="ov-icon">${b.icon}</div><h2 class="ov-h">GATE CLEARED</h2>
    <p class="ov-p">${b.name} has fallen.</p><p class="ov-gold">+${b.xp} XP${loot ? `<br>Loot: ${loot.icon} ${loot.name}` : ""}</p>${loot?.title ? `<p class="ov-p">Title unlocked: “${loot.title}”</p>` : ""}`,
  lootPopup: (l) => `<p class="ov-k">[ SYSTEM ]</p><div class="ov-icon">${l.icon}</div><h2 class="ov-h">ITEM ACQUIRED</h2><p class="ov-gold">${l.name}</p>${l.title ? `<p class="ov-p">Title unlocked: “${l.title}”</p>` : ""}`,
  levelPopup: (from, to, newRank) => `<p class="ov-k">[ SYSTEM ]</p><h2 class="ov-h glow">LEVEL UP</h2><p class="ov-num">LV ${from} → LV ${to}</p>
    <p class="ov-gold">${newRank ? `RANK UP: ${newRank.name.toUpperCase()}` : "All stats increased."}</p>`,

  text: {
    toastTag: "[SYSTEM]", popupOk: "Continue", statusTag: "Status", lv: "LV.",
    noTitle: "No title yet — clear gates to earn one", titlesHead: "Titles", noTitlesYet: "Clear gates and collect loot to unlock titles.", titleEquipped: "Title equipped",
    streakLabel: "Training streak", streakDone: "Today counts ✓", streakTodo: "Train, log cardio or finish mobility to keep it",
    questHead: "[ DAILY QUEST ]", questSub: "Clear every task before midnight", questClear: "QUEST CLEARED",
    questTrain: "Clear today's training", questRest: "Recovery day: walk + mobility", questMobility: "Finish the mobility quest", questWeigh: "Weigh in", questCalories: "Log calories from Lifesum",
    mobHead: "Mobility quest", mobDone: "Mobility quest complete!",
    milesTag: "The road", weekGoalHit: "Weekly goal cleared!", todayTraining: "Today's dungeon", nextBoss: "Nearest gate", todayKicker: "[ Today's dungeon ]",
    cardioTab: "Walk / Run", cardioTag: "Field log", cardioWord: "entry", togetherLabel: (n) => `Together with ${n}`, togetherTag: "together", partnerName: "Madi",
    cardioEmpty: "No walks or runs yet. Every mile is XP.",
    firstLift: "First time: pick a weight you can do for every rep with clean form.", goUp: (w) => `try ${w} lb if your back feels good`,
    pbShort: "PB", newPR: (n, w) => `NEW RECORD — ${n}: ${w} lb · +30 XP`, trainCleared: (x) => `Dungeon cleared. +${x} XP`,
    autofill: "Pick an exercise — last time's numbers fill in for you.", liftTag: "Armory", figBadge: "Form", rest: "REST", restDone: "Rest complete. Next set.",
    bossHead: "[ GATES ]", bossSub: "Beat a gate once and it's yours forever", bossCleared: "cleared", bossWon: "GATE CLEARED",
    duoTag: "Party", syncHead: "Party sync", syncHelp: "Text Madi your code and paste hers here. That updates your duo gates.",
    syncSend: "Send my code", syncGet: "Paste her code", syncMessage: (c) => `⚔️ ARISE party sync — open Bloom › Adventures › Paste his code:\n${c}`,
    syncDone: (n) => `Party synced with ${n}`,
    lootHead: "Loot & titles", lootHelp: "Tap loot you own to show its title under your name.",
    bodyTag: "Body", calTag: "Fuel", calHead: "Calories", calHint: "At the end of the day, copy your totals from Lifesum's diary.", calTargetHint: "from Lifesum",
    weighed: "Weigh-in logged.",
    welcomeBack: (G) => `Player re-registered. Your logs are worth ${Math.round(G.xp).toLocaleString()} XP — you're LV ${G.level}.`,
    welcomeNew: "Player registered. Clear your daily quest to start leveling.",
  },
};

// Ghibli-style dusk: stars, moon, hills, a lit cottage and fireflies
CFG.sceneHtml = `<div class="scene" aria-hidden="true">
  <svg class="sky" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice">
    <defs>
      <linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F7B27A" stop-opacity="0"/><stop offset="1" stop-color="#F7B27A" stop-opacity=".35"/></linearGradient>
      <radialGradient id="win"><stop offset="0" stop-color="#FFE6A0"/><stop offset="1" stop-color="#FFB85C" stop-opacity="0"/></radialGradient>
    </defs>
    <rect x="0" y="120" width="400" height="120" fill="url(#hz)"/>
    <path d="M0 210 L60 150 L95 175 L150 120 L205 170 L250 140 L300 175 L345 135 L400 180 V300 H0Z" fill="#2B3A62" opacity=".75"/>
    <path d="M0 235 C60 205 120 215 175 228 C230 240 290 205 400 215 V300 H0Z" fill="#24395A"/>
    <path d="M0 262 C80 238 150 250 220 258 C290 266 340 240 400 248 V300 H0Z" fill="#1E3350"/>
    <g transform="translate(300 222)">
      <circle cx="10" cy="-6" r="26" fill="url(#win)" opacity=".55"/>
      <path d="M-4 0 L10 -14 L24 0 Z" fill="#3A2E3F"/><rect x="-1" y="0" width="22" height="16" fill="#463A4C"/>
      <rect x="6" y="4" width="6" height="6" fill="#FFD27A"/><rect x="14" y="-12" width="3" height="7" fill="#3A2E3F"/>
    </g>
    <g transform="translate(270 232)"><rect x="-1.5" y="-4" width="3" height="16" fill="#2E2A3A"/><circle cx="0" cy="-12" r="11" fill="#2C4A4A"/><circle cx="-6" cy="-6" r="8" fill="#2F5250"/></g>
    <g transform="translate(70 240)"><rect x="-1.5" y="-2" width="3" height="14" fill="#2E2A3A"/><circle cx="0" cy="-10" r="10" fill="#294645"/><circle cx="6" cy="-4" r="7" fill="#2C4C4A"/></g>
  </svg>
  <i class="moon"></i>
  <div class="stars">${Array.from({ length: 34 }, (_, i) => `<b style="left:${(i * 37) % 100}%;top:${(i * 53) % 46}%;animation-delay:${(i % 7) * 0.6}s;${i % 5 === 0 ? "width:3px;height:3px;" : ""}"></b>`).join("")}</div>
  <div class="flies">${Array.from({ length: 12 }, (_, i) => `<b style="left:${8 + ((i * 29) % 84)}%;bottom:${6 + ((i * 17) % 22)}%;animation-delay:${i * 0.7}s;animation-duration:${6 + (i % 5)}s"></b>`).join("")}</div>
</div>`;
