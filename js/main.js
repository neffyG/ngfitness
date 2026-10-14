import { startApp, esc } from "./core.js";
import { CFG } from "./config.js";
import { PLAN, HARD_LIMITS } from "./workouts.js";
import { LIFE_DEFAULTS } from "./life.js";
import { renderFaith } from "./faith-ui.js";
import { renderBooks } from "./books-ui.js";
import { renderHard } from "./hard-ui.js";
import { homeTop, bindHome, beforeRender, habitsHtml, renderHabits, reportHtml, renderReport } from "./life-ui.js";

startApp({ cfg: CFG, plan: PLAN, extra: {
  get defaults() { return structuredClone(LIFE_DEFAULTS); },
  tabs: [
    { id: "faith", render: renderFaith },
    { id: "books", render: renderBooks },
    { id: "hard", render: renderHard },
    { id: "habits", html: habitsHtml, render: renderHabits },
    { id: "report", html: reportHtml, render: renderReport },
  ],
  homeTop, bindHome, beforeRender,
  trainFooter: () => `<details class="panel limits"><summary>⚠ Hard limits</summary><ul>${HARD_LIMITS.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></details>`,
}});
