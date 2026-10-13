// Neftali's plan — pulled from "Training plan — back to the gym"
// Each day: prep (warm-up), items (lifts). Blocks WAKE/WORK/FINISH/BED repeat daily.
//   fig  = animated picture (see figures.js)
//   w    = track the weight for this exercise (shows the weight + set tracker)
//   inc  = how much to go up when you hit every set (default 5 lb)

export const WAKE = {
  t: "Wake up", w: "At home · 8 min",
  note: "Lying and seated work only. Discs are most sensitive to bending in the first hour after you get up.",
  items: [
    { n: "Figure-4 glute stretch, lying down", s: "30 sec / side", fig: "fig4" },
    { n: "Hamstring stretch with a towel, lying down", s: "30 sec / side", fig: "towelHam", note: "Knee slightly bent. Replaces standing toe-touches." },
    { n: "Supine march", s: "2 × 10 / side", fig: "supineMarch", note: "Lower back flat on the floor. If it arches, stop the set." },
    { n: "Glute bridge", s: "2 × 15", fig: "bridge", note: "Two-second squeeze at the top." },
    { n: "Ankle circles, sitting", s: "10 each way", fig: "ankleCircle" },
  ],
};

export const WORK = {
  t: "At work", w: "Through the shift",
  note: "Twelve hours in a chair loads your lumbar discs more than standing or walking.",
  items: [
    { n: "Stand and walk", s: "2 min every 30–45 min", fig: "walk", note: "Set a timer." },
    { n: "Seated knee lift", s: "2 × 10 / side", fig: "seatedKnee", note: "Lift one knee two inches, hold two seconds." },
    { n: "Ankle circles, sitting", s: "10 each way", fig: "ankleCircle" },
  ],
};

export const FINISH = {
  t: "Finish", w: "At the gym · 25 min",
  items: [
    { n: "Side plank", s: "3 × 20–30 sec / side", fig: "sidePlankFull" },
    { n: "Bird dog", s: "3 × 8 / side", fig: "birdDog" },
    { n: "Pallof press", s: "2 × 10 / side", fig: "pallof" },
    { n: "Treadmill walk, bike or elliptical", s: "20–30 min", fig: "walk", note: "Flat first, add incline slowly. Stairmaster after month one." },
  ],
};

export const BED = {
  t: "Before bed", w: "At home · 7 min",
  items: [
    { n: "Knee-to-wall ankle rock", s: "10 / side", fig: "ankleRock" },
    { n: "Calf stretch at the wall", s: "30 sec / side", fig: "calfStretch" },
    { n: "Half-kneeling hip flexor stretch", s: "45 sec / side", fig: "hipFlexor", note: "Squeeze the glute, tuck the tailbone. Highest-value stretch for you." },
    { n: "Figure-4 glute stretch", s: "30 sec / side", fig: "fig4" },
    { n: "Butterfly, sitting tall", s: "30 sec", fig: "butterfly" },
    { n: "Side-lying clamshell", s: "2 × 15 / side", fig: "clam" },
    { n: "Standing hip extension", s: "2 × 12 / side", fig: "hipExt", note: "Move from the hip, keep your back still." },
  ],
};

const P = {
  ankle: { n: "Knee-to-wall ankle rock", s: "10 / side", fig: "ankleRock" },
  flexor: { n: "Half-kneeling hip flexor stretch", s: "30 sec / side", fig: "hipFlexor" },
  fig4: { n: "Figure-4 glute stretch", s: "30 sec / side", fig: "fig4" },
  bridge: { n: "Glute bridge", s: "2 × 15", fig: "bridge" },
  deadbug: { n: "Dead bug", s: "2 × 8 / side", fig: "deadbug" },
  clam: { n: "Clamshell", s: "2 × 15 / side", fig: "clam" },
  balance: { n: "Single-leg balance", s: "30 sec / side", fig: "balance" },
  pullApart: { n: "Band pull-apart", s: "2 × 15", fig: "pullApart" },
  wallSlide: { n: "Wall slide", s: "2 × 10", fig: "wallSlide" },
  dislocate: { n: "Band shoulder dislocate", s: "2 × 10", fig: "dislocate" },
  openBook: { n: "Open book rotation", s: "8 / side", fig: "openBook" },
};

export const DAYS = [
  { id: "legsA", tab: "Legs A", title: "Legs A", sub: "Full legs",
    prep: [P.ankle, P.flexor, P.fig4, P.bridge, P.deadbug, P.clam, P.balance],
    items: [
      { n: "Leg press", s: "3 × 10–12", fig: "legPress", w: true, note: "Lower back flat on the pad every rep. Short range." },
      { n: "Seated leg curl", s: "3 × 10–12", fig: "legCurl", w: true },
      { n: "Leg extension", s: "3 × 12–15", fig: "legExt", w: true },
      { n: "Hip abduction machine", s: "2 × 15", fig: "abduction", w: true },
      { n: "Hip adduction machine", s: "2 × 15", fig: "adductor", w: true },
      { n: "Seated calf raise", s: "3 × 15", fig: "seatedCalf", w: true, note: "Seated, not standing." },
    ] },
  { id: "push", tab: "Push", title: "Push", sub: "Chest, shoulders, triceps",
    prep: [P.ankle, P.flexor, P.bridge, P.pullApart, P.wallSlide, P.dislocate, P.openBook, P.deadbug],
    items: [
      { n: "Flat bench press", s: "3 × 8–10", fig: "benchPress", w: true, note: "Feet flat, ribs down, no arching." },
      { n: "Incline dumbbell press", s: "3 × 10", fig: "inclinePress", w: true, note: "Log the weight of one dumbbell." },
      { n: "Machine chest press or pec deck", s: "3 × 12", fig: "chestPress", w: true },
      { n: "Seated machine shoulder press", s: "3 × 10", fig: "press", w: true, note: "Seated with back pad only." },
      { n: "Seated lateral raise", s: "3 × 12–15", fig: "lateral", w: true, inc: 2.5 },
      { n: "Rope pushdown", s: "3 × 12", fig: "pushdown", w: true },
    ] },
  { id: "legsB", tab: "Legs B", title: "Legs B", sub: "Front of the legs",
    prep: [P.ankle, P.flexor, P.fig4, P.bridge, P.deadbug,
      { n: "Single-leg balance, eyes closed", s: "20 sec / side", fig: "balance" },
      { n: "Slow calf raise, one leg", s: "2 × 10 / side", fig: "calfRaise" }],
    items: [
      { n: "Leg extension", s: "4 × 10–12", fig: "legExt", w: true },
      { n: "Leg press, feet low and narrow", s: "3 × 10–12", fig: "legPress", w: true, note: "Same range rule." },
      { n: "Split squat, bodyweight", s: "3 × 8 / leg", fig: "splitSquat", note: "Hold the rail." },
      { n: "Step-up to a low box", s: "2 × 10 / leg", fig: "stepupBW" },
      { n: "Hip adduction machine", s: "2 × 15", fig: "adductor", w: true },
      { n: "Seated calf raise", s: "3 × 15", fig: "seatedCalf", w: true },
    ] },
  { id: "pull", tab: "Pull", title: "Pull", sub: "Back, rear delts, biceps",
    prep: [P.ankle, P.flexor, P.bridge, P.pullApart, P.wallSlide,
      { n: "Prone Y raise", s: "2 × 10", fig: "proneY" }, P.openBook,
      { n: "Bird dog", s: "2 × 8 / side", fig: "birdDog" }],
    items: [
      { n: "Lat pulldown", s: "3 × 10", fig: "pulldown", w: true },
      { n: "Chest-supported row", s: "3 × 10", fig: "chestRow", w: true, note: "Chest stays on the pad." },
      { n: "Seated cable row", s: "3 × 10", fig: "seatedRow", w: true, note: "Torso upright, no rocking." },
      { n: "Machine rear delt fly", s: "3 × 15", fig: "revFly", w: true },
      { n: "Seated incline curl", s: "3 × 10", fig: "inclineCurl", w: true, inc: 2.5 },
      { n: "Seated hammer curl", s: "2 × 12", fig: "seatedCurl", w: true, inc: 2.5 },
    ] },
  { id: "legsC", tab: "Legs C", title: "Legs C", sub: "Hamstrings and glutes",
    prep: [P.ankle, P.flexor, P.fig4, P.bridge, P.deadbug,
      { n: "Side-lying leg raise", s: "2 × 15 / side", fig: "sideLegRaise" }, P.balance],
    items: [
      { n: "Seated leg curl", s: "4 × 10–12", fig: "legCurl", w: true },
      { n: "Lying leg curl", s: "3 × 10", fig: "lyingCurl", w: true, note: "If your lower back arches, drop the weight." },
      { n: "Cable glute kickback", s: "3 × 12 / leg", fig: "kickback", w: true, inc: 2.5 },
      { n: "Glute bridge on the floor", s: "3 × 15", fig: "bridge" },
      { n: "Hip abduction machine", s: "3 × 15", fig: "abduction", w: true },
      { n: "Calf raise on the leg press", s: "3 × 15", fig: "legPressCalf", w: true },
    ] },
  { id: "arms", tab: "Shoulders + arms", title: "Shoulders & arms", sub: "The lighter day",
    prep: [P.ankle, P.flexor, P.bridge, P.pullApart, P.wallSlide, P.dislocate, P.openBook, P.balance],
    items: [
      { n: "Machine shoulder press", s: "3 × 10", fig: "press", w: true },
      { n: "Cable lateral raise", s: "3 × 15", fig: "lateral", w: true, inc: 2.5 },
      { n: "Machine rear delt fly", s: "3 × 15", fig: "revFly", w: true },
      { n: "Seated barbell curl", s: "3 × 10", fig: "seatedCurl", w: true },
      { n: "Rope pushdown", s: "3 × 12", fig: "pushdown", w: true },
      { n: "Wrist curl and reverse wrist curl", s: "2 × 15 each", fig: "wristCurl", w: true, inc: 2.5 },
    ] },
  { id: "rest", tab: "Rest", title: "Rest", sub: "Recovery day", rest: true,
    items: [
      { n: "Walk", s: "20–30 min", fig: "walk", note: "A rest day from lifting is not a rest day from moving." },
      { n: "Single-leg balance", s: "45 sec / side", fig: "balance" },
      { n: "Full mobility routine", s: "10 min", fig: "wgs" },
    ] },
];

// Weekday → workout. 0 = Sunday. Change to match your week.
export const SCHEDULE = {
  1: "legsA", // Mon
  2: "push",  // Tue
  3: "legsB", // Wed
  4: "pull",  // Thu
  5: "legsC", // Fri
  6: "arms",  // Sat
  0: "rest",  // Sun
};

export const HARD_LIMITS = [
  "Leg press: stop before your hips roll under and your lower back lifts off the pad.",
  "Nothing across your back, nothing in your hands while you hinge.",
  "No straight-leg raises, hanging leg raises, sit-ups or V-ups.",
  "Brace, then breathe. Don't hold your breath under strain.",
  "New leg pain, numbness or tingling → drop it and call your surgeon. Leg weakness, groin numbness or bladder/bowel changes → ER.",
];

/* ---------- how a day is built ---------- */
import { makePlan } from "./plan.js";
export const PLAN = makePlan({
  DAYS, SCHEDULE,
  blocks: (day) => {
    const b = [WAKE, WORK];
    if (day.rest) b.push({ t: "Move", w: "Anywhere · 30 min", main: true, items: day.items });
    else b.push(
      { t: "Before you lift", w: "At the gym · 10 min", main: true, note: "This block is the program. If a session has to be short, cut from the lifting, never from here.", items: day.prep },
      { t: "Lift", w: "At the gym · 45–60 min", main: true, lift: true, items: day.items },
      { ...FINISH, main: true },
    );
    b.push(BED);
    return b;
  },
});

// Default daily mobility quest (editable in the app). fig = picture.
export const DEFAULT_MOVES = [
  { id: "m-fig4", n: "Figure-4 glute stretch", s: "30 sec / side", fig: "fig4" },
  { id: "m-towel", n: "Towel hamstring stretch, lying", s: "30 sec / side", fig: "towelHam" },
  { id: "m-bridge", n: "Glute bridge", s: "2 × 15", fig: "bridge" },
  { id: "m-birddog", n: "Bird dog", s: "2 × 8 / side", fig: "birdDog" },
  { id: "m-flexor", n: "Half-kneeling hip flexor stretch", s: "45 sec / side", fig: "hipFlexor" },
  { id: "m-ankle", n: "Knee-to-wall ankle rock", s: "10 / side", fig: "ankleRock" },
];
