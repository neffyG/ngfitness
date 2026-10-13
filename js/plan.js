// Turns a workout plan file into what the app needs.
//   blocks(day, opts) returns the day's blocks. Blocks with main: true must be fully checked to clear the day.
//   A block with lift: true shows the weight / sets / reps tracker on items that have w: true.

export function makePlan({ DAYS, SCHEDULE, blocks, variants = {} }) {
  const byId = Object.fromEntries(DAYS.map((d) => [d.id, d]));
  const todayId = () => SCHEDULE[new Date().getDay()] ?? DAYS.at(-1).id;
  const keyFor = (day, opts = {}) => (opts.gentle && !day.rest ? `${day.id}~g` : day.id);
  const fromKey = (key) => { const [id, v] = String(key).split("~"); return { day: byId[id], opts: { gentle: v === "g" } }; };
  const blocksFor = (day, opts = {}) => blocks(day, opts).map((b, i) => ({ ...b, key: `${i}` }));

  function recordInfo(rec) {
    const { day, opts } = fromKey(rec.day);
    if (!day) return null;
    const bl = blocksFor(day, opts), done = new Set(rec.done);
    const full = (b) => b.items.every((_, i) => done.has(`${b.key}.${i}`));
    return { day, opts, rest: !!day.rest, done, count: done.size, cleared: bl.filter((b) => b.main).every(full) };
  }
  return { DAYS, SCHEDULE, byId, todayId, keyFor, fromKey, blocksFor, recordInfo, isRestToday: () => !!byId[todayId()]?.rest, variants };
}
