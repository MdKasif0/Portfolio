import { k, G, drawer, part } from "./common.mjs";
import { tubePieces, tubeSvg } from "./kit/tube.mjs";

/**
 * GitRoasted as a bench coffee roaster. Commits are beans. A gate checks the order, the conveyor
 * carries at most 20 beans past a probe that scores them on a 1,000-point gauge with no flame
 * anywhere near it, and only then does the burner (the LLM, with two gas bottles for its two
 * candidate models) touch them. Each finished batch updates one card in the rack: one per username.
 */
export const WIDTH = 1040;
export const HEIGHT = 600;
const PLATE = { x: -262, y: -104, w: 556, d: 170, r: 10 };
const BELT = { x: -228, y: -10, w: 282, d: 20, z: 58, h: 4 };
const DRUM = { x0: 66, x1: 168, z: 68, r: 29 };
const DIAL = { x: -30, y: -66, R: 25, z: 116 };
const PROBE = { x: -88, y: 0, top: 96, tip: 67 };
const PORT = { x: DRUM.x1 + 8, y: 0, z: DRUM.z, r: 17 };

export function build() {
  const P = k.fitProjection(
    [...k.boxCorners(PLATE, -17, 0), [-205, 0, 150], [-241, 0, 146], [-169, 0, 146], [DIAL.x, DIAL.y, 132], [121, -72, 112]],
    WIDTH, HEIGHT, { pad: 22, azimuth: 60 },
  );
  const { S, L, D, at, byDepth, slab, post, screws, bench, dialFace } = drawer(P);
  const out = [];

  out.push(bench(PLATE, { ruler: { x: PLATE.x + 24, y: PLATE.y + PLATE.d - 16, w: 360, d: 7, r: 1 }, label: { x: PLATE.x + 402, y: PLATE.y + PLATE.d - 26, w: 118, d: 19, r: 1.5 } }));

  // ---- Hopper on four legs, with the validation gate at its neck.
  const H = { x: -205, y: 0 };
  const hopperF = G.frameOf([H.x, H.y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const hop = [];
  // Rings on the cone ramp out toward its edge, the way the kit's rules ask of a texture that can't end on a line.
  const ringFade = (d, tone) => k.fadeLineSvg((d.match(/-?[\d.]+ -?[\d.]+/g) ?? []).map((pair) => pair.split(" ").map(Number)), { fade: [7, 7], tone });
  hop.push(`<path class="iso-halo" d="${k.haloOf({ x: H.x - 26, y: -26, w: 52, d: 52, r: 8 }, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  hop.push(slab({ x: H.x - 34, y: -34, w: 68, d: 68, r: 4 }, 0, 3, "lo", { bevel: 0.6 }));
  hop.push(screws({ x: H.x - 34, y: -34, w: 68, d: 68, r: 4 }, 5, 3, 1.5));
  for (const [x, y] of byDepth([[H.x - 26, -26], [H.x + 26, -26], [H.x - 26, 26], [H.x + 26, 26]]).slice(0, 2)) {
    hop.push(post(x, y, 2.6, 3, 121, "mid"));
  }
  hop.push(S(G.solidOf([[72, 7], [84, 7], [86, 9], [142, 39], [146, 39], [146, 34]], hopperF, P, { fill: "surface" }), { tone: "hi", crease: "lo" }));
  hop.push(ringFade(G.arcOf(hopperF, 100, 16.5, P, { slope: 0.5357, trim: 0, least: 0 }), "faint"));
  hop.push(ringFade(G.arcOf(hopperF, 113, 23.46, P, { slope: 0.5357, trim: 0, least: 0 }), "faint"));
  hop.push(ringFade(G.arcOf(hopperF, 128, 31.5, P, { slope: 0.5357, trim: 0, least: 0 }), "lo"));
  hop.push(k.dotsSvg(G.dotsOf(hopperF, 136, 35.8, 26, P, { slope: 0.5357, fade: [0.05, 0.3] }), { size: 0.5, tone: "hi" }));
  // Open mouth, seen from above, with beans waiting inside.
  hop.push(`<path d="${k.onTop(k.circleRing(H.x, H.y, 34, 56), 146, P, true)}" fill="#050506"/>`);
  hop.push(L(k.ring(H.x, H.y, 34, 146, P, 56), { tone: "mid" }));
  const pile = [];
  for (let i = 0; i < 46; i++) {
    const a = i * 2.399963, r = 30 * Math.sqrt((i + 0.6) / 46);
    pile.push(at([H.x + Math.cos(a) * r, H.y + Math.sin(a) * r, 141 + (46 - i) * 0.05]));
  }
  hop.push(`<g class="fg-beans-pile">${pile.map(([x, y], i) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3.1" ry="2.2" transform="rotate(${(i * 47) % 180} ${x.toFixed(1)} ${y.toFixed(1)})"/>`).join("")}</g>`);
  for (const [x, y] of byDepth([[H.x - 26, -26], [H.x + 26, -26], [H.x - 26, 26], [H.x + 26, 26]]).slice(2)) {
    hop.push(post(x, y, 2.6, 3, 121, "mid"));
    hop.push(D([[x, y, 124]], { size: 0.6, tone: "hi" }));
  }
  out.push(part("hopper", hop.join("")));

  // Gate: a knife valve across the neck, with a knurled handle.
  const gate = [];
  gate.push(slab({ x: H.x - 13, y: -6, w: 26, d: 12, r: 1.5 }, 72, 7, "mid"));
  gate.push(L(k.ring(H.x, 0, 5, 79, P, 20), { tone: "lo" }));
  gate.push(`<g data-gate-handle>${S(k.slabOf({ x: H.x + 13, y: -1.6, w: 16, d: 3.2, r: 0.8 }, 74, 3, P, 2), { tone: "hi", crease: "none" })}${S(k.cylinder(H.x + 31, 0, 3.4, 72.5, 6, P, 22), { tone: "hi" })}${L(k.knurl(H.x + 31, 0, 3.4, 72.5, 78.5, 18, P), { tone: "lo" })}</g>`);
  out.push(part("gate", gate.join("")));

  // ---- Belt supports (rear pair) so the belt visibly stands on something.
  const supports = [-180, -110, -40, 30];
  const belt = [];
  for (const x of supports) {
    belt.push(slab({ x: x - 8, y: BELT.y - 7, w: 16, d: 34, r: 1.2 }, 0, 2, "lo", { bevel: 0.4 }));
    belt.push(slab({ x: x - 5, y: BELT.y - 4, w: 10, d: 4, r: 0.8 }, 2, BELT.z - 2, "mid", { bevel: 0.3 }));
  }
  out.push(belt.join(""));

  // ---- The scale: a tall cabinet with eight sieve drawers (the eight scoring dimensions) and a dial.
  const CAB = { x: -72, y: -96, w: 84, d: 56, r: 3 };
  const cab = [];
  cab.push(`<path class="iso-halo" d="${k.haloOf(CAB, 0, 0.1, P)}" style="filter:blur(6px)"/>`);
  cab.push(slab({ x: CAB.x - 4, y: CAB.y - 4, w: CAB.w + 8, d: CAB.d + 8, r: 4 }, 0, 4, "lo", { bevel: 0.8 }));
  cab.push(screws({ x: CAB.x - 4, y: CAB.y - 4, w: CAB.w + 8, d: CAB.d + 8, r: 4 }, 3, 4, 1.3));
  cab.push(S(k.slabOf(CAB, 4, 112, P, 4, 1), { tone: "mid", inner: L(k.sideSeam(CAB, 14, P, 4), { tone: "faint" }) + L(k.sideSeam(CAB, 54, P, 4), { tone: "faint" }) + L(k.sideSeam(CAB, 108, P, 4), { tone: "faint" }) }));
  // Vents on the +x face, as closed slots.
  const fx = CAB.x + CAB.w;
  for (let i = 0; i < 6; i++) {
    const z = 66 + i * 6;
    cab.push(L(k.pathOf([at([fx, CAB.y + 10, z]), at([fx, CAB.y + 40, z]), at([fx, CAB.y + 40, z + 2.4]), at([fx, CAB.y + 10, z + 2.4])], true), { tone: "lo" }));
  }
  // Eight drawers on the +y face, each with a pull and a small lamp.
  const fy = CAB.y + CAB.d;
  const drawers = [];
  for (let row = 1; row >= 0; row--) {
    for (let col = 0; col < 4; col++) {
      const n = (1 - row) * 4 + col;
      const x = CAB.x + 6 + col * 18.5, z = 58 + row * 24;
      const box = S(k.slabOf({ x, y: fy, w: 16.5, d: 3, r: 0.6 }, z, 20, P, 2, 0.3), { tone: "hi", crease: "lo" });
      const pull = S(k.slabOf({ x: x + 4.5, y: fy + 3, w: 7.5, d: 1.8, r: 0.5 }, z + 6, 2.4, P, 2), { tone: "mid", crease: "none" });
      const lamp = `<circle class="fg-lamp" data-lamp="${n}" cx="${at([x + 8.2, fy + 3, z + 15])[0].toFixed(1)}" cy="${at([x + 8.2, fy + 3, z + 15])[1].toFixed(1)}" r="1.7"/>`;
      drawers.push(`<g data-sieve="${n}">${box}${pull}${lamp}</g>`);
    }
  }
  cab.push(drawers.join(""));
  // Dial on a short stand on the lid, then the post and the probe arm.
  cab.push(screws(CAB, 4, 116, 1.4));
  cab.push(post(DIAL.x, DIAL.y, 9, 116, 3, "mid", 28));
  cab.push(dialFace(DIAL.x, DIAL.y, DIAL.R, 119, 9, 50, 5));
  cab.push(`<path class="iso-line" data-tone="lit" data-needle d="" style="stroke-width:1.3"/>`);
  cab.push(`<circle class="fg-hub" cx="${at([DIAL.x, DIAL.y, 128])[0].toFixed(1)}" cy="${at([DIAL.x, DIAL.y, 128])[1].toFixed(1)}" r="1.5"/>`);
  out.push(part("scale", cab.join("")));

  // ---- Gas bottles behind the drum: the two candidate models, with a changeover valve.
  const bottles = [];
  const bottle = (x, y, name) => {
    const F = G.frameOf([x, y, 3], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const profile = [[0, 12], [3, 12.6], [78, 12.6, 1], [86, 10.4, 1], [92, 5.6, 1], [94, 4], [101, 4], [101, 5.2], [104, 5.2]];
    return part(name, [
      post(x, y, 15, 0, 3, "lo", 32),
      S(G.solidOf(profile, F, P), { tone: "hi", crease: "lo" }),
      L(G.arcOf(F, 14, 12.6, P), { tone: "faint" }),
      L(G.arcOf(F, 62, 12.6, P), { tone: "faint" }),
      slab({ x: x - 5, y: y + 12.2, w: 10, d: 0.6, r: 0.2 }, 28, 18, "lo", { bevel: 0 }),
    ].join(""));
  };
  bottles.push(slab({ x: 66, y: -86, w: 74, d: 34, r: 3 }, 0, 2, "lo", { bevel: 0.5 }));
  bottles.push(bottle(85, -69, "bottle-a"), bottle(121, -69, "bottle-b"));
  out.push(bottles.join(""));

  // ---- Gas line: both bottles feed one changeover block, then runs along the floor to the burner.
  const route = [[103, -46, 2.6], [103, -8, 2.6], [103, 8, 2.6]];
  const gas = [];
  gas.push(slab({ x: 96, y: -54, w: 14, d: 10, r: 1.4 }, 2, 7, "mid"));
  for (const piece of tubePieces(route, 1.6, P, { caps: true })) gas.push(tubeSvg(piece, { tone: "mid" }));
  for (const from of [[85, -56.4, 6], [121, -56.4, 6]]) {
    const to = [from[0] < 103 ? 96 : 110, -49, 6];
    for (const piece of tubePieces(G.fillet([from, [from[0], -49, 6], to], 3, 5), 1.1, P)) gas.push(tubeSvg(piece, { tone: "mid" }));
  }
  gas.push(S(k.cylinder(103, -49, 2.6, 9, 3, P, 16), { tone: "hi" }), L(k.lineOnTop([100.6, -49], [105.4, -49], 12, P), { tone: "hi" }));
  out.push(part("gas", gas.join("")));

  // ---- Cradles and burner under the drum (rear cradle, burner, flames, then the drum).
  const cradle = (x) => {
    const c = [];
    c.push(slab({ x, y: -38, w: 10, d: 76, r: 2 }, 0, 6, "mid", { bevel: 0.6 }));
    c.push(slab({ x: x + 1.5, y: -34, w: 7, d: 10, r: 1 }, 6, 34, "mid", { bevel: 0.3 }));
    return c.join("");
  };
  out.push(cradle(DRUM.x0 + 8), cradle(DRUM.x1 - 18));
  const burner = [];
  burner.push(slab({ x: DRUM.x0 + 18, y: 7, w: 80, d: 15, r: 3 }, 0, 4, "lo", { bevel: 0.5 }));
  burner.push(S(k.slabOf({ x: DRUM.x0 + 22, y: 10, w: 72, d: 8, r: 2.4 }, 4, 6, P, 4, 0.5), { tone: "hi", crease: "lo" }));
  const jets = [];
  for (let i = 0; i < 14; i++) jets.push([DRUM.x0 + 26 + i * 5, 14, 10]);
  burner.push(D(jets, { size: 0.7, tone: "hi" }));
  out.push(part("burner", burner.join("")));
  // Reserved: flames and the glow under the drum are written live.
  out.push(`<g data-slot="flames"></g>`);

  const armY = BELT.y - 24;
  const rearArm = [];
  rearArm.push(slab({ x: PROBE.x - 9, y: armY - 9, w: 18, d: 18, r: 2 }, 0, 3, "lo", { bevel: 0.5 }));
  rearArm.push(D(k.corners({ x: PROBE.x - 9, y: armY - 9, w: 18, d: 18 }, 2.4).map(([x, y]) => [x, y, 3]), { size: 0.45 }));
  rearArm.push(post(PROBE.x, armY, 3.4, 3, PROBE.top + 7, "mid"));
  rearArm.push(L(k.sideArc(PROBE.x, armY, 3.4, 40, P, 12), { tone: "faint" }));
  // The reading travels to the scale along a cable with a real connector at each end.
  const lead = [[PROBE.x + 3.6, armY, 26], [CAB.x + 6, armY, 26], [CAB.x + 6, CAB.y + CAB.d + 8, 26], [CAB.x + 6, CAB.y + CAB.d, 26]];
  for (const piece of tubePieces(G.fillet(lead, 5, 6), 1, P)) rearArm.push(tubeSvg(piece, { tone: "mid" }));
  rearArm.push(slab({ x: CAB.x + 3, y: CAB.y + CAB.d, w: 6, d: 1.6, r: 0.4 }, 23.5, 5, "hi", { bevel: 0, crease: "none" }));
  out.push(part("probe", rearArm.join("")));

  // ---- Conveyor. Its deck is drawn once, the moving slats and the beans go in reserved slots.
  const deck = { x: BELT.x, y: BELT.y, w: BELT.w, d: BELT.d, r: 3 };
  const bt = [];
  bt.push(S(k.slabOf(deck, BELT.z - BELT.h, BELT.h, P, 4, 0.5), { tone: "mid", crease: "lo" }));
  bt.push(L(k.planOutline(k.insetPlan(deck, 2.4), BELT.z, P, 3), { tone: "lo" }));
  out.push(part("belt", bt.join("")));
  const clipId = "rs-belt-clip";
  out.push(`<clipPath id="${clipId}"><path d="${k.planOutline(k.insetPlan(deck, 2.4), BELT.z, P, 3)}"/></clipPath>`);
  const slats = [];
  for (let x = BELT.x - 12; x < BELT.x + BELT.w + 12; x += 12) slats.push(k.lineOnTop([x, BELT.y], [x, BELT.y + BELT.d], BELT.z, P));
  out.push(`<g clip-path="url(#${clipId})"><g data-slats>${L(slats.join(""), { tone: "faint", free: true })}</g></g>`);
  out.push(`<g data-slot="beans-belt"></g>`);

  // Front supports and rail, nearer than the belt's deck.
  const front = [];
  for (const x of supports) front.push(slab({ x: x - 5, y: BELT.y + BELT.d, w: 10, d: 4, r: 0.8 }, 2, BELT.z - 2, "mid", { bevel: 0.3 }));
  front.push(slab({ x: BELT.x + 2, y: BELT.y + BELT.d, w: BELT.w - 4, d: 2, r: 0.6 }, BELT.z - 2, 5.4, "mid", { bevel: 0.2 }));
  for (const x of supports) front.push(D([[x - 3, BELT.y + BELT.d + 2, BELT.z + 2], [x + 3, BELT.y + BELT.d + 2, BELT.z + 2]], { size: 0.45 }));
  out.push(front.join(""));

  // ---- Probe: an arm off the cabinet, with a plunger that taps each passing bean.
  const arm = [];
  arm.push(slab({ x: PROBE.x - 3, y: armY - 4, w: 6, d: 38, r: 1.4 }, PROBE.top + 6, 4, "mid"));
  arm.push(slab({ x: PROBE.x - 6, y: -5, w: 12, d: 10, r: 1.4 }, PROBE.top - 2, 12, "hi", { crease: "lo" }));
  arm.push(D([[PROBE.x, 0, PROBE.top + 10], [PROBE.x, armY, PROBE.top + 10]], { size: 0.55 }));
  out.push(part("probe", arm.join("")));
  // Plunger (moved up and down live).
  const plunger = [
    S(k.cylinder(PROBE.x, 0, 1.3, PROBE.tip + 3, PROBE.top - PROBE.tip - 5, P, 14), { tone: "hi", lit: true, crease: "none" }),
    S(k.cylinder(PROBE.x, 0, 2.6, PROBE.tip, 3, P, 18), { tone: "hi", lit: true }),
  ].join("");
  out.push(`<g data-plunger>${plunger}</g>`);

  // ---- The roasting drum, on its axis along x, with a riveted flange and a glass door facing us.
  const F = G.frameOf([DRUM.x0, 0, DRUM.z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const L0 = DRUM.x1 - DRUM.x0;
  const drum = [];
  // Inlet funnel where the belt meets the drum.
  drum.push(S(G.solidOf([[-14, 15], [-12, 15], [-2, 21], [0, 21]], F, P), { tone: "mid", crease: "lo" }));
  drum.push(S(G.solidOf([[0, DRUM.r - 2], [1.6, DRUM.r], [L0 - 1.6, DRUM.r], [L0, DRUM.r - 2]], F, P), { tone: "hi", crease: "lo" }));
  for (const s of [10, 24, L0 - 24, L0 - 10]) drum.push(L(G.arcOf(F, s, DRUM.r, P), { tone: "lo" }));
  drum.push(k.fadedSvg(G.ribsOf(F, 24, L0 - 24, DRUM.r, 36, P, { fade: [0.02, 0.3] }), { tone: "faint" }));
  drum.push(k.dotsSvg(G.dotsOf(F, 5, DRUM.r, 30, P, { fade: [0.05, 0.3] }), { size: 0.5, tone: "mid" }));
  drum.push(k.dotsSvg(G.dotsOf(F, L0 - 5, DRUM.r, 30, P, { fade: [0.05, 0.3] }), { size: 0.5, tone: "mid" }));
  // Drive pulley on the rear of the drum axis and flange at the door.
  drum.push(S(G.ringBand(L0, L0 + 8, 10, DRUM.r + 3, F, P), { tone: "mid", crease: "lo" }));
  drum.push(k.dotsSvg(G.dotsOf(F, L0 + 8, DRUM.r, 16, P, { all: true }), { size: 0.55, tone: "hi" }));
  drum.push(L(G.circleOf(F, L0 + 8, 20, P), { tone: "mid" }));
  out.push(part("drum", drum.join("")));
  // Reserved: the drum's ribs turn live.
  out.push(`<g data-part="drum"><g data-slot="drum-ribs"></g></g>`);
  // Door glass: an ellipse in the plane x = const. Beans tumble in the reserved slot, clipped to it.
  const glass = G.circleOf(F, L0 + 8, PORT.r, P);
  out.push(`<radialGradient id="rs-heat"><stop offset="0" stop-color="#ff9a3d" stop-opacity=".95"/><stop offset=".6" stop-color="#e5322d" stop-opacity=".5"/><stop offset="1" stop-color="#7a1210" stop-opacity=".15"/></radialGradient><clipPath id="rs-port"><path d="${glass}"/></clipPath>`);
  out.push(`<path class="fg-port" d="${glass}"/>`);
  out.push(`<path data-port-heat fill="url(#rs-heat)" opacity="0" d="${glass}"/>`);
  out.push(`<g clip-path="url(#rs-port)"><g data-slot="port"></g></g>`);
  out.push(`<path class="iso-line" data-tone="mid" d="${glass}"/>`);
  // Door handle at the side of the flange.
  const handle = [];
  const hAt = G.pointOf(F, L0 + 8, 24, 0.3 * Math.PI);
  handle.push(k.lineSvg(k.pathOf([at(hAt), at([hAt[0] + 6, hAt[1], hAt[2]])]), { tone: "hi", free: true }));
  handle.push(`<circle class="fg-hub" cx="${at([hAt[0] + 6, hAt[1], hAt[2]])[0].toFixed(1)}" cy="${at([hAt[0] + 6, hAt[1], hAt[2]])[1].toFixed(1)}" r="2.2"/>`);
  out.push(handle.join(""));

  // Front legs of the cradles, nearer than the drum's lower half.
  for (const x of [DRUM.x0 + 8, DRUM.x1 - 18]) out.push(slab({ x: x + 1.5, y: 24, w: 7, d: 10, r: 1 }, 6, 36, "mid", { bevel: 0.3 }));

  // ---- Discharge chute into the cooling tray, and the card rack: one card per username.
  const RACK = { x: 214, y: -76, w: 64, d: 62, r: 3 };
  const rack = [];
  rack.push(`<path class="iso-halo" d="${k.haloOf(RACK, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  rack.push(slab(RACK, 0, 10, "mid", { bevel: 0.8 }));
  rack.push(screws(RACK, 4, 10, 1.3));
  const CARDS = 6;
  for (let i = 0; i < CARDS; i++) {
    const y = RACK.y + 8 + i * 8;
    rack.push(L(k.planOutline({ x: RACK.x + 8, y: y - 0.6, w: RACK.w - 16, d: 3.2, r: 0.3 }, 10, P, 1), { tone: "lo" }));
    const card = S(k.slabOf({ x: RACK.x + 10, y, w: RACK.w - 20, d: 2, r: 0.4 }, 10, 26, P, 1, 0), { tone: i === 3 ? "hi" : "mid", lit: i === 3, crease: "lo" });
    rack.push(i === 3 ? `<g data-card>${card}<path class="iso-line" data-tone="lo" d="${k.segment([RACK.x + 14, y + 2, 30], [RACK.x + RACK.w - 14, y + 2, 30], P)}"/></g>` : card);
  }
  out.push(part("rack", rack.join("")));

  const TRAY = { x: 188, y: 4, w: 78, d: 48, r: 6 };
  const tray = [];
  tray.push(`<path class="iso-halo" d="${k.haloOf(TRAY, 0, 0.1, P)}" style="filter:blur(5px)"/>`);
  tray.push(slab({ x: TRAY.x + 3, y: TRAY.y + 3, w: TRAY.w - 6, d: TRAY.d - 6, r: 5 }, 0, 4, "lo", { bevel: 0.4 }));
  tray.push(S(k.slabOf(TRAY, 4, 9, P, 8, 0.8), { tone: "mid", crease: "lo" }));
  const inner = k.insetPlan(TRAY, 3.2);
  tray.push(`<path d="${k.planOutline(inner, 13, P, 8)}" fill="#07070a"/>`);
  tray.push(L(k.planOutline(inner, 13, P, 8), { tone: "lo" }));
  tray.push(`<clipPath id="rs-tray"><path d="${k.planOutline(inner, 13, P, 8)}"/></clipPath><g clip-path="url(#rs-tray)"><g data-slot="beans-tray"></g></g>`);
  out.push(part("tray", tray.join("")));
  // Chute from the drum's underside to the tray.
  const chute = [[DRUM.x1 - 10, 19, DRUM.z - 22], [DRUM.x1 + 14, 22, 36], [TRAY.x + 26, 26, 19]];
  const chuteRoute = G.fillet(chute, 12, 8);
  const ch = [];
  ch.push(S(G.solidOf([[0, 9], [3, 9]], G.frameAlong(chuteRoute[0], G.sub3(chuteRoute[1], chuteRoute[0])), P), { tone: "mid" }));
  for (const piece of tubePieces(chuteRoute, 4.6, P)) ch.push(tubeSvg(piece, { tone: "hi" }));
  out.push(part("chute", ch.join("")));

  const paths = {
    belt: { from: [BELT.x + 22, 0, BELT.z + 2.4], to: [DRUM.x0 - 4, 0, BELT.z + 2.4] },
    probeX: PROBE.x,
    port: { center: [DRUM.x1 + 8, 0, DRUM.z], r: PORT.r },
    dial: { x: DIAL.x, y: DIAL.y, z: 128.2, R: DIAL.R - 5 },
    tray: { x: TRAY.x, y: TRAY.y, w: TRAY.w, d: TRAY.d, z: 11 },
    burner: { x0: DRUM.x0 + 26, x1: DRUM.x0 + 91, y: 14, z: 10 },
    slatStep: 12,
    drum: { x0: DRUM.x0 + 11, x1: DRUM.x1 - 11, z: DRUM.z, r: DRUM.r },
    toward: k.towardViewer(P),
    bottles: [[85, -69, 104], [121, -69, 104]],
    cardRise: 16,
    hopper: { x: H.x, y: H.y, neck: 72 },
    chute: chuteRoute,
  };
  return { id: "roaster", P, width: WIDTH, height: HEIGHT, body: out.join(""), paths, label: "A bench coffee roaster: a hopper and gate feed beans along a conveyor past a probe and dial gauge, into a glass-doored drum over a burner fed by two gas bottles, and out to a cooling tray and a rack of cards." };
}
