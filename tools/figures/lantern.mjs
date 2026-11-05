import { k, G, drawer, part } from "./common.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";

/**
 * Shadow of the Crimson Gate as a magic-lantern rig. One crankshaft is the game loop, with a stop pin
 * on its dial at 100 ms. Cams on the shaft are the enemy and boss state machines. One lever sets a whole
 * forest at once (instancing), a petal carousel recycles its particles, the lantern throws the frame onto a
 * screen, a mixing desk has five real bus levels, and the save is a tin with a version stamped on it.
 */
export const WIDTH = 1040;
export const HEIGHT = 600;
const PLATE = { x: -286, y: -130, w: 604, d: 204, r: 10 };
const SHAFT = { x0: -262, x1: -26, y: 40, z: 26 };
const WHEEL = { x: -246, r: 24 };
const DT = { x: -206, y: -44, R: 21 };
const SCREEN = { x: 14, y: -118, w: 214, z0: 20, z1: 156 };
const LAMP = { x: -26, y: -8, r: 25, z0: 12, z1: 58 };
const FOREST = { x: 16, y: -100, w: 196, d: 72, r: 4 };
const DESK = { x: 176, y: 2, w: 118, d: 52, r: 4 };
const TIN = { x: 244, y: -108, w: 54, d: 56, r: 4 };

export function build() {
  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -17, 0), [SCREEN.x, SCREEN.y, SCREEN.z1 + 8], [SCREEN.x + SCREEN.w, SCREEN.y, SCREEN.z1 + 8]],
    WIDTH, HEIGHT, { pad: 20, azimuth: 60 },
  );
  const { S, L, D, at, slab, post, screws, bench, dialFace } = drawer(P);
  const out = [];
  const num = (v) => Number(v.toFixed(2));

  out.push(bench(PLATE, { ruler: { x: PLATE.x + 24, y: PLATE.y + PLATE.d - 15, w: 372, d: 7, r: 1 }, label: { x: PLATE.x + 430, y: PLATE.y + PLATE.d - 19, w: 142, d: 15, r: 1.5 } }));

  // ---- The screen: a tall frame at the back, on two heavy feet, with a torii-style crossbar on top.
  const screen = [];
  const faceY = SCREEN.y + 4;
  for (const x of [SCREEN.x + 8, SCREEN.x + SCREEN.w - 8]) {
    screen.push(slab({ x: x - 12, y: SCREEN.y - 10, w: 24, d: 26, r: 2.4 }, 0, 4, "lo", { bevel: 0.7 }));
    screen.push(D(k.corners({ x: x - 12, y: SCREEN.y - 10, w: 24, d: 26 }, 2.6).map(([a, b]) => [a, b, 4]), { size: 0.45 }));
  }
  screen.push(S(k.slabOf({ x: SCREEN.x, y: SCREEN.y, w: SCREEN.w, d: 4, r: 1 }, 4, SCREEN.z1 - 4, P, 2, 0.4), { tone: "mid", crease: "lo" }));
  const cloth = [[SCREEN.x + 7, faceY, SCREEN.z0], [SCREEN.x + SCREEN.w - 7, faceY, SCREEN.z0], [SCREEN.x + SCREEN.w - 7, faceY, SCREEN.z1 - 7], [SCREEN.x + 7, faceY, SCREEN.z1 - 7]];
  const clothD = k.pathOf(cloth.map(at), true);
  screen.push(`<path class="fg-screen-cloth" d="${clothD}"/>`);
  // The projected frame, drawn flat and mapped into the plane of the cloth: the title screen's gate under a moon.
  const W = cloth[1][0] - cloth[0][0], Hp = cloth[2][2] - cloth[0][2];
  const [ox, oy] = at([cloth[0][0], faceY, cloth[2][2]]);
  const [ux, uy] = at([cloth[0][0] + 1, faceY, cloth[2][2]]);
  const [vx, vy] = at([cloth[0][0], faceY, cloth[2][2] - 1]);
  const matrix = [ux - ox, uy - oy, vx - ox, vy - oy, ox, oy].map((v) => v.toFixed(4)).join(" ");
  const cx = W * 0.42;
  const pine = (x, base, h) => `M${x - h * 0.22} ${base}L${x} ${base - h}L${x + h * 0.22} ${base}Z`;
  const pines = [[8, 22], [20, 30], [33, 24], [45, 34], [W - 8, 24], [W - 21, 32], [W - 35, 26], [W - 47, 36]].map(([x, h]) => pine(x, Hp - 13, h)).join("");
  const frame = `<defs><linearGradient id="ln-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d3d40"/><stop offset=".62" stop-color="#2c8a86"/><stop offset="1" stop-color="#bfe4d6"/></linearGradient><radialGradient id="ln-moon"><stop offset="0" stop-color="#fff9e8"/><stop offset=".55" stop-color="#fff2cf" stop-opacity=".55"/><stop offset="1" stop-color="#fff2cf" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${Hp}" fill="url(#ln-sky)"/><circle cx="${W * 0.8}" cy="30" r="30" fill="url(#ln-moon)"/><circle cx="${W * 0.8}" cy="30" r="10.5" fill="#fff9e8"/><path d="${pines}" fill="#0b2a2d"/><rect y="${Hp - 14}" width="${W}" height="14" fill="#dff0e8"/><path d="M0 ${Hp - 12}Q${W * 0.3} ${Hp - 19} ${cx} ${Hp - 13}T${W} ${Hp - 13}V${Hp}H0Z" fill="#eef8f2"/><g fill="#d3271f"><path d="M${cx - 27} 40L${cx - 23} ${Hp - 12}H${cx - 16} L${cx - 19} 40Z"/><path d="M${cx + 27} 40L${cx + 23} ${Hp - 12}H${cx + 16} L${cx + 19} 40Z"/><rect x="${cx - 35}" y="44" width="70" height="6"/><path d="M${cx - 46} 26Q${cx} 36 ${cx + 46} 26L${cx + 42} 37Q${cx} 44 ${cx - 42} 37Z"/><rect x="${cx - 3}" y="36" width="6" height="9"/></g><path d="M${cx - 46} 26Q${cx} 36 ${cx + 46} 26L${cx + 45} 29Q${cx} 38 ${cx - 45} 29Z" fill="#14090a"/><rect data-raw width="${W}" height="${Hp}" fill="#d9e6dd" opacity="0"/>`;
  screen.push(`<clipPath id="ln-screen"><path d="${clothD}"/></clipPath><g clip-path="url(#ln-screen)"><g data-picture opacity="0" transform="matrix(${matrix})">${frame}</g></g>`);
  screen.push(L(clothD, { tone: "mid" }));
  // Crossbar, slightly overhanging, then its shoe.
  screen.push(slab({ x: SCREEN.x - 10, y: SCREEN.y - 2, w: SCREEN.w + 20, d: 7, r: 1.2 }, SCREEN.z1, 5, "hi", { bevel: 0.5, crease: "lo" }));
  out.push(part("screen", screen.join("")));

  // ---- The forest on its tray: every tree the same one, placed by one pull of the lever.
  const tray = [];
  tray.push(`<path class="iso-halo" d="${k.haloOf(FOREST, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  tray.push(S(k.slabOf(FOREST, 0, 5, P, 6, 0.7), { tone: "mid", crease: "lo", inner: L(k.sideSeam(FOREST, 2.6, P, 6), { tone: "faint" }) }));
  tray.push(L(k.planOutline(k.insetPlan(FOREST, 3), 5, P, 5), { tone: "lo" }));
  out.push(part("forest", tray.join("")));
  // One tree, defined once and placed many times with <use>: instancing, in the drawing as in the game.
  const treeF = G.frameOf([0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const cone = (z0, r, h) => S(G.solidOf([[z0, r * 0.28], [z0, r], [z0 + h, 0.25]], treeF, P), { tone: "hi", crease: "none" });
  const treeOrigin = at([0, 0, 0]);
  const treeSvg = S(G.solidOf([[0, 1.2], [6, 1.2]], treeF, P), { tone: "mid", crease: "none" }) + cone(5, 7.4, 13) + cone(12, 5.8, 11) + cone(18, 4.2, 10);
  out.push(`<defs><g id="ln-tree" transform="translate(${(-treeOrigin[0]).toFixed(2)} ${(-treeOrigin[1]).toFixed(2)})">${treeSvg}</g></defs>`);
  const spots = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 9; col++) {
      const x = FOREST.x + 16 + col * 20.5 + (row % 2) * 8;
      const y = FOREST.y + 11 + row * 15.5;
      if (x > FOREST.x + FOREST.w - 10) continue;
      const seed = (col * 7 + row * 13) % 5;
      spots.push({ x, y, scale: 0.86 + seed * 0.05 });
    }
  }
  spots.sort((a, b) => k.depthOf([a.x, a.y, 0], P) - k.depthOf([b.x, b.y, 0], P));
  out.push(`<g data-part="forest"><g data-trees>${spots.map(({ x, y, scale }, i) => { const [tx, ty] = at([x, y, 5]); return `<use href="#ln-tree" data-tree="${i}" data-x="${tx.toFixed(2)}" data-y="${ty.toFixed(2)}" data-s="${scale.toFixed(2)}" transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(2)})"/>`; }).join("")}</g></g>`);
  out.push(`<g data-slot="beam"></g><g data-slot="petals"></g>`);

  // ---- The save tin: a version stamped on the lid, and a slot that checks what comes back.
  const tin = [];
  tin.push(`<path class="iso-halo" d="${k.haloOf(TIN, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  tin.push(slab({ x: TIN.x - 3, y: TIN.y - 3, w: TIN.w + 6, d: TIN.d + 6, r: 5 }, 0, 3, "lo", { bevel: 0.6 }));
  tin.push(S(k.slabOf(TIN, 3, 26, P, 6, 0.8), { tone: "mid", crease: "lo", inner: L(k.sideSeam(TIN, 22, P, 6), { tone: "faint" }) }));
  tin.push(S(k.slabOf(k.insetPlan(TIN, -1), 29, 5, P, 6, 0.8), { tone: "hi", crease: "lo" }));
  tin.push(L(k.planOutline(k.insetPlan(TIN, 6), 34, P, 4), { tone: "lo" }));
  tin.push(L(k.lineOnTop([TIN.x + 16, TIN.y + 28], [TIN.x + TIN.w - 16, TIN.y + 28], 34, P), { tone: "hi", free: true }));
  const slot = { x: TIN.x + 15, y: TIN.y + TIN.d - 13, w: 24, d: 3, r: 0.4 };
  tin.push(`<path d="${k.planOutline(slot, 34, P, 1)}" fill="#050507"/>`);
  const lampAt = at([TIN.x + 44, TIN.y + 16, 34]);
  tin.push(`<circle class="fg-lamp" data-lamp="save" cx="${lampAt[0].toFixed(1)}" cy="${lampAt[1].toFixed(1)}" r="2"/>`);
  out.push(part("save", tin.join("")));
  out.push(`<g data-part="save"><g data-slot="cards"></g></g>`);

  // ---- The dt dial, on its own column at the back left, with a stop pin at 100 ms.
  const dt = [];
  dt.push(slab({ x: DT.x - 16, y: DT.y - 16, w: 32, d: 32, r: 3 }, 0, 3, "lo", { bevel: 0.6 }));
  dt.push(screws({ x: DT.x - 16, y: DT.y - 16, w: 32, d: 32, r: 3 }, 3.2, 3, 1.1));
  dt.push(post(DT.x, DT.y, 5, 3, 45, "mid"));
  dt.push(L(k.sideArc(DT.x, DT.y, 5, 22, P, 12), { tone: "faint" }));
  dt.push(dialFace(DT.x, DT.y, DT.R, 48, 8, 40, 5));
  const dialZ = 56;
  // The stop sits at 100 ms: a third of the way round.
  const stopA = (100 / 300) * Math.PI * 2;
  const stop = [DT.x + Math.sin(stopA) * (DT.R - 5), DT.y - Math.cos(stopA) * (DT.R - 5), dialZ];
  dt.push(S(k.cylinder(stop[0], stop[1], 1.4, dialZ, 3, P, 12), { tone: "hi", lit: true }));
  dt.push(`<path class="iso-line" data-tone="lit" data-dt-needle d="" style="stroke-width:1.3"/>`);
  const hub = at([DT.x, DT.y, dialZ + 0.2]);
  dt.push(`<circle class="fg-hub" cx="${hub[0].toFixed(1)}" cy="${hub[1].toFixed(1)}" r="1.5"/>`);
  out.push(part("dt", dt.join("")));

  // ---- The boss column: a health bar at the back, falling past phase marks at 70% and 35%.
  const BOSS = { x: -112, y: -66, w: 26, d: 26 };
  const boss = [];
  boss.push(slab({ x: BOSS.x - 7, y: BOSS.y - 7, w: BOSS.w + 14, d: BOSS.d + 14, r: 2.4 }, 0, 3, "lo", { bevel: 0.6 }));
  boss.push(S(k.slabOf({ ...BOSS, r: 1.6 }, 3, 86, P, 3, 0.5), { tone: "mid", crease: "lo" }));
  const bossFace = BOSS.y + BOSS.d;
  const bar = { x0: BOSS.x + 7, x1: BOSS.x + 19, z0: 12, z1: 82 };
  boss.push(`<path class="fg-well" d="${k.pathOf([[bar.x0, bossFace, bar.z0], [bar.x1, bossFace, bar.z0], [bar.x1, bossFace, bar.z1], [bar.x0, bossFace, bar.z1]].map(at), true)}"/>`);
  boss.push(`<path class="fg-hp" data-hp d=""/>`);
  boss.push(L(k.pathOf([[bar.x0, bossFace, bar.z0], [bar.x1, bossFace, bar.z0], [bar.x1, bossFace, bar.z1], [bar.x0, bossFace, bar.z1]].map(at), true), { tone: "mid" }));
  for (const f of [0.7, 0.35]) boss.push(L(k.segment([bar.x0, bossFace, bar.z0 + f * (bar.z1 - bar.z0)], [bar.x1 + 3, bossFace, bar.z0 + f * (bar.z1 - bar.z0)], P), { tone: "hi", free: true }));
  [0, 1, 2].forEach((i) => {
    const [lx, ly] = at([BOSS.x + 3.5, bossFace, 76 - i * 10]);
    boss.push(`<circle class="fg-lamp" data-lamp="phase-${i}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.5"/>`);
  });
  out.push(part("boss", boss.join("")));

  // ---- Signal lines from the shaft to the things it drives.
  const routes = {
    shaftToBoss: [[BOSS.x + 13, 24, 1.4], [BOSS.x + 13, BOSS.y + BOSS.d + 7, 1.4]],
    shaftToLever: [[8, 16, 1.4], [46, 16, 1.4], [46, -15, 1.4], [60, -15, 1.4]],
    lampToDesk: [[6, 26, 1.4], [DESK.x, 26, 1.4]],
    deskToTin: [[DESK.x + 96, DESK.y, 1.4], [DESK.x + 96, TIN.y + TIN.d + 3, 1.4]],
  };
  for (const route of Object.values(routes)) out.push(tubePieces(G.fillet(route, 5, 6), 1.25, P).map((piece) => tubeSvg(piece, { tone: "mid" })).join(""));
  out.push(`<g data-slot="pulse"></g>`);

  // ---- The one-pull lever beside the tray: every tree on one action.
  const LEVER = { x: 70, y: -15 };
  const lever = [];
  lever.push(slab({ x: LEVER.x - 10, y: LEVER.y - 10, w: 20, d: 20, r: 2.4 }, 0, 4, "lo", { bevel: 0.6 }));
  lever.push(post(LEVER.x, LEVER.y, 4.6, 4, 5, "mid", 20));
  out.push(part("forest", lever.join("")));
  out.push(`<g data-part="forest"><path class="iso-line" data-tone="hi" data-lever d="" style="stroke-width:2.2"/><circle class="fg-hub" data-lever-knob r="3.2"/></g>`);

  // ---- The carousel: a fixed set of petals, taken from a ring and handed back. Nothing is created.
  const CAR = { x: 134, y: -2, r: 19 };
  const car = [];
  car.push(post(CAR.x, CAR.y, CAR.r + 4, 0, 3, "lo", 40));
  car.push(post(CAR.x, CAR.y, 4, 3, 16, "mid", 16));
  car.push(post(CAR.x, CAR.y, CAR.r, 19, 3, "hi", 44));
  car.push(L(k.ring(CAR.x, CAR.y, CAR.r - 3, 22, P, 44), { tone: "lo" }));
  out.push(part("forest", car.join("")));
  out.push(`<g data-part="forest"><g data-slot="carousel"></g></g>`);

  // ---- The crankshaft: flywheel, cams and the drive into the lantern. Rear bearings first.
  const shaft = [];
  const F = G.frameOf([SHAFT.x0, SHAFT.y, SHAFT.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const toS = (x) => x - SHAFT.x0;
  shaft.push(slab({ x: SHAFT.x0 - 6, y: SHAFT.y - 22, w: SHAFT.x1 - SHAFT.x0 + 6, d: 40, r: 3 }, 0, 2.4, "lo", { bevel: 0.5 }));
  const pillow = (x) => slab({ x: x - 4.5, y: SHAFT.y - 11, w: 9, d: 22, r: 1.2 }, 2.4, SHAFT.z + 6 - 2.4, "mid", { bevel: 0.4 });
  shaft.push(pillow(-222));
  shaft.push(S(G.solidOf([[0, 2.6], [toS(SHAFT.x1) + 4, 2.6]], F, P), { tone: "hi", crease: "lo" }));
  out.push(shaft.join(""));
  // Flywheel at the far left of the shaft, turning on its spokes.
  const wheel = [];
  const s0 = toS(WHEEL.x);
  wheel.push(S(G.solidOf([[s0 - 5, 3], [s0 - 5, WHEEL.r - 1.6], [s0 - 3.6, WHEEL.r], [s0 + 3.6, WHEEL.r], [s0 + 5, WHEEL.r - 1.6], [s0 + 5, 3]], F, P), { tone: "hi", crease: "lo" }));
  wheel.push(L(G.arcOf(F, s0 + 1, WHEEL.r, P), { tone: "faint" }));
  wheel.push(k.dotsSvg(G.dotsOf(F, s0 + 3, WHEEL.r, 30, P, { fade: [0.05, 0.3] }), { size: 0.45, tone: "mid" }));
  wheel.push(L(G.circleOf(F, s0 + 5, WHEEL.r - 4.5, P), { tone: "lo" }));
  wheel.push(`<g data-slot="wheel"></g>`);
  out.push(part("loop", wheel.join("")));
  // Three cams on the shaft, each with a follower riding on top: yokai, tengu and the oni.
  const CAMS = [-176, -140, -104];
  // The rail the followers slide through, on two posts behind the shaft.
  const guide = [post(CAMS[0] - 18, SHAFT.y - 13, 1.8, 2.4, SHAFT.z + 28, "mid", 12), post(CAMS[2] + 18, SHAFT.y - 13, 1.8, 2.4, SHAFT.z + 28, "mid", 12)];
  guide.push(slab({ x: CAMS[0] - 21, y: SHAFT.y - 15, w: CAMS[2] - CAMS[0] + 42, d: 5, r: 1 }, SHAFT.z + 30, 3, "mid", { bevel: 0.3 }));
  for (const x of CAMS) guide.push(slab({ x: x - 3, y: SHAFT.y - 13, w: 6, d: 15, r: 1 }, SHAFT.z + 30, 3, "hi", { bevel: 0.3, crease: "lo" }));
  out.push(part("cams", guide.join("")));
  CAMS.forEach((x, i) => {
    const c = [];
    c.push(pillow(x - 14));
    c.push(`<g data-cam="${i}"></g>`);
    c.push(`<g data-follower="${i}">${S(k.cylinder(x, SHAFT.y, 1.4, SHAFT.z + 15, 22, P, 12), { tone: "hi", crease: "none" })}${S(k.cylinder(x, SHAFT.y, 3.2, SHAFT.z + 36, 2.2, P, 16), { tone: "hi" })}</g>`);
    const [lx, ly] = at([x, SHAFT.y, SHAFT.z + 41]);
    c.push(`<circle class="fg-lamp" data-lamp="cam-${i}" data-follower-lamp="${i}" cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="1.7"/>`);
    out.push(part("cams", c.join("")));
  });
  out.push(pillow(-62));

  // ---- The lantern: a round lamp house on a pedestal, with a chimney and a lens aimed at the screen.
  const LF = G.frameOf([LAMP.x, LAMP.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const lamp = [];
  lamp.push(`<path class="iso-halo" d="${k.haloOf({ x: LAMP.x - 24, y: LAMP.y - 24, w: 48, d: 48, r: 24 }, 0, 0.1, P)}" style="filter:blur(6px)"/>`);
  lamp.push(S(G.solidOf([[0, 22], [3, 22], [4, 19], [7, 8], [LAMP.z0, 6]], LF, P), { tone: "mid", crease: "lo" }));
  lamp.push(S(G.solidOf([[LAMP.z0, 18], [LAMP.z0 + 2, LAMP.r], [LAMP.z1 - 3, LAMP.r], [LAMP.z1, LAMP.r - 3], [LAMP.z1 + 5, 12], [LAMP.z1 + 5, 8]], LF, P), { tone: "hi", crease: "lo" }));
  lamp.push(S(G.solidOf([[LAMP.z1 + 4, 8.5], [LAMP.z1 + 22, 8.5]], LF, P), { tone: "hi", crease: "lo" }));
  lamp.push(S(G.solidOf([[LAMP.z1 + 21, 8.5], [LAMP.z1 + 23, 11.5], [LAMP.z1 + 26, 11.5], [LAMP.z1 + 29, 5], [LAMP.z1 + 29, 2]], LF, P), { tone: "hi", crease: "lo" }));
  for (const z of [LAMP.z0 + 12, LAMP.z0 + 26, LAMP.z1 - 8]) lamp.push(L(G.arcOf(LF, z, LAMP.r, P), { tone: "lo" }));
  lamp.push(k.fadedSvg(G.ribsOf(LF, LAMP.z0 + 12, LAMP.z0 + 26, LAMP.r, 34, P, { fade: [0.02, 0.3] }), { tone: "faint" }));
  lamp.push(k.dotsSvg(G.dotsOf(LF, LAMP.z0 + 5, LAMP.r, 26, P, { fade: [0.05, 0.3] }), { size: 0.45, tone: "mid" }));
  lamp.push(k.dotsSvg(G.dotsOf(LF, LAMP.z1 - 4, LAMP.r, 26, P, { fade: [0.05, 0.3] }), { size: 0.45, tone: "mid" }));
  lamp.push(L(G.arcOf(LF, LAMP.z1 + 15, 8.5, P), { tone: "faint" }));
  out.push(part("lantern", lamp.join("")));
  // The barrel: its axis runs from the lamp straight at the middle of the screen.
  const lampZ = (LAMP.z0 + LAMP.z1) / 2;
  const aim = [SCREEN.x + SCREEN.w / 2, faceY, (SCREEN.z0 + SCREEN.z1) / 2];
  const axis = G.unit3(G.sub3(aim, [LAMP.x, LAMP.y, lampZ]));
  const root = G.add3([LAMP.x, LAMP.y, lampZ], G.mul3(axis, LAMP.r - 3));
  const BF = G.frameAlong(root, axis);
  const LENS = 36;
  const lens = [];
  lens.push(S(G.solidOf([[0, 9], [0, 13.5], [4, 13.5], [4, 9]], BF, P), { tone: "mid", crease: "lo" }));
  lens.push(S(G.solidOf([[3, 9], [24, 9]], BF, P), { tone: "hi", crease: "lo" }));
  lens.push(S(G.solidOf([[23, 9], [23, 11], [LENS - 4, 11], [LENS - 3, 12.5], [LENS, 12.5], [LENS, 9]], BF, P), { tone: "hi", crease: "lo" }));
  lens.push(L(G.arcOf(BF, 14, 9, P), { tone: "faint" }));
  lens.push(L(G.arcOf(BF, 28, 11, P), { tone: "lo", free: true }));
  lens.push(k.dotsSvg(G.dotsOf(BF, 2, 13.5, 16, P, { fade: [0.05, 0.3] }), { size: 0.45, tone: "mid" }));
  out.push(part("lantern", lens.join("")));
  // Drive from the end of the shaft into the pedestal.
  out.push(part("lantern", tubePieces([[SHAFT.x1, SHAFT.y, SHAFT.z], [SHAFT.x1, LAMP.y + 8, 8]], 2.2, P).map((piece) => tubeSvg(piece, { tone: "hi" })).join("") + slab({ x: SHAFT.x1 - 6, y: SHAFT.y - 6, w: 12, d: 12, r: 1.6 }, 20, 12, "mid", { bevel: 0.4 })));

  // ---- The mixing desk: master and four buses, set at their real levels.
  const desk = [];
  desk.push(`<path class="iso-halo" d="${k.haloOf(DESK, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  desk.push(S(k.slabOf(DESK, 0, 12, P, 6, 0.9), { tone: "mid", crease: "lo", inner: L(k.sideSeam(DESK, 4, P, 6), { tone: "faint" }) }));
  desk.push(screws(DESK, 4, 12, 1.2));
  const BUSES = [{ name: "master", level: 0.7 }, { name: "music", level: 0.5 }, { name: "ambience", level: 0.6 }, { name: "sfx", level: 0.8 }, { name: "ui", level: 0.5 }];
  const travelY = [DESK.y + 44, DESK.y + 12];
  BUSES.forEach((bus, i) => {
    const x = DESK.x + 20 + i * 19.5;
    desk.push(L(k.lineOnTop([x, travelY[0]], [x, travelY[1]], 12, P), { tone: "hi", free: true }));
    const t = k.topTicks(travelY[1], travelY[0], 8, 2, x + 3.2, 12, [1.4, 2.4], P, "y");
    desk.push(L(t.minor, { tone: "lo", free: true }), L(t.major, { tone: "lo", free: true }));
    const y = travelY[0] + (travelY[1] - travelY[0]) * bus.level;
    desk.push(`<g data-fader="${i}">${S(k.slabOf({ x: x - 3.4, y: y - 2.2, w: 6.8, d: 4.4, r: 0.8 }, 12, 3, P, 2, 0.3), { tone: "hi", crease: "lo", lit: i === 0 })}</g>`);
    desk.push(`<g data-slot="meter-${i}"></g>`);
  });
  out.push(part("audio", desk.join("")));

  const pin = (point) => point.map(num);
  const paths = {
    toward: k.towardViewer(P),
    shaft: { x0: SHAFT.x0, y: SHAFT.y, z: SHAFT.z },
    wheel: { x: WHEEL.x + 6.2, r: WHEEL.r - 5 },
    cams: CAMS,
    dt: { x: DT.x, y: DT.y, z: dialZ + 0.2, R: DT.R - 5 },
    hp: { x0: bar.x0, x1: bar.x1, y: bossFace, z0: bar.z0, z1: bar.z1 },
    screen: { x0: cloth[0][0], x1: cloth[1][0], y: faceY, z0: cloth[0][2], z1: cloth[2][2] },
    axis: axis.map(num),
    lens: pin(G.add3(root, G.mul3(axis, LENS))),
    lensR: 9,
    forest: { z: 5, spots: spots.map(({ x, y }) => [num(x), num(y)]), x: FOREST.x, y: FOREST.y, w: FOREST.w, d: FOREST.d },
    lever: { x: LEVER.x, y: LEVER.y, z: 9, length: 24 },
    carousel: { x: CAR.x, y: CAR.y, z: 22, r: CAR.r - 3 },
    meterStep: 19.5,
    faders: BUSES.map((bus, i) => ({ name: bus.name, level: bus.level, x: DESK.x + 20 + i * 19.5, y0: travelY[0], y1: travelY[1], z: 12 })),
    tin: { x: slot.x + slot.w / 2, y: slot.y + 1, z: 34, away: 24 },
    routes: Object.fromEntries(Object.entries(routes).map(([name, route]) => [name, route.map(pin)])),
  };
  return { id: "lantern", P, width: WIDTH, height: HEIGHT, body: out.join(""), paths, label: "A magic-lantern rig: a crankshaft with a flywheel and three cams drives a lantern that throws a torii gate onto a tall screen, over a tray of identical trees set by one lever. A dial with a stop pin caps the frame time, a column shows the boss's health, a mixing desk holds five audio buses, and a stamped tin holds the save." };
}
