import { k, G, drawer, part } from "./common.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";

/**
 * Cookie as a clockwork desk automaton. Blank upright panels stand in for your windows, and a
 * measuring arm only ever touches their corners, because Quartz gives her bounds and never pixels.
 * A pinned drum picks the behaviour, a drafting board plots the jump, a governor sets the frame
 * rate, a glass mask decides which clicks fall through, and a strongbox with no wires keeps her memory.
 */
export const WIDTH = 1040;
export const HEIGHT = 600;
const PLATE = { x: -276, y: -124, w: 584, d: 200, r: 10 };
const WINDOWS = [
  { id: "w2", x: -66, y: -106, w: 126, H: 112 },
  { id: "w3", x: 50, y: -88, w: 120, H: 84 },
  { id: "w1", x: -138, y: -72, w: 112, H: 66 },
];
const RAIL = { x0: -158, x1: 196, y: -118, z: 130 };
const DOCK = { x: -112, y: -48, w: 262, d: 20, r: 6 };
const DRUM = { x0: -232, x1: -140, y: 26, z: 28, r: 17 };
const BOARD = { x: -92, y: 12, w: 104, z0: 4, z1: 46 };
const GOV = { x: 88, y: 34, top: 72 };
const MASK = { x: 160, y: 4, w: 92, d: 46, z: 36 };
const BOX = { x: 212, y: -108, w: 82, d: 62, r: 3 };

export function build() {
  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -17, 0), [RAIL.x0, RAIL.y, RAIL.z + 16], [RAIL.x1, RAIL.y, RAIL.z + 16], [0, -105, 140]],
    WIDTH, HEIGHT, { pad: 20, azimuth: 60 },
  );
  const { S, L, D, at, slab, post, screws, bench, dialFace } = drawer(P);
  const out = [];
  const num = (v) => Number(v.toFixed(2));
  const conduit = (points, tone = "mid", r = 1.25) => tubePieces(G.fillet(points, 5, 6), r, P).map((piece) => tubeSvg(piece, { tone })).join("");

  out.push(bench(PLATE, { ruler: { x: PLATE.x + 24, y: PLATE.y + PLATE.d - 15, w: 372, d: 7, r: 1 }, label: { x: PLATE.x + 424, y: PLATE.y + PLATE.d - 21, w: 130, d: 17, r: 1.5 } }));

  // ---- The measuring gantry: two posts and a rail behind the windows.
  const gantry = [];
  for (const x of [RAIL.x0, RAIL.x1]) {
    gantry.push(slab({ x: x - 9, y: RAIL.y - 6, w: 18, d: 14, r: 2 }, 0, 3, "lo", { bevel: 0.5 }));
    gantry.push(D(k.corners({ x: x - 9, y: RAIL.y - 6, w: 18, d: 14 }, 2.4).map(([a, b]) => [a, b, 3]), { size: 0.45 }));
    gantry.push(post(x, RAIL.y, 3.6, 3, RAIL.z - 1, "mid"));
    gantry.push(L(k.sideArc(x, RAIL.y, 3.6, 34, P, 12), { tone: "faint" }));
  }
  gantry.push(slab({ x: RAIL.x0 - 7, y: RAIL.y - 4, w: RAIL.x1 - RAIL.x0 + 14, d: 8, r: 1.4 }, RAIL.z, 6, "mid", { bevel: 0.5 }));
  const ticks = k.topTicks(RAIL.x0 + 4, RAIL.x1 - 4, 6, 5, RAIL.y - 3.4, RAIL.z + 6, [1.6, 3], P);
  gantry.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(part("scanner", gantry.join("")));

  // ---- Your windows: blank panels, back to front. There's nothing on their faces to read.
  const corners = {};
  const panel = (win) => {
    const { x, y, w, H, id } = win;
    const face = y + 3;
    const p = [];
    p.push(`<path class="iso-halo" d="${k.haloOf({ x: x + 4, y: y - 4, w: w - 8, d: 12, r: 2 }, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
    p.push(slab({ x: x + 10, y: y - 7, w: w - 20, d: 17, r: 1.6 }, 0, 2, "lo", { bevel: 0.4 }));
    p.push(S(k.slabOf({ x, y, w, d: 3, r: 0.8 }, 2, H - 2, P, 2, 0.3), { tone: "hi", crease: "lo" }));
    p.push(L(k.segment([x, face, H - 10], [x + w, face, H - 10], P), { tone: "lo", free: true }));
    p.push(D([0, 1, 2].map((i) => [x + 6 + i * 4.4, face, H - 5]), { size: 0.55, tone: "mid" }));
    corners[id] = [[x, face, H], [x + w, face, H]];
    // Corner brackets, lit by the arm's touch. Each one ends on the panel's outline.
    const bracket = (cx, sign) => `M${at([cx + sign * 9, face, H]).join(" ")}L${at([cx, face, H]).join(" ")}L${at([cx, face, H - 9]).join(" ")}`;
    p.push(`<path class="iso-line" data-tone="lit" data-corner="${id}-0" opacity="0" d="${bracket(x, 1)}" style="stroke-width:1.4"/>`);
    p.push(`<path class="iso-line" data-tone="lit" data-corner="${id}-1" opacity="0" d="${bracket(x + w, -1)}" style="stroke-width:1.4"/>`);
    return part("windows", p.join(""));
  };
  for (const win of WINDOWS) out.push(panel(win));

  // Safe-landing marks on the second panel's top edge: 25 pt in from each corner.
  const [w3] = WINDOWS.filter((win) => win.id === "w3");
  const inset = 25;
  out.push(`<g data-corridor opacity="0">${L(k.segment([w3.x + inset, w3.y + 3, w3.H], [w3.x + inset, w3.y + 3, w3.H - 7], P), { tone: "lit", free: true })}${L(k.segment([w3.x + w3.w - inset, w3.y + 3, w3.H], [w3.x + w3.w - inset, w3.y + 3, w3.H - 7], P), { tone: "lit", free: true })}</g>`);

  // ---- The strongbox: no ports, no aerial, nothing out. Its drawer and the card move live.
  const box = [];
  box.push(`<path class="iso-halo" d="${k.haloOf(BOX, 0, 0.1, P)}" style="filter:blur(6px)"/>`);
  box.push(slab({ x: BOX.x - 4, y: BOX.y - 4, w: BOX.w + 8, d: BOX.d + 8, r: 4 }, 0, 3, "lo", { bevel: 0.6 }));
  box.push(S(k.slabOf(BOX, 3, 44, P, 4, 0.9), { tone: "mid", inner: L(k.sideSeam(BOX, 37, P, 4), { tone: "faint" }) }));
  box.push(screws(BOX, 4, 47, 1.3));
  box.push(L(k.planOutline(k.insetPlan(BOX, 8), 47, P, 3), { tone: "lo" }));
  const fy = BOX.y + BOX.d;
  // Vents along the side are closed slots, so even the air stays in.
  box.push(`<circle class="fg-lamp" data-lamp="saved" cx="${at([BOX.x + BOX.w - 9, fy, 30])[0].toFixed(1)}" cy="${at([BOX.x + BOX.w - 9, fy, 30])[1].toFixed(1)}" r="1.9"/>`);
  out.push(part("store", box.join("")));
  const drawerPlan = { x: BOX.x + 12, y: fy - 12, w: 54, d: 14, r: 0.8 };
  out.push(`<g data-part="store"><g data-slot="store-card"></g><g data-drawer>${S(k.slabOf(drawerPlan, 10, 15, P, 2, 0.4), { tone: "hi", crease: "lo" })}${S(k.slabOf({ x: BOX.x + 31, y: fy + 2, w: 16, d: 2, r: 0.5 }, 16, 3, P, 2), { tone: "mid", crease: "none" })}</g></g>`);

  // ---- The Dock, low across the front of the windows, with small icon blocks.
  const dock = [];
  dock.push(`<path class="iso-halo" d="${k.haloOf(DOCK, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  dock.push(S(k.slabOf(DOCK, 0, 9, P, 8, 1), { tone: "mid", crease: "lo" }));
  dock.push(L(k.planOutline(k.insetPlan(DOCK, 2), 9, P, 6), { tone: "lo" }));
  for (let i = 0; i < 9; i++) {
    if (i >= 6) continue; // The far end is clear, for her to sit on.
    const plan = { x: DOCK.x + 12 + i * 27.4, y: DOCK.y + 4, w: 12, d: 12, r: 2.6 };
    dock.push(S(k.slabOf(plan, 9, 4 + (i % 3), P, 5, 0.5), { tone: i % 2 ? "hi" : "mid", crease: "none" }));
  }
  out.push(part("dock", dock.join("")));

  // Reserved for the arm, the plotted arc and Cookie herself: nearer than the windows, behind the front row.
  out.push(`<g data-slot="arm"></g><g data-carriage>${S(k.slabOf({ x: -9, y: RAIL.y - 6, w: 18, d: 12, r: 1.4 }, RAIL.z - 4, 13, P, 3, 0.5), { tone: "hi", lit: true, crease: "lo" })}</g>`);
  out.push(`<g data-slot="arc"></g><g data-slot="cat"></g>`);

  // ---- Conduits along the floor: one stage hands to the next.
  const routes = {
    scanToDrum: [[RAIL.x0, RAIL.y + 8, 1.4], [RAIL.x0, -18, 1.4], [DRUM.x0 + 30, -18, 1.4], [DRUM.x0 + 30, -9, 1.4]],
    drumToBoard: [[DRUM.x1 + 11, 48, 1.4], [-66, 48, 1.4], [-66, 22, 1.4]],
    boardToGov: [[BOARD.x + BOARD.w, 16, 1.4], [GOV.x - 28, 16, 1.4], [GOV.x - 28, 30, 1.4]],
    govToMask: [[GOV.x + 28, 42, 1.4], [MASK.x, 42, 1.4]],
    maskToBox: [[MASK.x + 54, MASK.y, 1.4], [MASK.x + 54, -24, 1.4], [BOX.x + 40, -24, 1.4], [BOX.x + 40, BOX.y + BOX.d + 4, 1.4]],
  };
  out.push(Object.values(routes).map((route) => conduit(route)).join(""));
  out.push(`<g data-slot="pulse"></g>`);

  // ---- The pinned drum and its comb: the behaviour engine. Comb first, it stands behind the drum.
  const STATES = 5;
  const drum = [];
  drum.push(slab({ x: DRUM.x0 - 14, y: -16, w: DRUM.x1 - DRUM.x0 + 26, d: 70, r: 3 }, 0, 3, "lo", { bevel: 0.6 }));
  drum.push(screws({ x: DRUM.x0 - 14, y: -16, w: DRUM.x1 - DRUM.x0 + 26, d: 70, r: 3 }, 4, 3, 1.3));
  drum.push(slab({ x: DRUM.x0 + 2, y: -11, w: DRUM.x1 - DRUM.x0 - 4, d: 6, r: 1 }, 3, 47, "mid", { bevel: 0.4 }));
  drum.push(slab({ x: DRUM.x0 - 1, y: -13, w: DRUM.x1 - DRUM.x0 + 2, d: 10, r: 1.2 }, 50, 4, "hi", { bevel: 0.4, crease: "lo" }));
  drum.push(slab({ x: DRUM.x0 - 10, y: 14, w: 9, d: 24, r: 1.2 }, 3, 33, "mid", { bevel: 0.4 }));
  const F = G.frameOf([DRUM.x0, DRUM.y, DRUM.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const L0 = DRUM.x1 - DRUM.x0;
  drum.push(S(G.solidOf([[0, DRUM.r - 2], [1.4, DRUM.r], [L0 - 1.4, DRUM.r], [L0, DRUM.r - 2]], F, P), { tone: "hi", crease: "lo" }));
  const trackAt = (i) => 14 + i * ((L0 - 28) / (STATES - 1));
  for (let i = 0; i < STATES; i++) drum.push(L(G.arcOf(F, trackAt(i), DRUM.r, P), { tone: "faint" }));
  drum.push(k.dotsSvg(G.dotsOf(F, 4, DRUM.r, 26, P, { fade: [0.05, 0.3] }), { size: 0.45, tone: "mid" }));
  drum.push(k.dotsSvg(G.dotsOf(F, L0 - 4, DRUM.r, 26, P, { fade: [0.05, 0.3] }), { size: 0.45, tone: "mid" }));
  // The ratchet on the drum's end, and its bearing block.
  drum.push(S(G.ringBand(L0, L0 + 3, 6, DRUM.r - 3, F, P), { tone: "mid", crease: "lo" }));
  drum.push(L(G.spokesOf(F, L0 + 3, 7, DRUM.r - 4, 12, P), { tone: "lo", free: true }));
  drum.push(slab({ x: DRUM.x1 + 4, y: 14, w: 9, d: 24, r: 1.2 }, 3, 33, "mid", { bevel: 0.4 }));
  drum.push(k.dotsSvg([at([DRUM.x1 + 13, 26, 28])], { size: 0.7, tone: "hi" }));
  out.push(part("drum", drum.join("")));
  // Pins on the drum are written live.
  out.push(`<g data-slot="pins"></g>`);
  // One tine per state, reaching from the comb over the drum, each with a lamp.
  for (let i = 0; i < STATES; i++) {
    const x = DRUM.x0 + trackAt(i);
    const tine = S(k.slabOf({ x: x - 2.2, y: -6, w: 4.4, d: 32, r: 0.8 }, 48, 2, P, 2), { tone: "hi", crease: "none" });
    const [lx, ly] = at([x, -9, 54]);
    out.push(`<g data-part="drum"><g data-tine="${i}">${tine}</g><circle class="fg-lamp" data-lamp="state-${i}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.9"/></g>`);
  }

  // ---- The cooldown dial, lying face up between the drum and the board.
  const COOL = { x: -112, y: 28, R: 13 };
  out.push(part("drum", dialFace(COOL.x, COOL.y, COOL.R, 0, 7, 28, 7) + `<path class="iso-line" data-tone="lit" data-cool d="" style="stroke-width:1.2"/>`));

  // ---- The drafting board: the jump is plotted here before she leaves the ground.
  const board = [];
  const faceY = BOARD.y + 3;
  board.push(slab({ x: BOARD.x - 4, y: BOARD.y - 8, w: BOARD.w + 8, d: 24, r: 2 }, 0, 4, "lo", { bevel: 0.6 }));
  board.push(S(k.slabOf({ x: BOARD.x, y: BOARD.y, w: BOARD.w, d: 3, r: 0.7 }, BOARD.z0, BOARD.z1 - BOARD.z0, P, 2, 0.3), { tone: "hi", crease: "lo" }));
  const inner = { x0: BOARD.x + 6, x1: BOARD.x + BOARD.w - 6, z0: BOARD.z0 + 6, z1: BOARD.z1 - 5 };
  board.push(L(k.pathOf([at([inner.x0, faceY, inner.z0]), at([inner.x1, faceY, inner.z0]), at([inner.x1, faceY, inner.z1]), at([inner.x0, faceY, inner.z1])], true), { tone: "lo" }));
  for (let i = 1; i < 6; i++) {
    const x = inner.x0 + (i / 6) * (inner.x1 - inner.x0);
    board.push(L(k.segment([x, faceY, inner.z0], [x, faceY, inner.z1], P), { tone: "faint" }));
  }
  const curve = [];
  const plot = (p) => [inner.x0 + 8 + p * (inner.x1 - inner.x0 - 16), faceY, inner.z0 + 2 + 4 * (inner.z1 - inner.z0 - 6) * p * (1 - p)];
  for (let i = 0; i <= 28; i++) curve.push(plot(i / 28));
  board.push(L(k.pathOf(curve.map(at)), { tone: "mid", free: true }));
  board.push(D([plot(0), plot(1)], { size: 0.8, tone: "hi" }));
  board.push(`<g data-slot="pen"></g>`);
  out.push(part("board", board.join("")));

  // ---- The governor: frame rate is a speed, and speed is what a governor is for.
  const gov = [];
  gov.push(`<path class="iso-halo" d="${k.haloOf({ x: GOV.x - 28, y: GOV.y - 18, w: 56, d: 38, r: 4 }, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  gov.push(S(k.slabOf({ x: GOV.x - 28, y: GOV.y - 20, w: 56, d: 40, r: 4 }, 0, 16, P, 6, 0.8), { tone: "mid", crease: "lo", inner: L(k.sideSeam({ x: GOV.x - 28, y: GOV.y - 20, w: 56, d: 40, r: 4 }, 11, P, 6), { tone: "faint" }) }));
  gov.push(screws({ x: GOV.x - 28, y: GOV.y - 20, w: 56, d: 40, r: 4 }, 4, 16, 1.2));
  gov.push(post(GOV.x, GOV.y, 12, 16, 3, "hi", 32));
  gov.push(L(k.ring(GOV.x, GOV.y, 9, 19, P, 28), { tone: "lo" }));
  ["60", "15", "0"].forEach((name, i) => {
    const [lx, ly] = at([GOV.x - 14 + i * 14, GOV.y + 20, 8]);
    gov.push(`<circle class="fg-lamp" data-lamp="fps-${name}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.9"/>`);
  });
  out.push(part("governor", gov.join("")));
  out.push(`<g data-part="governor"><g data-slot="gov-back"></g>${post(GOV.x, GOV.y, 1.5, 19, GOV.top - 19, "hi", 14)}${S(k.cylinder(GOV.x, GOV.y, 3, GOV.top, 2.4, P, 18), { tone: "hi" })}<g data-sleeve>${S(k.cylinder(GOV.x, GOV.y, 3.2, 28, 3.4, P, 18), { tone: "hi", crease: "lo" })}</g><g data-slot="gov-front"></g></g>`);

  // ---- The glass mask: a click on a clear pixel falls through to the app. On her artwork, it's caught.
  const glass = { x: MASK.x, y: MASK.y, w: MASK.w, d: MASK.d, r: 2 };
  const mask = [];
  mask.push(slab({ x: MASK.x - 4, y: MASK.y - 4, w: MASK.w + 8, d: MASK.d + 8, r: 3 }, 0, 3, "lo", { bevel: 0.6 }));
  mask.push(L(k.planOutline(k.insetPlan({ x: MASK.x - 4, y: MASK.y - 4, w: MASK.w + 8, d: MASK.d + 8, r: 3 }, 3), 3, P, 3), { tone: "lo" }));
  const appPlan = { x: MASK.x + 6, y: MASK.y + 8, w: 34, d: 34, r: 1.6 };
  mask.push(S(k.slabOf(appPlan, 3, 2, P, 3, 0.3), { tone: "hi", crease: "lo" }));
  mask.push(`<g data-slot="ripple"></g>`);
  const legs = k.corners(glass, 2.4);
  // Rear legs and the dropper's rail stand behind the glass.
  for (const [x, y] of [legs[0], legs[1]]) mask.push(post(x, y, 1.5, 3, MASK.z - 3, "mid", 12));
  const dropperRail = { x: MASK.x - 1, y: MASK.y - 3, w: MASK.w + 2, d: 4, r: 0.8 };
  mask.push(post(dropperRail.x + 2, dropperRail.y + 2, 1.5, 3, 62, "mid", 12), post(dropperRail.x + dropperRail.w - 2, dropperRail.y + 2, 1.5, 3, 62, "mid", 12));
  mask.push(slab(dropperRail, 65, 3, "mid", { bevel: 0.3 }));
  const glassD = k.planOutline(glass, MASK.z, P, 3);
  mask.push(`<path class="fg-glass" d="${glassD}"/>`);
  mask.push(L(glassD, { tone: "mid" }));
  // The alpha grid, edge to edge across the glass.
  const grid = [];
  for (let i = 1; i < 12; i++) grid.push(k.lineOnTop([MASK.x + (i / 12) * MASK.w, MASK.y], [MASK.x + (i / 12) * MASK.w, MASK.y + MASK.d], MASK.z, P));
  for (let i = 1; i < 6; i++) grid.push(k.lineOnTop([MASK.x, MASK.y + (i / 6) * MASK.d], [MASK.x + MASK.w, MASK.y + (i / 6) * MASK.d], MASK.z, P));
  mask.push(L(grid.join(""), { tone: "faint" }));
  // Her silhouette, printed on the glass in the plane of its top.
  const sx = MASK.x + 62, sy = MASK.y + 24;
  // u runs right and v runs up on screen, so she reads upright even lying flat on the glass.
  const flat = (u, v) => [sx + u * 0.866 - v * 0.5, sy - u * 0.5 - v * 0.866];
  const head = [];
  for (let i = 0; i <= 40; i++) head.push(flat(Math.cos((i / 40) * Math.PI * 2) * 15, 2 + Math.sin((i / 40) * Math.PI * 2) * 13));
  const ear = (a, b, tipU) => [flat(a, 10), flat(tipU, 26), flat(b, 12)];
  const silhouette = [k.onTop(head, MASK.z, P, true), k.onTop(ear(-14, -3, -11), MASK.z, P, true), k.onTop(ear(3, 14, 11), MASK.z, P, true)];
  mask.push(silhouette.map((d) => `<path class="fg-art" d="${d}"/>`).join(""));
  mask.push(`<g data-slot="beads-low"></g>`);
  for (const [x, y] of [legs[2], legs[3]]) mask.push(post(x, y, 1.5, 3, MASK.z - 3, "mid", 12));
  out.push(part("mask", mask.join("")));
  out.push(`<g data-part="mask"><g data-dropper>${S(k.slabOf({ x: -5, y: MASK.y - 5, w: 10, d: 8, r: 1 }, 63, 7, P, 2), { tone: "hi", lit: true, crease: "lo" })}${S(k.slabOf({ x: -1.5, y: MASK.y + 2, w: 3, d: MASK.d / 2 + 1, r: 0.6 }, 65.5, 2, P, 2), { tone: "hi", crease: "none" })}${S(k.cylinder(0, MASK.y + MASK.d / 2 + 2, 2, 60, 6, P, 12), { tone: "hi" })}</g><g data-slot="beads"></g></g>`);

  const paths = {
    toward: k.towardViewer(P),
    rail: { x0: RAIL.x0 + 12, x1: RAIL.x1 - 12, y: RAIL.y + 2, z: RAIL.z - 4 },
    corners,
    drum: { x0: DRUM.x0, y: DRUM.y, z: DRUM.z, r: DRUM.r, tracks: [0, 1, 2, 3, 4].map((i) => DRUM.x0 + trackAt(i)) },
    cool: { x: COOL.x, y: COOL.y, z: 7.1, R: COOL.R - 5 },
    board: { y: faceY, x0: inner.x0 + 8, x1: inner.x1 - 8, z0: inner.z0 + 2, h: inner.z1 - inner.z0 - 6 },
    gov: { x: GOV.x, y: GOV.y, top: GOV.top - 2, sleeve: 28 },
    mask: { z: MASK.z, y: MASK.y + MASK.d / 2 + 2, clearX: MASK.x + 23, artX: sx, nozzle: 60, floor: 5, rest: 0 },
    box: { x: BOX.x + 39, y: fy, z: 26 },
    cat: { dock: [118, DOCK.y + 10, 9], dockEnd: [86, DOCK.y + 10, 9], w3: [w3.x + w3.w - inset, w3.y + 1.5, w3.H], w3Raw: [w3.x + w3.w - 6, w3.y + 1.5, w3.H], w2: [4, -104.5, 112] },
    routes: Object.fromEntries(Object.entries(routes).map(([name, route]) => [name, route.map(([x, y, z]) => [num(x), num(y), num(z)])])),
  };
  return { id: "automaton", P, width: WIDTH, height: HEIGHT, body: out.join(""), paths, label: "A clockwork desk automaton: a measuring arm touches the corners of three blank panels standing in for windows, a pinned drum with a comb picks behaviour, a drafting board plots a parabola, a governor sets the frame rate, a glass mask decides which clicks fall through, and a sealed strongbox keeps the memory." };
}
