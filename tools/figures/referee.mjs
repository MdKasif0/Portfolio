import { k, G, drawer, part } from "./common.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";

/**
 * AI Checkers Arena as a tournament referee rig. The match is a punched tape: every turn the tape
 * replays through a reader and the board is rebuilt from it. A gantry moves the pieces, and the
 * model never touches them: it sits in a sealed booth under a 60 s clock, offered only legal
 * moves on a card, and its answer has to pass a pin comb. Three lamps count the attempts.
 */
export const WIDTH = 1040;
export const HEIGHT = 600;
const PLATE = { x: -262, y: -116, w: 540, d: 214, r: 10 };
const N = 10, CELL = 13;
const BOARD = { x: -66, y: -65, w: N * CELL, d: N * CELL };
const BZ = 10;
const LOG = { x: -226, y: -40 };
const BOOTH = { x: 150, y: -78, w: 90, d: 76, r: 3 };

export const squareAt = (c, r) => [BOARD.x + (c + 0.5) * CELL, BOARD.y + (r + 0.5) * CELL];

export function build() {
  const P = k.fitProjection([...k.boxCorners(PLATE, -17, 0), [BOARD.x - 8, BOARD.y - 8, 74], [BOOTH.x, BOOTH.y, 118], [BOOTH.x + BOOTH.w, BOOTH.y + BOOTH.d, 118], [-226, -40, 64]], WIDTH, HEIGHT, { pad: 22, azimuth: 60 });
  const { S, L, D, at, byDepth, slab, post, screws, bench, dialFace } = drawer(P);
  const out = [];
  out.push(bench(PLATE, { ruler: { x: PLATE.x + 24, y: PLATE.y + PLATE.d - 15, w: 340, d: 7, r: 1 }, label: { x: PLATE.x + 382, y: PLATE.y + PLATE.d - 26, w: 118, d: 19, r: 1.5 } }));

  // ---- The tape: two reels on a tray, a tape running between them through a reader head.
  const tape = [];
  const TRAY = { x: -250, y: -90, w: 124, d: 150, r: 4 };
  tape.push(slab(TRAY, 0, 4, "lo", { bevel: 0.7 }));
  tape.push(screws(TRAY, 5, 4, 1.4));
  const reel = (x, y) => [
    post(x, y, 5, 4, 18, "mid"),
    S(k.cylinder(x, y, 24, 22, 2.6, P, 48, 0.4), { tone: "mid", crease: "lo" }),
    S(k.cylinder(x, y, 15, 24.6, 7, P, 40), { tone: "hi", crease: "lo" }),
    L(k.ring(x, y, 12, 31.6, P, 32), { tone: "lo" }),
    S(k.cylinder(x, y, 24, 31.6, 1.6, P, 48, 0.4), { tone: "mid", crease: "lo" }),
    L(k.ring(x, y, 19, 33.2, P, 40), { tone: "faint" }),
    L(k.ring(x, y, 6, 33.2, P, 20), { tone: "lo" }),
    D([[x, y, 33.2]], { size: 0.8, tone: "hi" }),
  ].join("");
  tape.push(reel(-188, -58));
  // The reader: a block the tape runs across, with a row of sensing pins.
  tape.push(slab({ x: -224, y: -18, w: 76, d: 26, r: 2 }, 4, 22, "mid", { bevel: 0.7, inner: L(k.sideSeam({ x: -224, y: -18, w: 76, d: 26, r: 2 }, 12, P, 3), { tone: "faint" }) }));
  tape.push(L(k.planOutline({ x: -220, y: -14, w: 68, d: 18, r: 1 }, 26, P, 2), { tone: "lo" }));
  const TAPE = { x: -224, y: -11, w: 76, d: 12 };
  const tapeFace = [[TAPE.x, TAPE.y], [TAPE.x + TAPE.w, TAPE.y], [TAPE.x + TAPE.w, TAPE.y + TAPE.d], [TAPE.x, TAPE.y + TAPE.d]];
  tape.push(`<path class="fg-paper" d="${k.onTop(tapeFace, 26.2, P, true)}"/>`);
  tape.push(`<clipPath id="rf-tape"><path d="${k.onTop(tapeFace, 26.2, P, true)}"/></clipPath><g clip-path="url(#rf-tape)"><g data-tape></g></g>`);
  tape.push(L(k.onTop(tapeFace, 26.2, P, true), { tone: "mid" }));
  tape.push(slab({ x: -192, y: -16, w: 12, d: 22, r: 1 }, 26.4, 8, "hi", { bevel: 0.4, crease: "lo" }));
  tape.push(`<circle class="fg-lamp" data-lamp="reader" cx="${at([-186, -5, 34.4])[0].toFixed(1)}" cy="${at([-186, -5, 34.4])[1].toFixed(1)}" r="1.8"/>`);
  tape.push(reel(-188, 30));
  out.push(part("log", tape.join("")));

  // ---- Cable from the reader to the board's base.
  const cable = [[-148, -5, 12], [-90, -5, 4], [BOARD.x - 12, -5, 4]];
  const ca = [];
  for (const piece of tubePieces(G.fillet(cable, 8, 6), 1.3, P)) ca.push(tubeSvg(piece, { tone: "mid" }));
  out.push(ca.join(""));

  // ---- The rear gantry rail posts (behind the board).
  const G0 = { x: BOARD.x - 12, x1: BOARD.x + BOARD.w + 12, zTop: 74 };
  const rear = [];
  for (const x of [G0.x, G0.x1]) {
    rear.push(slab({ x: x - 5, y: BOARD.y - 19, w: 10, d: 10, r: 1 }, 0, 2, "lo", { bevel: 0.3 }));
    rear.push(post(x, BOARD.y - 14, 3, 2, G0.zTop - 2, "mid"));
  }
  rear.push(slab({ x: G0.x - 4, y: BOARD.y - 17, w: G0.x1 - G0.x + 8, d: 6, r: 1 }, G0.zTop, 5, "mid", { bevel: 0.4 }));
  out.push(part("gantry", rear.join("")));

  // ---- The board on its plinth. Squares are real, dark ones carry the pieces.
  const brd = [];
  const base = { x: BOARD.x - 8, y: BOARD.y - 8, w: BOARD.w + 16, d: BOARD.d + 16, r: 3 };
  brd.push(`<path class="iso-halo" d="${k.haloOf(base, 0, 0.1, P)}" style="filter:blur(6px)"/>`);
  brd.push(S(k.slabOf(base, 0, BZ, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(base, 3, P, 4), { tone: "faint" }) }));
  const dark = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if ((r + c) % 2 === 1) dark.push(k.onTop([[BOARD.x + c * CELL, BOARD.y + r * CELL], [BOARD.x + (c + 1) * CELL, BOARD.y + r * CELL], [BOARD.x + (c + 1) * CELL, BOARD.y + (r + 1) * CELL], [BOARD.x + c * CELL, BOARD.y + (r + 1) * CELL]], BZ, P, true));
  brd.push(`<path class="fg-dark-squares" d="${dark.join("")}"/>`);
  brd.push(L(k.onTop([[BOARD.x, BOARD.y], [BOARD.x + BOARD.w, BOARD.y], [BOARD.x + BOARD.w, BOARD.y + BOARD.d], [BOARD.x, BOARD.y + BOARD.d]], BZ, P, true), { tone: "mid" }));
  brd.push(screws(base, 3, BZ, 1));
  brd.push(`<g data-slot="legal"></g>`);
  out.push(part("board", brd.join("")));

  // Pieces: painted back to front, the moving one is drawn live.
  const pieces = [];
  const mover = [3, 6], taken = [4, 5];
  const place = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if ((r + c) % 2 !== 1) continue;
    if ((c === mover[0] && r === mover[1]) || (c === taken[0] && r === taken[1])) continue;
    if (r <= 3 || r >= 6) place.push([c, r, r >= 6]);
  }
  const piece = (x, y, light, z = BZ) => S(k.cylinder(x, y, 4.8, z, 2.6, P, 22, 0.5), { tone: light ? "hi" : "mid", lit: false, crease: "lo" }) + L(k.ring(x, y, 2.8, z + 2.6, P, 14), { tone: light ? "mid" : "lo" });
  for (const [c, r, light] of [...place].sort((a, b) => k.depthOf([...squareAt(a[0], a[1]), 0], P) - k.depthOf([...squareAt(b[0], b[1]), 0], P))) {
    const [x, y] = squareAt(c, r);
    pieces.push(piece(x, y, light));
  }
  out.push(pieces.join(""));
  const [tx, ty] = squareAt(taken[0], taken[1]);
  out.push(`<g data-taken>${piece(tx, ty, false)}</g>`);
  const [mx, my] = squareAt(mover[0], mover[1]);
  out.push(`<g data-mover>${S(k.cylinder(mx, my, 4.8, BZ, 2.6, P, 22, 0.5), { tone: "hi", lit: true, crease: "lo" })}${L(k.ring(mx, my, 2.8, BZ + 2.6, P, 14), { tone: "lit" })}</g>`);

  // ---- Bridge and carriage. The bridge runs along y on the rear rail and front rail, the head along x.
  const bridgeArt = [
    slab({ x: mx - 4, y: BOARD.y - 20, w: 8, d: BOARD.d + 40, r: 1 }, G0.zTop + 5, 5, "hi", { bevel: 0.4, crease: "lo" }),
    D([[mx, BOARD.y - 16, G0.zTop + 10], [mx, BOARD.y + BOARD.d + 16, G0.zTop + 10]], { size: 0.5 }),
  ].join("");
  out.push(part("gantry", `<g data-bridge>${bridgeArt}</g>`));
  const head = [
    slab({ x: mx - 7, y: my - 7, w: 14, d: 14, r: 1.5 }, G0.zTop - 2, 14, "hi", { bevel: 0.5, crease: "lo" }),
  ].join("");
  // Gripper rod (moves in z).
  out.push(`<g data-head-rod>${S(k.cylinder(mx, my, 1.6, BZ + 3.4, G0.zTop - BZ - 5, P, 14), { tone: "hi", crease: "none" })}${S(k.cylinder(mx, my, 4, BZ + 2.6, 2, P, 20), { tone: "mid", crease: "lo" })}</g>`);
  out.push(`<g data-head>${head}${k.dotsSvg([at([mx, my, G0.zTop + 12])], { size: 0.7, tone: "hi" })}</g>`);
  // Front gantry posts and rail, nearer than the board.
  const frontRail = [];
  frontRail.push(slab({ x: G0.x - 4, y: BOARD.y + BOARD.d + 11, w: G0.x1 - G0.x + 8, d: 6, r: 1 }, G0.zTop, 5, "mid", { bevel: 0.4 }));
  for (const x of [G0.x, G0.x1]) {
    frontRail.push(slab({ x: x - 5, y: BOARD.y + BOARD.d + 9, w: 10, d: 10, r: 1 }, 0, 2, "lo", { bevel: 0.3 }));
    frontRail.push(post(x, BOARD.y + BOARD.d + 14, 3, 2, G0.zTop - 2, "mid"));
    frontRail.push(L(k.sideArc(x, BOARD.y + BOARD.d + 14, 3, 30, P, 12), { tone: "faint" }));
  }
  out.push(part("gantry", frontRail.join("")));

  // ---- The model's booth: a sealed cabinet with a card slot, a 60 s clock and three attempt lamps.
  const bo = [];
  bo.push(`<path class="iso-halo" d="${k.haloOf(BOOTH, 0, 0.1, P)}" style="filter:blur(6px)"/>`);
  const plinth = { x: BOOTH.x - 5, y: BOOTH.y - 5, w: BOOTH.w + 10, d: BOOTH.d + 10, r: 4 };
  bo.push(slab(plinth, 0, 4, "lo", { bevel: 0.8 }));
  bo.push(screws(plinth, 3, 4, 1.3));
  bo.push(S(k.slabOf(BOOTH, 4, 96, P, 4, 1), { tone: "hi", crease: "lo", inner: L(k.sideSeam(BOOTH, 14, P, 4), { tone: "faint" }) + L(k.sideSeam(BOOTH, 92, P, 4), { tone: "faint" }) }));
  const fy = BOOTH.y + BOOTH.d;
  // Louvres on the +x face.
  const fx = BOOTH.x + BOOTH.w;
  for (let i = 0; i < 8; i++) {
    const z = 24 + i * 7;
    bo.push(L(k.pathOf([at([fx, BOOTH.y + 12, z]), at([fx, BOOTH.y + BOOTH.d - 12, z]), at([fx, BOOTH.y + BOOTH.d - 12, z + 3]), at([fx, BOOTH.y + 12, z + 3])], true), { tone: "lo" }));
  }
  // Card slot on the -y... on the +y face, with a lip.
  bo.push(slab({ x: BOOTH.x + 14, y: fy, w: 40, d: 3, r: 0.8 }, 38, 3, "mid", { bevel: 0.3 }));
  bo.push(`<path d="${k.pathOf([at([BOOTH.x + 18, fy, 44]), at([BOOTH.x + 50, fy, 44]), at([BOOTH.x + 50, fy, 47]), at([BOOTH.x + 18, fy, 47])], true)}" fill="#050507" stroke="var(--anatomy-mid)" stroke-width=".6"/>`);
  // Three attempt lamps on the +y face, in a bezel.
  bo.push(slab({ x: BOOTH.x + 58, y: fy, w: 26, d: 1.6, r: 0.5 }, 62, 12, "mid", { bevel: 0.2 }));
  [0, 1, 2].forEach((i) => {
    const [cx, cy] = at([BOOTH.x + 63 + i * 8, fy + 1.6, 68]);
    bo.push(`<circle class="fg-lamp" data-lamp="attempt-${i}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.1"/>`);
  });
  // A service door on the +y face, under the slot: panel, hinges, latch and rivets.
  const doorX0 = BOOTH.x + 14, doorX1 = BOOTH.x + BOOTH.w - 10;
  bo.push(L(k.pathOf([at([doorX0, fy, 18]), at([doorX1, fy, 18]), at([doorX1, fy, 33]), at([doorX0, fy, 33])], true), { tone: "lo" }));
  bo.push(D([doorX0 + 3, doorX0 + 22, doorX0 + 41, doorX1 - 3].map((x) => [x, fy, 30]), { size: 0.45 }));
  bo.push(slab({ x: doorX1 - 12, y: fy, w: 8, d: 1.6, r: 0.4 }, 22, 3, "hi", { bevel: 0, crease: "none" }));
  bo.push(L(k.pathOf([at([BOOTH.x + 14, fy, 54]), at([BOOTH.x + 52, fy, 54]), at([BOOTH.x + 52, fy, 74]), at([BOOTH.x + 14, fy, 74])], true), { tone: "faint" }));
  bo.push(D([[BOOTH.x + 18, fy, 58], [BOOTH.x + 48, fy, 58], [BOOTH.x + 18, fy, 70], [BOOTH.x + 48, fy, 70]], { size: 0.4 }));
  bo.push(screws(BOOTH, 4, 100, 1.4));
  // The clock: a short stand and a dial on the lid.
  const CL = { x: BOOTH.x + 45, y: BOOTH.y + 36, R: 23 };
  bo.push(post(CL.x, CL.y, 9, 100, 3, "mid", 28));
  bo.push(dialFace(CL.x, CL.y, CL.R, 103, 8, 60, 5));
  bo.push(`<path class="iso-line" data-tone="lit" data-clock-hand d="" style="stroke-width:1.3"/>`);
  const [hx, hy] = at([CL.x, CL.y, 111]);
  bo.push(`<circle class="fg-hub" cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="1.5"/>`);
  // A crown on top of the clock.
  out.push(part("model", bo.join("")));

  // ---- The rules comb: every answer card slides through it before anything moves.
  const COMB = { x: BOOTH.x - 62, y: 24, w: 52, d: 40, r: 2 };
  const comb = [];
  comb.push(slab({ x: COMB.x - 3, y: COMB.y - 3, w: COMB.w + 6, d: COMB.d + 6, r: 3 }, 0, 3, "lo", { bevel: 0.6 }));
  comb.push(screws({ x: COMB.x - 3, y: COMB.y - 3, w: COMB.w + 6, d: COMB.d + 6, r: 3 }, 2.6, 3, 1));
  comb.push(S(k.slabOf(COMB, 3, 18, P, 3, 0.7), { tone: "mid", crease: "lo", inner: L(k.sideSeam(COMB, 9, P, 3), { tone: "faint" }) }));
  comb.push(`<path d="${k.onTop([[COMB.x + 4, COMB.y + 15], [COMB.x + COMB.w - 4, COMB.y + 15], [COMB.x + COMB.w - 4, COMB.y + 22], [COMB.x + 4, COMB.y + 22]], 21, P, true)}" fill="#050507"/>`);
  comb.push(L(k.onTop([[COMB.x + 4, COMB.y + 15], [COMB.x + COMB.w - 4, COMB.y + 15], [COMB.x + COMB.w - 4, COMB.y + 22], [COMB.x + 4, COMB.y + 22]], 21, P, true), { tone: "lo" }));
  for (let i = 0; i < 10; i++) comb.push(post(COMB.x + 6 + i * 4.4, COMB.y + 9, 0.9, 21, 5, "hi", 8));
  comb.push(`<circle class="fg-lamp" data-lamp="comb" cx="${at([COMB.x + COMB.w - 7, COMB.y + 32, 21])[0].toFixed(1)}" cy="${at([COMB.x + COMB.w - 7, COMB.y + 32, 21])[1].toFixed(1)}" r="2"/>`);
  out.push(part("rules", comb.join("")));
  out.push(`<g data-card></g>`);

  // Cable from the comb to the board plinth.
  const c2 = [[COMB.x, COMB.y + 20, 8], [COMB.x - 14, COMB.y + 20, 4], [BOARD.x + BOARD.w + 8, COMB.y + 20, 4]];
  const c2out = [];
  for (const p2 of tubePieces(G.fillet(c2, 6, 6), 1.3, P)) c2out.push(tubeSvg(p2, { tone: "mid" }));
  out.push(c2out.join(""));

  const tapeRows = [];
  for (let i = -2; i < 16; i++) {
    const x = TAPE.x + i * 8;
    tapeRows.push({ x, holes: [0, 1, 2, 3].filter((h) => ((i + 3) * (h + 2) * 7) % 5 < 3) });
  }
  return {
    id: "referee", P, width: WIDTH, height: HEIGHT, body: out.join(""),
    label: "A tournament checkers table: a punched tape runs through a reader, a gantry moves pieces on a ten by ten board, and a sealed booth under a clock passes answer cards through a pin comb.",
    paths: {
      tape: { y: TAPE.y, d: TAPE.d, z: 26.2, x: TAPE.x, w: TAPE.w, rows: tapeRows, pitch: 8 },
      mover: { from: squareAt(...mover), to: squareAt(5, 4), lift: 26, z: BZ }, taken: squareAt(...taken),
      legal: [[5, 4], [2, 5]].map(([c, r]) => squareAt(c, r)), cell: CELL, boardZ: BZ,
      clock: { x: CL.x, y: CL.y, z: 111.2, R: CL.R - 5 },
      card: { from: [BOOTH.x + 34, fy + 1, 45], mid: [COMB.x + COMB.w / 2, COMB.y + 18.5, 42], in: [COMB.x + COMB.w / 2, COMB.y + 18.5, 26], w: 26, h: 15 },
      bridgeRest: my, headRest: [mx, my],
    },
  };
}
