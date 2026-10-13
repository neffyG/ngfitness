// Animated exercise pictures — tiny SVG figures that loop between the start and end of each movement.
// Pose angles are in degrees. Limbs (T thigh, S shin, P foot, U upper arm, F forearm) are measured
// from straight DOWN, positive = toward the right. Torso t is measured from straight UP, positive = leaning right.
// Side-view figures face right. "front" figures face you (leg/arm 1 = her right side, drawn on the left).

const LEN = { torso: 24, thigh: 19, shin: 19, ua: 14, fa: 13, foot: 6, neck: 7.5 };
const DUR = 2.6;
const BASE = { px: 60, py: 54, t: 0, T1: 0, S1: 0, T2: 0, S2: 0, U1: 0, F1: 0, U2: 0, F2: 0, P1: 90, P2: 90 };

const R = (d) => (d * Math.PI) / 180;
const go = ([x, y], a, l) => [x + l * Math.sin(R(a)), y + l * Math.cos(R(a))];

function joints(q) {
  const p = [q.px, q.py];
  const n = [p[0] + LEN.torso * Math.sin(R(q.t)), p[1] - LEN.torso * Math.cos(R(q.t))];
  const h = [n[0] + LEN.neck * Math.sin(R(q.t)), n[1] - LEN.neck * Math.cos(R(q.t))];
  const k1 = go(p, q.T1, LEN.thigh), a1 = go(k1, q.S1, LEN.shin), t1 = go(a1, q.P1, LEN.foot);
  const k2 = go(p, q.T2, LEN.thigh), a2 = go(k2, q.S2, LEN.shin), t2 = go(a2, q.P2, LEN.foot);
  const e1 = go(n, q.U1, LEN.ua), w1 = go(e1, q.F1, LEN.fa);
  const e2 = go(n, q.U2, LEN.ua), w2 = go(e2, q.F2, LEN.fa);
  const wm = [(w1[0] + w2[0]) / 2, (w1[1] + w2[1]) / 2];
  return { p, n, h, k1, a1, t1, k2, a2, t2, e1, w1, e2, w2, wm };
}

/* ---------- the poses ---------- */
const CHAIR = [{ r: [30, 68, 24, 5] }, { l: [33, 73, 33, 92] }, { l: [51, 73, 51, 92] }];
const F = {
  walk: { a: { py: 55, T1: 20, S1: 5, T2: -15, S2: -25, U1: -20, F1: -5, U2: 20, F2: 40 },
          b: { T1: -15, S1: -25, T2: 20, S2: 5, U1: 20, F1: 40, U2: -20, F2: -5 } },
  stairs: { a: { T1: 70, S1: 10, T2: -5, S2: -5, U1: -15, U2: 15, F2: 30 },
            b: { T1: -5, S1: -5, T2: 70, S2: 10, U1: 15, F1: 30, U2: -15, F2: 0 },
            props: [{ r: [72, 79, 44, 13] }, { r: [96, 66, 20, 26] }] },
  bike: { a: { px: 48, py: 58, t: 28, T1: 70, S1: -5, T2: 45, S2: -10, U1: 65, F1: 80, U2: 65, F2: 80 },
          b: { T1: 45, S1: -10, T2: 70, S2: -5 },
          props: [{ l: [40, 60, 56, 60] }, { l: [48, 61, 64, 82] }, { l: [64, 82, 80, 47] }, { l: [76, 47, 86, 47] }, { c: [64, 82, 5] }] },
  bridge: { a: { px: 54, py: 89, t: -88, T1: 141, S1: 18, T2: 141, S2: 18, U1: 90, F1: 90, U2: 90, F2: 90 },
            b: { px: 49, py: 73, t: -128, T1: 93, S1: 14, T2: 93, S2: 14 } },
  hipThrust: { a: { px: 56, py: 85, t: -59, T1: 120, S1: 22, T2: 120, S2: 22, U1: 59, F1: 59, U2: 59, F2: 59 },
               b: { px: 60, py: 73, t: -90, T1: 90, S1: 3, T2: 90, S2: 3, U1: 95, F1: 85, U2: 95, F2: 85 },
               props: [{ r: [6, 75, 32, 5] }, { l: [10, 80, 10, 92] }, { l: [34, 80, 34, 92] }, { plate: "w1", rad: 7 }] },
  deadbug: { a: { px: 60, py: 88, t: -90, T1: 180, S1: 90, T2: 180, S2: 90, U1: 180, F1: 180, U2: 180, F2: 180, P1: 180, P2: 180 },
             b: { U1: -100, F1: -100, T2: 95, S2: 95 } },
  plank: { a: { px: 50, py: 78, t: 88, T1: -75, S1: -75, T2: -75, S2: -75, U1: 0, F1: 90, U2: 0, F2: 90, P1: 0, P2: 0 },
           b: { py: 76.5, t: 86 } },
  pushup: { a: { px: 50, py: 72, t: 66, T1: -40, S1: -110, T2: -40, S2: -110, P1: -110, P2: -110 },
            b: { px: 49, py: 81, t: 85, T1: -70, T2: -70, U1: -60, F1: 76, U2: -60, F2: 76 } },
  sidePlank: { a: { px: 53, py: 82, t: 66, T1: -63, S1: -90, T2: -63, S2: -90, U1: 0, F1: 90, U2: 180, F2: 180, P1: -90, P2: -90 },
               b: { px: 52, py: 76, t: 80, T1: -47, T2: -47 } },
  child: { a: { px: 46, py: 84, t: 90, T1: 72, S1: -90, T2: 72, S2: -90, U1: 95, F1: 95, U2: 95, F2: 95, P1: -90, P2: -90 },
           b: { py: 82, t: 84 } },
  catcow: { a: { px: 52, py: 73, t: 68, T1: 0, S1: -90, T2: 0, S2: -90, P1: -90, P2: -90 },
            b: { py: 71, t: 80 } },
  legsWall: { a: { px: 70, py: 89, t: -90, T1: 180, S1: 180, T2: 180, S2: 180, U1: -90, F1: -90, U2: -90, F2: -90, P1: 180, P2: 180 },
              b: { T1: 175, S1: 177, T2: 175, S2: 177 }, props: [{ l: [76, 20, 76, 92] }] },
  clam: { a: { px: 60, py: 82, t: -90, T1: 90, S1: -60, T2: 90, S2: -60, U1: -90, F1: -90, U2: 95, F2: 95, P1: -60, P2: -60 },
          b: { T2: 135, S2: -29 } },
  pigeon: { a: { px: 55, py: 86, t: 10, T1: 95, S1: -90, T2: -88, S2: -88, U1: 10, F1: 10, U2: 10, F2: 10, P1: -90, P2: -90 },
            b: { t: 62, U1: 100, F1: 100, U2: 100, F2: 100 } },
  couch: { a: { px: 45, py: 72, T1: 90, S1: 0, T2: -21, S2: -160, U1: 0, F1: 0, U2: 10, F2: 10, P2: -160 },
           b: { px: 48, t: -8 }, props: [{ r: [12, 68, 16, 24] }] },
  calfStretch: { a: { px: 55, py: 56, t: 20, T1: 20, S1: 10, T2: -25, S2: -25, U1: 90, F1: 80, U2: 90, F2: 80 },
                 b: { px: 58, py: 57, t: 30, U1: 120, F1: 120, U2: 120, F2: 120 }, props: [{ l: [95, 12, 95, 92] }] },
  ankleRock: { a: { px: 46, py: 72, T1: 87, S1: 17.5, T2: -18, S2: -90, U1: -30, F1: 60, U2: -30, F2: 60, P2: -90 },
               b: { px: 54, T1: 81, S1: -7, T2: -30 } },
  ninety: { front: true, a: { px: 60, py: 82, T1: 140, S1: -40, T2: 95, S2: -80, U1: -40, F1: -30, U2: 40, F2: 30 },
            b: { T1: -95, S1: 80, T2: -140, S2: 40 } },
  wgs: { a: { px: 50, py: 69, t: 55, T1: 75, S1: -10, T2: -60, S2: -60, P2: -60 },
         b: { U2: 180, F2: 180 } },
  bandWalk: { front: true, a: { py: 55, T1: -12, S1: -4, T2: 12, S2: 4, U1: -35, F1: 60, U2: 35, F2: -60 },
              b: { px: 54, T1: -25, S1: -8, T2: 8, S2: 2 }, props: [{ band: ["k1", "k2"] }] },
  abduction: { front: true, a: { py: 62, T1: -55, S1: 0, T2: 55, S2: 0, U1: -25, F1: -5, U2: 25, F2: 5 },
               b: { T1: -80, S1: -15, T2: 80, S2: 15 }, props: [{ r: [36, 62, 48, 6] }, { r: [44, 30, 32, 30], fill: 1 }] },
  rdl: { a: { px: 50, py: 54, T1: 5, S1: -5, T2: 5, S2: -5 },
         b: { px: 44, py: 56, t: 80, T1: 15, S1: -8, T2: 15, S2: -8 }, props: [{ plate: "w1", rad: 7 }] },
  slrdl: { a: { px: 50, py: 54, T1: 3, S1: -3, T2: -5, S2: -15 },
           b: { px: 46, py: 56, t: 80, T1: 12, S1: -6, T2: -80, S2: -80, P2: 0 } },
  bulgarian: { a: { px: 52, py: 54, t: 8, T1: 10, S1: -5, T2: -25, S2: -90, U1: -10, U2: -10, P2: -90 },
               b: { px: 48, py: 70, t: 18, T1: 70, S1: -35, T2: -10, S2: -140 },
               props: [{ r: [6, 72, 26, 6] }, { l: [10, 78, 10, 92] }, { l: [28, 78, 28, 92] }, { db: "w1" }] },
  goblet: { a: { px: 55, py: 54, U1: 10, F1: 160, U2: 10, F2: 160 },
            b: { px: 45, py: 74, t: 30, T1: 90, S1: -27, T2: 90, S2: -27 }, props: [{ db: "w1", up: 1 }] },
  squatHold: { a: { px: 45, py: 74, t: 30, T1: 90, S1: -27, T2: 90, S2: -27, U1: 70, F1: 110, U2: 70, F2: 110 },
               b: { py: 72.5, t: 26 } },
  cossack: { front: true, a: { px: 45, py: 74, T1: -90, S1: 34, T2: 62.8, S2: 62.8, U1: 20, F1: 100, U2: -20, F2: -100, P2: 160 },
             b: { px: 73, T1: -62.8, S1: -62.8, T2: 90, S2: -34, P1: -160, P2: 90 } },
  calfRaise: { a: { px: 55, py: 54, T2: -10, S2: -100, U1: 60, F1: 60, U2: 10, F2: 10, P2: -100 },
               b: { py: 49, P1: 35 }, props: [{ l: [84, 36, 84, 92] }] },
  tib: { a: { px: 45, py: 56, t: -5, T1: 12, S1: 12, T2: 12, S2: 12, U1: -10, F1: -10, U2: -10, F2: -10 },
         b: { P1: 135, P2: 135 }, props: [{ l: [37, 10, 37, 92] }] },
  stepup: { a: { px: 50, py: 54, t: 5, T1: 75, S1: 5, U1: -20, F1: -10, U2: 20, F2: 30 },
            b: { px: 70, py: 40, T1: 0, S1: 0, T2: 70, S2: 0, U1: 20, F1: 30, U2: -20, F2: -10 },
            props: [{ r: [62, 78, 36, 14] }, { db: "w1" }] },
  lunge: { a: { px: 52, py: 54, U1: -5, U2: 5 },
           b: { py: 66, T1: 71.6, S1: 6, T2: -28, S2: -65, P2: -10 }, props: [{ db: "w1" }] },
  curtsy: { front: true, a: { py: 54, T1: -5, S1: -5, T2: 5, S2: 5, U1: 30, F1: 120, U2: -30, F2: -120 },
            b: { px: 58, py: 60, T1: -30, S1: -5, T2: -15, S2: -40 } },
  sumo: { front: true, a: { py: 57, T1: -24, S1: -24, T2: 24, S2: 24, U1: 0, F1: 0, U2: 0, F2: 0 },
          b: { py: 69, T1: -75, S1: 13, T2: 75, S2: -13 }, props: [{ db: "wm", up: 1 }] },
  pullThrough: { a: { px: 50, py: 56, t: 75, T1: 10, S1: -8, T2: 10, S2: -8, U1: -30, F1: -40, U2: -30, F2: -40 },
                 b: { px: 55, py: 54, t: 0, T1: 0, S1: 0, T2: 0, S2: 0, U1: -5, F1: -5, U2: -5, F2: -5 },
                 props: [{ cable: [6, 86, "w1"] }, { l: [4, 70, 4, 92] }] },
  kickback: { a: { px: 55, py: 54, t: 30, T1: 10, S1: -20, U1: 80, F1: 80, U2: 80, F2: 80, P1: -20 },
              b: { T1: -50, S1: -60, P1: -60 }, props: [{ cable: [10, 90, "a1"] }, { l: [8, 60, 8, 92] }] },
  legCurl: { a: { px: 45, py: 66, t: -10, T1: 90, S1: 60, T2: 90, S2: 60, U1: 20, F1: 30, U2: 20, F2: 30, P1: 150, P2: 150 },
             b: { S1: -15, S2: -15, P1: 75, P2: 75 }, props: [{ r: [26, 68, 38, 6] }, { l: [30, 68, 24, 34] }, { l: [45, 74, 45, 92] }] },
  legPress: { a: { px: 40, py: 72, t: -55, T1: 120, S1: 120, T2: 120, S2: 120, U1: 70, F1: 70, U2: 70, F2: 70, P1: 210, P2: 210 },
              b: { T1: 171, S1: 69, T2: 171, S2: 69 },
              props: [{ l: [16, 54, 38, 76] }, { l: [38, 76, 54, 76] }, { seg: ["a1", [-7, -12], [5, 8.5]] }] },
  pulldown: { front: true, a: { py: 62, U1: -150, F1: -170, U2: 150, F2: 170, T1: -45, S1: 0, T2: 45, S2: 0 },
              b: { U1: -40, F1: -160, U2: 40, F2: 160 },
              props: [{ r: [40, 62, 40, 5] }, { cable: [60, 1, "wm"] }, { bar: ["w1", "w2"] }] },
  press: { front: true, a: { U1: -90, F1: -180, U2: 90, F2: 180 }, b: { U1: -160, F1: -175, U2: 160, F2: 175 },
           props: [{ db: "w1" }, { db: "w2" }] },
  lateral: { front: true, a: { U1: -8, F1: -12, U2: 8, F2: 12 }, b: { U1: -85, F1: -90, U2: 85, F2: 90 },
             props: [{ db: "w1", up: 1 }, { db: "w2", up: 1 }] },
  curl: { a: { U1: 5, F1: 5, U2: 5, F2: 5 }, b: { F1: 150, F2: 150 }, props: [{ db: "w1" }] },
  curlPress: { front: true, a: { U1: -15, F1: -165, U2: 15, F2: 165 }, b: { U1: -172, F1: -178, U2: 172, F2: 178 },
               props: [{ db: "w1" }, { db: "w2" }] },
  pushdown: { a: { t: 8, U1: 5, F1: 110, U2: 5, F2: 110 }, b: { F1: 5, F2: 5 }, props: [{ cable: [80, 3, "w1"] }] },
  overhead: { a: { U1: 170, F1: -25, U2: 170, F2: -25 }, b: { F1: 175, F2: 175 }, props: [{ db: "w1", up: 1 }] },
  triKick: { a: { px: 50, py: 55, t: 70, T1: 15, S1: -10, T2: 15, S2: -10, U1: -85, F1: 0, U2: 10, F2: 10 },
             b: { F1: -90 }, props: [{ db: "w1" }] },
  dip: { a: { px: 44, py: 73, T1: 90, S1: 0, T2: 90, S2: 0, U1: -8, F1: -8, U2: -8, F2: -8 },
         b: { px: 46, py: 84, T1: 122, S1: 3, T2: 122, S2: 3, U1: -57.5, F1: 45, U2: -57.5, F2: 45 },
         props: [{ r: [8, 76, 32, 5] }, { l: [12, 81, 12, 92] }, { l: [36, 81, 36, 92] }] },
  // machines / cables / Smith / bands
  legExt: { a: { px: 45, py: 66, t: -10, T1: 90, S1: -10, T2: 90, S2: -10, U1: 20, F1: 30, U2: 20, F2: 30, P1: 75, P2: 75 },
            b: { S1: 90, S2: 90, P1: 170, P2: 170 }, props: [{ r: [26, 68, 38, 6] }, { l: [30, 68, 24, 34] }, { l: [45, 74, 45, 92] }] },
  adductor: { front: true, a: { py: 62, T1: -80, S1: -15, T2: 80, S2: 15, U1: -25, F1: -5, U2: 25, F2: 5 },
              b: { T1: -55, S1: 0, T2: 55, S2: 0 }, props: [{ r: [36, 62, 48, 6] }, { r: [44, 30, 32, 30], fill: 1 }] },
  smithSquat: { a: { px: 55, py: 54, U1: -30, F1: -170, U2: -30, F2: -170 },
                b: { px: 47, py: 72, t: 22, T1: 90, S1: -22, T2: 90, S2: -22 },
                props: [{ l: [24, 4, 24, 92] }, { l: [92, 4, 92, 92] }, { bar: ["w1", "w1"] }] },
  smithSplit: { a: { px: 52, py: 55, t: 3, T1: 20, S1: -5, T2: -28, S2: -30, U1: -30, F1: -170, U2: -30, F2: -170, P2: 0 },
                b: { px: 50, py: 68, T1: 75, S1: -30, T2: -15, S2: -70 },
                props: [{ l: [20, 4, 20, 92] }, { l: [94, 4, 94, 92] }, { bar: ["w1", "w1"] }] },
  backExt: { a: { px: 60, py: 58, t: 150, T1: -45, S1: -45, T2: -45, S2: -45, U1: 150, F1: -40, U2: 150, F2: -40, P1: 45, P2: 45 },
             b: { t: 45, U1: 120, F1: -90, U2: 120, F2: -90 },
             props: [{ l: [55, 66, 67, 54] }, { l: [36, 90, 58, 64] }, { l: [28, 80, 38, 90] }] },
  seatedRow: { a: { px: 40, py: 68, T1: 80, S1: 20, T2: 80, S2: 20, U1: 90, F1: 90, U2: 90, F2: 90 },
               b: { U1: -40, F1: 80, U2: -40, F2: 80 },
               props: [{ r: [26, 70, 26, 5] }, { l: [39, 75, 39, 92] }, { cable: [104, 50, "w1"] }, { l: [104, 30, 104, 92] }] },
  chestPress: { a: { px: 40, py: 68, T1: 85, S1: 5, T2: 85, S2: 5, U1: -40, F1: 90, U2: -40, F2: 90 },
                b: { U1: 85, F1: 88, U2: 85, F2: 88 },
                props: [{ r: [26, 70, 26, 5] }, { r: [30, 38, 6, 32] }, { l: [39, 75, 39, 92] }, { plate: "w1", rad: 2.6 }] },
  machineCurl: { a: { px: 40, py: 68, t: 10, T1: 85, S1: 5, T2: 85, S2: 5, U1: 115, F1: 50, U2: 115, F2: 50 },
                 b: { F1: 175, F2: 175 },
                 props: [{ r: [26, 70, 26, 5] }, { l: [39, 75, 39, 92] }, { l: [46, 47, 60, 54] }, { plate: "w1", rad: 2.6 }] },
  revFly: { front: true, a: { py: 62, T1: -45, S1: 0, T2: 45, S2: 0, U1: -60, F1: 80, U2: 60, F2: -80 },
            b: { U1: -90, F1: -90, U2: 90, F2: 90 }, props: [{ r: [40, 62, 40, 5] }, { plate: "w1", rad: 2.6 }, { plate: "w2", rad: 2.6 }] },
  legPressCalf: { a: { px: 40, py: 72, t: -55, T1: 120, S1: 120, T2: 120, S2: 120, U1: 70, F1: 70, U2: 70, F2: 70, P1: 225, P2: 225 },
                  b: { P1: 172, P2: 172 },
                  props: [{ l: [16, 54, 38, 76] }, { l: [38, 76, 54, 76] }, { seg: ["t1", [-6, -10], [5, 8.5]] }] },
  cableCurl: { a: { U1: 5, F1: 5, U2: 5, F2: 5 }, b: { F1: 150, F2: 150 }, props: [{ cable: [84, 90, "w1"] }, { l: [86, 20, 86, 92] }] },
  overheadCable: { a: { t: 25, U1: 170, F1: -10, U2: 170, F2: -10 }, b: { F1: 175, F2: 175 }, props: [{ cable: [16, 22, "w1"] }, { l: [14, 10, 14, 92] }] },
  donkey: { a: { px: 52, py: 73, t: 68, T1: 0, S1: -90, T2: 0, S2: -90, P1: -90, P2: -90 },
            b: { T1: -95, S1: 175, P1: 170 }, props: [{ band: ["a1", "k2"] }] },
  // ---- added for the Ascend (his) plan ----
  fig4: { a: { px: 64, py: 88, t: -90, T1: 150, S1: 95, T2: 141, S2: 18, U1: 90, F1: 90, U2: 90, F2: 90 },
          b: { T1: 165, S1: 110, T2: 165, S2: 60, U1: 110, F1: 130, U2: 110, F2: 130 } },
  towelHam: { a: { px: 62, py: 88, t: -90, T1: 150, S1: 150, T2: 141, S2: 18, U1: 145, F1: 150, U2: 145, F2: 150, P1: 200 },
              b: { T1: 172, S1: 172, U1: 160, F1: 165, U2: 160, F2: 165 }, props: [{ band: ["w1", "a1"] }] },
  supineMarch: { a: { px: 56, py: 89, t: -90, T1: 141, S1: 18, T2: 141, S2: 18, U1: 90, F1: 90, U2: 90, F2: 90 },
                 b: { T1: 180, S1: 90, P1: 180 } },
  ankleCircle: { a: { px: 45, py: 66, T1: 90, S1: 0, T2: 85, S2: 75, U1: 20, F1: 60, U2: 20, F2: 60, P2: 130 },
                 m: { P2: 175 }, b: { P2: 50 }, props: CHAIR },
  seatedKnee: { a: { px: 45, py: 66, T1: 90, S1: 0, T2: 90, S2: 0, U1: 20, F1: 60, U2: 20, F2: 60 },
                b: { T1: 112, S1: 15 }, props: CHAIR },
  sidePlankFull: { a: { px: 54, py: 83.5, t: 65, T1: -76.7, S1: -76.7, T2: -76.7, S2: -76.7, U1: 0, F1: 90, U2: 180, F2: 180, P1: -90, P2: -90 },
                   b: { py: 80.3, t: 72, T1: -72, S1: -72, T2: -72, S2: -72 } },
  birdDog: { a: { px: 52, py: 73, t: 68, T1: 0, S1: -90, T2: 0, S2: -90, P1: -90, P2: -90 },
             b: { T1: -88, S1: -88, P1: 0, U2: 95, F2: 95 } },
  pallof: { a: { T1: 8, S1: 8, T2: -8, S2: -8, U1: 20, F1: 110, U2: 20, F2: 110 },
            b: { U1: 90, F1: 90, U2: 90, F2: 90 } },
  hipFlexor: { a: { px: 45, py: 72, T1: 90, S1: 0, T2: -21, S2: -90, U1: -30, F1: 60, U2: -30, F2: 60, P2: -90 },
               b: { px: 49, t: -6, T2: -32 } },
  butterfly: { front: true, a: { px: 60, py: 84, T1: -108, S1: 54, T2: 108, S2: -54, U1: -10, F1: 10, U2: 10, F2: -10 },
               b: { T1: -98, S1: 78, T2: 98, S2: -78 } },
  hipExt: { a: { px: 52, t: 12, U1: 80, F1: 80, U2: 80, F2: 80 }, b: { T1: -28, S1: -35, P1: 30 }, props: [{ l: [88, 10, 88, 92] }] },
  balance: { a: { T2: 70, S2: -5, U1: -50, F1: -40, U2: 50, F2: 40 }, b: { px: 61, t: 3, T2: 60, S2: 0 } },
  pullApart: { front: true, a: { U1: -60, F1: 80, U2: 60, F2: -80 }, b: { U1: -90, F1: -90, U2: 90, F2: 90 }, props: [{ band: ["w1", "w2"] }] },
  wallSlide: { front: true, a: { U1: -100, F1: -175, U2: 100, F2: 175 }, b: { U1: -150, F1: -165, U2: 150, F2: 165 } },
  dislocate: { a: { U1: 25, F1: 25, U2: 25, F2: 25 }, m: { U1: 180, F1: 180, U2: 180, F2: 180 }, b: { U1: 325, F1: 325, U2: 325, F2: 325 } },
  openBook: { a: { px: 60, py: 82, t: -90, T1: 90, S1: -60, T2: 90, S2: -60, U1: 60, F1: 90, U2: 60, F2: 90, P1: -60, P2: -60 },
              m: { U2: 180, F2: 180 }, b: { U2: 235, F2: 235 } },
  proneY: { a: { px: 50, py: 88, t: 90, T1: -90, S1: -90, T2: -90, S2: -90, U1: 95, F1: 95, U2: 95, F2: 95, P1: 0, P2: 0 },
            b: { t: 85, U1: 75, F1: 75, U2: 75, F2: 75 } },
  benchPress: { a: { px: 62, py: 64, t: -90, T1: 60, S1: -10, T2: 60, S2: -10, U1: 180, F1: 180, U2: 180, F2: 180 },
                b: { U1: 10, F1: 170, U2: 10, F2: 170 },
                props: [{ r: [18, 66, 52, 5] }, { l: [24, 71, 24, 92] }, { l: [64, 71, 64, 92] }, { plate: "w1", rad: 6 }] },
  inclinePress: { a: { px: 55, py: 68, t: -45, T1: 65, S1: -10, T2: 65, S2: -10, U1: 150, F1: 150, U2: 150, F2: 150 },
                  b: { U1: 20, F1: 150, U2: 20, F2: 150 },
                  props: [{ l: [33, 46, 57, 72] }, { l: [52, 72, 66, 72] }, { l: [56, 72, 56, 92] }, { db: "w1" }] },
  seatedCalf: { a: { px: 45, py: 64, T1: 90, S1: 0, T2: 90, S2: 0, U1: 60, F1: 90, U2: 60, F2: 90, P1: 110, P2: 110 },
                b: { py: 62, P1: 60, P2: 60 },
                props: [{ r: [30, 66, 24, 5] }, { l: [42, 71, 42, 92] }, { r: [62, 86, 14, 6] }, { seg: ["k1", [-7, -4], [8, -4]] }] },
  splitSquat: { a: { px: 52, py: 55, t: 3, T1: 20, S1: -5, T2: -28, S2: -30, U1: 70, F1: 70, U2: 70, F2: 70, P2: 0 },
                b: { px: 50, py: 68, T1: 75, S1: -30, T2: -15, S2: -70 }, props: [{ l: [94, 40, 94, 92] }] },
  stepupBW: { a: { px: 50, py: 54, t: 5, T1: 75, S1: 5, U1: -20, F1: -10, U2: 20, F2: 30 },
              b: { px: 70, py: 40, T1: 0, S1: 0, T2: 70, S2: 0, U1: 20, F1: 30, U2: -20, F2: -10 }, props: [{ r: [62, 78, 36, 14] }] },
  chestRow: { a: { px: 42, py: 66, t: 45, T1: 85, S1: 10, T2: 85, S2: 10, U1: 20, F1: 20, U2: 20, F2: 20 },
              b: { U1: -60, F1: 40, U2: -60, F2: 40 },
              props: [{ r: [28, 68, 26, 5] }, { l: [41, 73, 41, 92] }, { l: [63, 42, 72, 56] }, { plate: "w1", rad: 2.6 }] },
  inclineCurl: { a: { px: 52, py: 68, t: -30, T1: 70, S1: -10, T2: 70, S2: -10, U1: -12, F1: -12, U2: -12, F2: -12 },
                 b: { F1: 140, F2: 140 },
                 props: [{ l: [37, 42, 51, 72] }, { l: [50, 72, 66, 72] }, { l: [56, 72, 56, 92] }, { db: "w1" }] },
  seatedCurl: { a: { px: 45, py: 66, T1: 90, S1: 0, T2: 90, S2: 0, U1: 5, F1: 5, U2: 5, F2: 5 }, b: { F1: 150, F2: 150 },
                props: [{ r: [30, 68, 24, 5] }, { l: [42, 73, 42, 92] }, { db: "w1" }] },
  lyingCurl: { a: { px: 50, py: 70, t: 90, T1: -90, S1: -90, T2: -90, S2: -90, U1: 60, F1: 0, U2: 60, F2: 0, P1: 0, P2: 0 },
               b: { S1: 150, S2: 150, P1: 240, P2: 240 },
               props: [{ r: [14, 72, 72, 5] }, { l: [20, 77, 20, 92] }, { l: [80, 77, 80, 92] }] },
  sideLegRaise: { a: { px: 64, py: 88, t: -90, T1: 90, S1: 90, T2: 90, S2: 90, U1: -90, F1: -90, U2: 100, F2: 100, P1: 180, P2: 180 },
                  b: { T2: 118, S2: 118 } },
  wristCurl: { a: { px: 45, py: 66, T1: 90, S1: 0, T2: 90, S2: 0, U1: 30, F1: 95, U2: 30, F2: 95 }, b: { F1: 70, F2: 70 },
               props: [{ r: [30, 68, 24, 5] }, { l: [42, 73, 42, 92] }, { plate: "w1", rad: 2.5 }] },
};

/* ---------- SVG builder ---------- */
const f1 = (v) => Math.round(v * 10) / 10;
const SPL = ".45 0 .55 1";
function anim(attr, a, b, m) {
  if (m === undefined) {
    if (Math.abs(a - b) < 0.05) return "";
    return `<animate attributeName="${attr}" values="${f1(a)};${f1(b)};${f1(a)}" keyTimes="0;0.5;1" dur="${DUR}s" repeatCount="indefinite" calcMode="spline" keySplines="${SPL};${SPL}"/>`;
  }
  if (Math.abs(a - b) < 0.05 && Math.abs(a - m) < 0.05) return "";
  return `<animate attributeName="${attr}" values="${f1(a)};${f1(m)};${f1(b)};${f1(m)};${f1(a)}" keyTimes="0;0.25;0.5;0.75;1" dur="${DUR * 1.3}s" repeatCount="indefinite" calcMode="spline" keySplines="${SPL};${SPL};${SPL};${SPL}"/>`;
}
let MID = null; // joints of the optional middle pose, set per figure
function line(A, B, [j1, j2], cls) {
  const [a1, a2, b1, b2] = [A[j1], A[j2], B[j1], B[j2]];
  const m1 = MID?.[j1], m2 = MID?.[j2];
  return `<line class="${cls}" x1="${f1(a1[0])}" y1="${f1(a1[1])}" x2="${f1(a2[0])}" y2="${f1(a2[1])}">${anim("x1", a1[0], b1[0], m1?.[0])}${anim("y1", a1[1], b1[1], m1?.[1])}${anim("x2", a2[0], b2[0], m2?.[0])}${anim("y2", a2[1], b2[1], m2?.[1])}</line>`;
}
function moveG(A, B, j, inner) {
  const [a, b] = [A[j], B[j]];
  const am = Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.05 ? "" :
    `<animateTransform attributeName="transform" type="translate" values="${f1(a[0])} ${f1(a[1])};${f1(b[0])} ${f1(b[1])};${f1(a[0])} ${f1(a[1])}" keyTimes="0;0.5;1" dur="${DUR}s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>`;
  return `<g transform="translate(${f1(a[0])} ${f1(a[1])})">${am}${inner}</g>`;
}

function propSvg(p, A, B) {
  if (p.r) return `<rect class="${p.fill ? "fg-fill" : "fg-prop"}" x="${p.r[0]}" y="${p.r[1]}" width="${p.r[2]}" height="${p.r[3]}" rx="2"/>`;
  if (p.l) return `<line class="fg-prop" x1="${p.l[0]}" y1="${p.l[1]}" x2="${p.l[2]}" y2="${p.l[3]}"/>`;
  if (p.c) return `<circle class="fg-prop" cx="${p.c[0]}" cy="${p.c[1]}" r="${p.c[2]}"/>`;
  if (p.plate) return moveG(A, B, p.plate, `<circle class="fg-plate" r="${p.rad || 6}"/>`);
  if (p.db) return moveG(A, B, p.db, p.up
    ? `<rect class="fg-db" x="-1.3" y="-6" width="2.6" height="12" rx="1"/><rect class="fg-db" x="-3" y="-7" width="6" height="3.4" rx="1"/><rect class="fg-db" x="-3" y="3.6" width="6" height="3.4" rx="1"/>`
    : `<rect class="fg-db" x="-6" y="-1.3" width="12" height="2.6" rx="1"/><rect class="fg-db" x="-7" y="-3" width="3.4" height="6" rx="1"/><rect class="fg-db" x="3.6" y="-3" width="3.4" height="6" rx="1"/>`);
  if (p.cable) {
    const fake = { ...A, _a: [p.cable[0], p.cable[1]] }, fakeB = { ...B, _a: [p.cable[0], p.cable[1]] };
    return line(fake, fakeB, ["_a", p.cable[2]], "fg-cable");
  }
  if (p.band) return line(A, B, p.band, "fg-band");
  if (p.bar) {
    const ext = (J) => { const [a, b] = [J[p.bar[0]], J[p.bar[1]]]; return { ...J, _l: [a[0] - 6, a[1]], _r: [b[0] + 6, b[1]] }; };
    return line(ext(A), ext(B), ["_l", "_r"], "fg-barline");
  }
  if (p.seg) {
    const off = (J) => { const j = J[p.seg[0]]; return { ...J, _s1: [j[0] + p.seg[1][0], j[1] + p.seg[1][1]], _s2: [j[0] + p.seg[2][0], j[1] + p.seg[2][1]] }; };
    return line(off(A), off(B), ["_s1", "_s2"], "fg-prop thick");
  }
  return "";
}

export function figureSvg(key, big = false) {
  const f = F[key];
  if (!f) return "";
  const qa = { ...BASE, ...(f.front ? { P1: -90, P2: 90 } : {}), ...f.a };
  const qb = { ...qa, ...f.b };
  const A = joints(qa), B = joints(qb);
  MID = f.m ? joints({ ...qa, ...f.m }) : null;
  const far = f.front ? "fg-limb" : "fg-limb far";
  const props = (f.props || []);
  const back = props.filter((p) => p.r || p.l || p.c || p.cable).map((p) => propSvg(p, A, B)).join("");
  const front = props.filter((p) => !(p.r || p.l || p.c || p.cable)).map((p) => propSvg(p, A, B)).join("");
  const body = [
    line(A, B, ["n", "e2"], far), line(A, B, ["e2", "w2"], far),
    line(A, B, ["p", "k2"], far), line(A, B, ["k2", "a2"], far), line(A, B, ["a2", "t2"], far + " foot"),
    line(A, B, ["n", "p"], "fg-limb torso"),
    line(A, B, ["p", "k1"], "fg-limb"), line(A, B, ["k1", "a1"], "fg-limb"), line(A, B, ["a1", "t1"], "fg-limb foot"),
    line(A, B, ["n", "e1"], "fg-limb"), line(A, B, ["e1", "w1"], "fg-limb"),
  ].join("");
  const head = `<circle class="fg-head" cx="${f1(A.h[0])}" cy="${f1(A.h[1])}" r="5.6">${anim("cx", A.h[0], B.h[0], MID?.h[0])}${anim("cy", A.h[1], B.h[1], MID?.h[1])}</circle>`;
  // soft shadow on the floor that follows the hips
  const sh = `<ellipse class="fg-shadow" cx="${f1(A.p[0])}" cy="93" rx="16" ry="2.6">${anim("cx", A.p[0], B.p[0], MID?.p[0])}</ellipse>`;
  // a faint "ghost" of the end position so you can see where the move goes
  const ghost = big ? `<g class="fg-ghost">${[["n","p"],["p","k1"],["k1","a1"],["p","k2"],["k2","a2"],["n","e1"],["e1","w1"],["n","e2"],["e2","w2"]].map(([x, y]) => `<line x1="${f1(B[x][0])}" y1="${f1(B[x][1])}" x2="${f1(B[y][0])}" y2="${f1(B[y][1])}"/>`).join("")}<circle cx="${f1(B.h[0])}" cy="${f1(B.h[1])}" r="5.6"/></g>` : "";
  return `<svg class="fig-svg${big ? " big" : ""}" viewBox="0 0 120 100" aria-hidden="true"><line class="fg-floor" x1="2" y1="92.8" x2="118" y2="92.8"/>${sh}${back}${ghost}${body}${head}${front}</svg>`;
}

export const FIGURE_KEYS = Object.keys(F);
export const hasFigure = (k) => !!F[k];
