import { k, G, drawer, part } from "./common.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";

/**
 * GigSense as a sealed field case. The profit sum is done by a hand calculator inside the case and
 * works with the radio dead. Evidence goes into three steel trays that have no way out. The radio
 * mast on the lid only ever carries a paper slip through a narrow slot: text, never the files.
 */
export const WIDTH = 1040;
export const HEIGHT = 600;
const PLATE = { x: -232, y: -112, w: 460, d: 208, r: 10 };
const CASE = { x: -190, y: -74, w: 280, d: 148, r: 9 };
const WALL = 7, CZ = 3, CH = 42;

export function build() {
  const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [CASE.x, CASE.y, 170], [CASE.x + CASE.w, CASE.y, 170], [166, -70, 192]], WIDTH, HEIGHT, { pad: 22, azimuth: 60 });
  const { S, L, D, at, byDepth, slab, post, screws, bench, dialFace } = drawer(P);
  const out = [];
  out.push(bench(PLATE, { ruler: { x: PLATE.x + 24, y: PLATE.y + PLATE.d - 14, w: 310, d: 7, r: 1 }, label: { x: PLATE.x + 348, y: PLATE.y + PLATE.d - 25, w: 96, d: 19, r: 1.5 } }));

  // ---- The lid, standing open behind the case, ribbed like a real moulded case.
  const lid = [];
  const LID = { x: CASE.x, y: CASE.y - 6, w: CASE.w, d: 6, r: 2 };
  lid.push(S(k.slabOf(LID, CZ + CH, 118, P, 3, 0.8), { tone: "mid", crease: "lo", inner: L(k.sideSeam(LID, CZ + CH + 112, P, 3), { tone: "faint" }) }));
  const ly = CASE.y;
  const rect = (x0, x1, z0, z1) => k.pathOf([at([x0, ly, z0]), at([x1, ly, z0]), at([x1, ly, z1]), at([x0, ly, z1])], true);
  lid.push(`<path class="fg-foam" d="${rect(CASE.x + 8, CASE.x + CASE.w - 8, CZ + CH + 6, CZ + CH + 110)}"/>`);
  lid.push(L(rect(CASE.x + 8, CASE.x + CASE.w - 8, CZ + CH + 6, CZ + CH + 110), { tone: "lo" }));
  // Foam pattern in the lid, as closed cells that end on the foam's edge.
  const foam = [];
  for (let c = 0; c < 18; c++) for (let r = 0; r < 6; r++) {
    const x = CASE.x + 14 + c * 15.4 + (r % 2 ? 7.7 : 0);
    if (x > CASE.x + CASE.w - 20) continue;
    const z = CZ + CH + 13 + r * 16;
    foam.push(k.pathOf([at([x, ly, z]), at([x + 5, ly, z + 5]), at([x, ly, z + 10]), at([x - 5, ly, z + 5])], true));
  }
  lid.push(L(foam.join(""), { tone: "faint" }));
  // Hinge knuckles along the back edge.
  for (const x of [CASE.x + 40, CASE.x + 150, CASE.x + 260]) lid.push(slab({ x: x - 12, y: CASE.y - 9, w: 24, d: 4, r: 1 }, CZ + CH - 4, 9, "hi", { bevel: 0.3, crease: "lo" }));
  out.push(part("lid", lid.join("")));

  // ---- Radio on a bracket beside the lid, with a mast. The only way out of the case.
  const RAD = { x: 112, y: -96, w: 58, d: 52, r: 3 };
  const rad = [];
  rad.push(`<path class="iso-halo" d="${k.haloOf(RAD, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  rad.push(slab({ x: RAD.x - 3, y: RAD.y - 3, w: RAD.w + 6, d: RAD.d + 6, r: 4 }, 0, 3, "lo", { bevel: 0.6 }));
  rad.push(screws({ x: RAD.x - 3, y: RAD.y - 3, w: RAD.w + 6, d: RAD.d + 6, r: 4 }, 2.8, 3, 1));
  rad.push(S(k.slabOf(RAD, 3, 50, P, 3, 0.8), { tone: "mid", crease: "lo", inner: L(k.sideSeam(RAD, 10, P, 3), { tone: "faint" }) + L(k.sideSeam(RAD, 46, P, 3), { tone: "faint" }) }));
  const rx = RAD.x + RAD.w;
  for (let i = 0; i < 5; i++) {
    const z = 16 + i * 5.4;
    rad.push(L(k.pathOf([at([rx, RAD.y + 10, z]), at([rx, RAD.y + 42, z]), at([rx, RAD.y + 42, z + 2.4]), at([rx, RAD.y + 10, z + 2.4])], true), { tone: "lo" }));
  }
  const ry = RAD.y + RAD.d;
  // Signal bars on the +y face.
  [0, 1, 2, 3].forEach((i) => {
    const x = RAD.x + 10 + i * 8, z0 = 22, h = 5 + i * 4;
    rad.push(`<path class="fg-bar" data-bar="${i}" d="${k.pathOf([at([x, ry, z0]), at([x + 5, ry, z0]), at([x + 5, ry, z0 + h]), at([x, ry, z0 + h])], true)}"/>`);
  });
  rad.push(L(k.pathOf([at([RAD.x + 7, ry, 19]), at([RAD.x + 45, ry, 19]), at([RAD.x + 45, ry, 44]), at([RAD.x + 7, ry, 44])], true), { tone: "lo" }));
  // Knob on top, mast with sections.
  const kx = RAD.x + 16, ky = RAD.y + 16;
  rad.push(S(k.cylinder(kx, ky, 6, 53, 5, P, 28), { tone: "hi" }), L(k.knurl(kx, ky, 6, 53, 58, 30, P), { tone: "lo" }), L(k.lineOnTop([kx, ky], [kx + 5, ky], 58, P), { tone: "hi", free: true }));
  const mx = RAD.x + 42, my = RAD.y + 26;
  rad.push(post(mx, my, 5, 53, 5, "mid", 18));
  rad.push(post(mx, my, 2.2, 58, 56, "mid", 14));
  rad.push(post(mx, my, 1.4, 114, 44, "hi", 12));
  rad.push(post(mx, my, 0.8, 158, 26, "hi", 10));
  rad.push(L(k.sideArc(mx, my, 2.2, 90, P, 10), { tone: "faint" }));
  rad.push(D([[mx, my, 184]], { size: 1.3, tone: "hi" }));
  rad.push(`<g data-slot="waves"></g>`);
  out.push(part("radio", rad.join("")));

  // ---- Case: outer shell, then the inside seen from above.
  const shell = [];
  shell.push(`<path class="iso-halo" d="${k.haloOf(CASE, 0, 0.1, P)}" style="filter:blur(8px)"/>`);
  shell.push(slab({ x: CASE.x + 8, y: CASE.y + 8, w: CASE.w - 16, d: CASE.d - 16, r: 6 }, 0, CZ, "lo", { bevel: 0, steps: 6 }));
  shell.push(S(k.slabOf(CASE, CZ, CH, P, 8, 1.2), { tone: "mid", crease: "lo", inner: [14, 30].map((z) => L(k.sideSeam(CASE, CZ + z, P, 8), { tone: "faint" })).join("") }));
  const inner = k.insetPlan(CASE, WALL);
  shell.push(`<path class="fg-foam" d="${k.planOutline(inner, CZ + CH, P, 8)}"/>`);
  const cells = [];
  for (let c = 0; c < 44; c++) for (let r = 0; r < 22; r++) {
    const x = inner.x + 6 + c * 6 + (r % 2 ? 3 : 0), y = inner.y + 6 + r * 6;
    if (x < inner.x + inner.w - 5 && y < inner.y + inner.d - 5) cells.push(k.iso([x, y, CZ + CH], P));
  }
  shell.push(k.dotsSvg(cells, { size: 0.42, tone: "lo" }));
  shell.push(L(k.planOutline(inner, CZ + CH, P, 8), { tone: "mid" }));
  // Clamp latches on the front wall.
  const fy = CASE.y + CASE.d;
  for (const x of [CASE.x + 60, CASE.x + 210]) {
    shell.push(slab({ x, y: fy, w: 24, d: 2.4, r: 0.8 }, CZ + 24, 18, "mid", { bevel: 0.3, crease: "lo" }));
    shell.push(slab({ x: x + 7, y: fy + 2.4, w: 10, d: 2, r: 0.6 }, CZ + 28, 10, "hi", { bevel: 0.2, crease: "none" }));
    shell.push(D([[x + 3, fy + 2.4, CZ + 39], [x + 21, fy + 2.4, CZ + 39]], { size: 0.5 }));
  }
  // Rubber corner bumpers and a carry handle on the front wall.
  for (const [x, y] of byDepth([[CASE.x + 9, CASE.y + CASE.d - 9], [CASE.x + CASE.w - 9, CASE.y + CASE.d - 9], [CASE.x + CASE.w - 9, CASE.y + 9]])) {
    shell.push(D([[x, y, CZ + CH]], { size: 0.6, tone: "hi" }));
  }
  shell.push(slab({ x: CASE.x + 108, y: fy, w: 64, d: 7, r: 2 }, CZ + 22, 6, "mid", { bevel: 0.4 }));
  out.push(part("case", shell.join("")));

  // All the inside parts sit on the foam floor, just below the rim so they read as held in the well.
  const FLOOR = CZ + CH;
  const W = inner;
  const clipW = `<clipPath id="fc-well"><path d="${k.planOutline(inner, CZ + CH, P, 8)}"/></clipPath>`;
  out.push(clipW);

  // ---- Three evidence trays, stacked in a rack at the back left, no slot on any of them.
  const tr = [];
  const TR = { x: W.x + 8, y: W.y + 8, w: 104, d: 66 };
  ["deliveries", "incidents", "evidence"].forEach((name, i) => {
    const x = TR.x + i * 36;
    const plan = { x, y: TR.y, w: 32, d: TR.d, r: 2 };
    const z = FLOOR;
    tr.push(`<g data-tray="${i}">`);
    tr.push(S(k.slabOf(plan, z, 15, P, 3, 0.6), { tone: "hi", crease: "lo", inner: L(k.sideSeam(plan, z + 4, P, 3), { tone: "faint" }) }));
    const well = { x: x + 3, y: TR.y + 3, w: 26, d: TR.d - 6, r: 1 };
    tr.push(`<path class="fg-well" d="${k.planOutline(well, z + 15, P, 2)}"/>`);
    tr.push(L(k.planOutline(well, z + 15, P, 2), { tone: "lo" }));
    for (let c = 0; c < 5 + i; c++) {
      const yy = well.y + 4 + c * 6.2;
      tr.push(`<path class="fg-paper" d="${k.onTop([[well.x + 2, yy], [well.x + well.w - 2, yy], [well.x + well.w - 2, yy + 1.1], [well.x + 2, yy + 1.1]], z + 19, P, true)}"/>`);
    }
    tr.push(`</g>`);
  });
  out.push(part("trays", tr.join("")));
  out.push(`<g data-evidence></g>`);

  // ---- The calculator: the deterministic core. It works with no signal.
  const CALC = { x: W.x + 8, y: W.y + 84, w: 104, d: 40, r: 3 };
  const ca = [];
  ca.push(S(k.slabOf(CALC, FLOOR, 12, P, 3, 0.8), { tone: "mid", crease: "lo", inner: L(k.sideSeam(CALC, FLOOR + 4, P, 3), { tone: "faint" }) }));
  const top = FLOOR + 12;
  const screen = { x: CALC.x + 5, y: CALC.y + 4, w: 42, d: CALC.d - 8 };
  const sf = [[screen.x, screen.y], [screen.x + screen.w, screen.y], [screen.x + screen.w, screen.y + screen.d], [screen.x, screen.y + screen.d]];
  ca.push(`<path class="fg-screen" d="${k.onTop(sf, top, P, true)}"/>`);
  ca.push(L(k.onTop(sf, top, P, true), { tone: "mid" }));
  ca.push(`<g data-calc-bars></g>`);
  // Keys: a real grid of small raised keys.
  const keyPlan = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) keyPlan.push([CALC.x + 52 + c * 8, CALC.y + 4 + r * 8]);
  for (const [x, y] of byDepth(keyPlan)) ca.push(S(k.slabOf({ x, y, w: 6.4, d: 6.4, r: 1 }, top, 1.4, P, 2, 0.2), { tone: "hi", crease: "none" }));
  // The calculator prints its sum on a receipt that lies on the foam.
  const REC = { x: CALC.x + CALC.w + 6, y: CALC.y + 4, w: 28, d: 32 };
  const spool = G.frameOf([REC.x + 14, REC.y - 0.5, FLOOR + 6], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const recFace = [[REC.x, REC.y], [REC.x + REC.w, REC.y], [REC.x + REC.w, REC.y + REC.d], [REC.x, REC.y + REC.d]];
  ca.push(`<path class="fg-paper" d="${k.onTop(recFace, FLOOR + 0.6, P, true)}"/>`, L(k.onTop(recFace, FLOOR + 0.6, P, true), { tone: "lo" }));
  ca.push(`<g data-receipt>${[0, 1, 2, 3, 4, 5].map((i) => `<path class="iso-line fg-ink" data-free d="${k.lineOnTop([REC.x + 4, REC.y + 6 + i * 4.4], [REC.x + REC.w - (i % 2 ? 9 : 5), REC.y + 6 + i * 4.4], FLOOR + 0.6, P)}"/>`).join("")}</g>`);
  ca.push(S(G.disc(-15, 15, 6, spool, P), { tone: "hi", crease: "lo" }));
  ca.push(slab({ x: CALC.x + CALC.w, y: CALC.y + 6, w: 6, d: 8, r: 1 }, FLOOR, 8, "mid", { bevel: 0.3 }));
  out.push(part("calc", ca.join("")));

  // ---- The service worker: a spare battery pack that keeps the shell running, wired to the calculator.
  const BAT = { x: W.x + 122, y: W.y + 8, w: 34, d: 58, r: 2 };
  const ba = [];
  ba.push(S(k.slabOf(BAT, FLOOR, 18, P, 3, 0.7), { tone: "hi", crease: "lo", inner: L(k.sideSeam(BAT, FLOOR + 6, P, 3), { tone: "faint" }) }));
  ba.push(L(k.planOutline(k.insetPlan(BAT, 3), FLOOR + 18, P, 2), { tone: "lo" }));
  ba.push(post(BAT.x + 11, BAT.y + 12, 3, FLOOR + 18, 3, "mid", 14), post(BAT.x + 24, BAT.y + 12, 3, FLOOR + 18, 3, "mid", 14));
  const route = [[BAT.x + 11, BAT.y + 12, FLOOR + 21.6], [BAT.x + 11, BAT.y + 72, FLOOR + 21.6], [CALC.x + CALC.w - 2, BAT.y + 72, FLOOR + 21.6], [CALC.x + CALC.w - 2, BAT.y + 80, FLOOR + 14]];
  for (const piece of tubePieces(G.fillet(route, 5, 6), 1, P)) ba.push(tubeSvg(piece, { tone: "mid" }));
  out.push(part("shell", ba.join("")));

  // ---- The slot plate: a narrow letterbox in the case's right wall, the only opening to the radio.
  const SL = { x: W.x + W.w - 76, y: W.y + 8, w: 60, d: 46, r: 2 };
  const sl = [];
  sl.push(S(k.slabOf(SL, FLOOR, 24, P, 3, 0.7), { tone: "mid", crease: "lo", inner: L(k.sideSeam(SL, FLOOR + 8, P, 3), { tone: "faint" }) }));
  const t2 = FLOOR + 24;
  const slot = [[SL.x + 12, SL.y + 20], [SL.x + 48, SL.y + 20], [SL.x + 48, SL.y + 25], [SL.x + 12, SL.y + 25]];
  sl.push(`<path d="${k.onTop(slot, t2, P, true)}" fill="#050507"/>`, L(k.onTop(slot, t2, P, true), { tone: "hi" }));
  sl.push(screws(SL, 3, t2, 1));
  // A glass gate that a whole evidence file can't fit through: a small gauge bar over the slot.
  sl.push(slab({ x: SL.x + 8, y: SL.y + 30, w: 44, d: 5, r: 1 }, t2, 3, "hi", { bevel: 0.3, crease: "lo" }));
  sl.push(`<circle class="fg-lamp" data-lamp="slot" cx="${at([SL.x + 54, SL.y + 40, t2])[0].toFixed(1)}" cy="${at([SL.x + 54, SL.y + 40, t2])[1].toFixed(1)}" r="1.8"/>`);
  out.push(part("slot", sl.join("")));

  // Conduit from the slot plate, over the right wall of the case, to the radio.
  const c = [[SL.x + SL.w, SL.y + 8, FLOOR + 12], [RAD.x, SL.y + 8, FLOOR + 12]];
  const co = [];
  co.push(slab({ x: SL.x + SL.w, y: SL.y + 3, w: 2, d: 10, r: 0.4 }, FLOOR + 7, 10, "hi", { bevel: 0, crease: "none" }));
  for (const piece of tubePieces(c, 1.7, P)) co.push(tubeSvg(piece, { tone: "mid" }));
  co.push(slab({ x: RAD.x - 2, y: SL.y + 3, w: 2, d: 10, r: 0.4 }, FLOOR + 7, 10, "hi", { bevel: 0, crease: "none" }));
  out.push(part("slot", co.join("")));
  out.push(`<g data-slip></g>`);

  // ---- Reply checker: the answer comes back into a small tray with a stamped check.
  const RE = { x: W.x + W.w - 76, y: W.y + 66, w: 60, d: 58, r: 3 };
  const re = [];
  re.push(S(k.slabOf(RE, FLOOR, 10, P, 4, 0.7), { tone: "mid", crease: "lo", inner: L(k.sideSeam(RE, FLOOR + 3, P, 4), { tone: "faint" }) }));
  const reWell = k.insetPlan(RE, 4);
  re.push(`<path class="fg-well" d="${k.planOutline(reWell, FLOOR + 10, P, 3)}"/>`, L(k.planOutline(reWell, FLOOR + 10, P, 3), { tone: "lo" }));
  re.push(`<g data-reply></g>`);
  out.push(part("reply", re.join("")));

  return {
    id: "fieldcase", P, width: WIDTH, height: HEIGHT, body: out.join(""),
    label: "An open rugged field case on a bench: a calculator, three steel evidence trays and a battery pack sit in the well, and a narrow slot plate leads through a conduit to a radio with a tall mast.",
    paths: {
      calc: { screen, z: top }, floor: FLOOR,
      evidenceFrom: [W.x + 92, W.y + 12, FLOOR + 64], evidenceTo: [TR.x + 2 * 36 + 16, TR.y + 33, FLOOR + 22],
      slip: { from: [SL.x + 30, SL.y + 66, FLOOR + 26], mid: [SL.x + 30, SL.y + 22.5, t2 + 7], in: [SL.x + 30, SL.y + 22.5, t2 - 2] },
      conduit: c, mast: [mx, my, 184], replyAt: [RE.x + 30, RE.y + 29, FLOOR + 11],
      keys: keyPlan, keyZ: top + 1.4,
    },
  };
}
