// ARISE — starts the shared app with your config, plan and hard limits.
import { startApp, esc } from "./core.js";
import { CFG } from "./config.js";
import { PLAN, HARD_LIMITS } from "./workouts.js";

startApp({
  cfg: CFG,
  plan: PLAN,
  extra: {
    trainFooter: () => `<details class="panel limits"><summary>⚠ Hard limits</summary><ul>${HARD_LIMITS.map((l) => `<li>${esc(l)}</li>`).join("")}</ul></details>`,
  },
});
