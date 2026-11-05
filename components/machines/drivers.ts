import { clamp01, hash, lamps, lerp, lerp3, make, mixColor, mover, projector, smooth, type Figure, type Point3, type Pose } from "@/components/machines/runtime";

type Mount = (svg: SVGSVGElement, figure: Figure) => Pose;

/** Every part of a machine runs at once, each on its own short loop. `loop` is where a part is in its cycle, from 0 to 1. */
const loop = (t: number, period: number, phase = 0) => (((t / period + phase) % 1) + 1) % 1;
/** Up and back again over one cycle. */
const pingPong = (u: number) => (u < 0.5 ? u * 2 : (1 - u) * 2);
/** On between a and b within a cycle, with soft edges. */
const during = (u: number, a: number, b: number, ramp = 0.06) => smooth((u - a) / ramp) * (1 - smooth((u - (b - ramp)) / ramp));

const GREEN_BEAN: [number, number, number] = [176, 150, 96];
const ROASTED: [number, number, number] = [74, 42, 24];
const DIMENSIONS = ["impact", "consistency", "quality", "community", "diversity", "experience", "activity", "bonuses"];
const SCORE = 531;
const BEANS = 20;

/** GitRoasted: username at the gate, data in the hopper, a score with no flame near it, then 20 commits into the fire. */
const roaster: Mount = (svg, figure) => {
  const paths = figure.paths as {
    belt: { from: Point3; to: Point3 }; probeX: number; port: { center: Point3; r: number }; dial: { x: number; y: number; z: number; R: number };
    tray: { x: number; y: number; w: number; d: number; z: number }; burner: { x0: number; x1: number; y: number; z: number }; slatStep: number;
    cardRise: number; hopper: { x: number; y: number; neck: number }; chute: Point3[]; drum: { x0: number; x1: number; z: number; r: number }; toward: Point3;
  };
  const project = projector(figure.P);
  const move = mover(figure.P);
  const lamp = lamps(svg);
  const needle = svg.querySelector("[data-needle]");
  const plunger = svg.querySelector("[data-plunger]");
  const slats = svg.querySelector("[data-slats]");
  const card = svg.querySelector("[data-card]");
  const handle = svg.querySelector("[data-gate-handle]");
  const heat = svg.querySelector("[data-port-heat]");
  const pile = Array.from(svg.querySelectorAll(".fg-beans-pile ellipse"));

  // Flames and their light, in the slot under the drum.
  const flames = svg.querySelector("[data-slot='flames']");
  const defs = make("defs", {}, flames ?? undefined);
  const grad = make("linearGradient", { id: "rs-flame", x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
  [["0", "#fff3c4", 1], [".3", "#ffb340", .95], [".7", "#f0491f", .7], ["1", "#b3201c", 0]].forEach(([offset, color, opacity]) => make("stop", { offset, "stop-color": color, "stop-opacity": opacity }, grad));
  const glowGrad = make("radialGradient", { id: "rs-glow" }, defs);
  [["0", "#ff7a2e", .55], [".55", "#e5322d", .18], ["1", "#e5322d", 0]].forEach(([offset, color, opacity]) => make("stop", { offset, "stop-color": color, "stop-opacity": opacity }, glowGrad));
  const [gx, gy] = project([(paths.burner.x0 + paths.burner.x1) / 2, paths.burner.y, paths.burner.z + 12]);
  const glow = make("ellipse", { cx: gx, cy: gy, rx: 150, ry: 74, fill: "url(#rs-glow)", opacity: 0 }, flames ?? undefined);
  const tongues = Array.from({ length: 14 }, (_, i) => {
    const x = lerp(paths.burner.x0, paths.burner.x1, i / 13);
    return { base: project([x, paths.burner.y, paths.burner.z]), element: make("path", { fill: "url(#rs-flame)" }, flames ?? undefined) };
  });

  const drumRibs = make("path", { class: "iso-line", "data-tone": "mid", style: "stroke-width:.9" }, svg.querySelector("[data-slot='drum-ribs']") ?? undefined);

  // Beans on the belt, tumbling behind the door glass, and landing in the tray.
  const beltSlot = svg.querySelector("[data-slot='beans-belt']");
  const beltBeans = Array.from({ length: BEANS }, () => make("ellipse", { rx: 3.9, ry: 2.7, fill: "rgb(176,150,96)", stroke: "#1a100a", "stroke-width": 0.4 }, beltSlot ?? undefined));
  const portSlot = svg.querySelector("[data-slot='port']");
  const portBeans = Array.from({ length: 18 }, () => make("ellipse", { rx: 3.8, ry: 2.6, stroke: "#150b05", "stroke-width": 0.4 }, portSlot ?? undefined));
  const chuteBeans = Array.from({ length: 8 }, () => make("ellipse", { rx: 3, ry: 2.1, fill: "rgb(74,42,24)" }, beltSlot?.parentElement ?? undefined));
  const traySlot = svg.querySelector("[data-slot='beans-tray']");
  const trayBeans = Array.from({ length: 44 }, (_, i) => {
    const [x, y] = project([paths.tray.x + 6 + hash(i) * (paths.tray.w - 12), paths.tray.y + 6 + hash(i + 40) * (paths.tray.d - 12), paths.tray.z]);
    return make("ellipse", { cx: x.toFixed(1), cy: y.toFixed(1), rx: 3.1, ry: 2.1, fill: "rgb(74,42,24)", stroke: "#150b05", "stroke-width": 0.4, transform: `rotate(${Math.round(hash(i + 90) * 170)} ${x.toFixed(1)} ${y.toFixed(1)})` }, traySlot ?? undefined);
  });
  const [beltAx, beltAy] = project([paths.belt.from[0] + paths.slatStep, 0, 0]);
  const [beltBx, beltBy] = project([paths.belt.from[0], 0, 0]);
  const neck = project([paths.hopper.x, paths.hopper.y, paths.hopper.neck]);
  const landing = project(paths.belt.from);
  const chutePoints = paths.chute.map(project);
  const origin = project([0, 0, 0]);
  const doorX = Math.abs(project([0, paths.port.r, 0])[0] - origin[0]);
  const doorZ = Math.abs(project([0, 0, paths.port.r])[1] - origin[1]);

  return (t, station) => {
    // Gate: orders keep coming, so it keeps opening.
    move(handle, [14 * during(loop(t, 2.4), 0.05, 0.8, 0.14), 0, 0]);
    // The hopper refills as fast as the belt takes from it.
    const fill = 0.62 + 0.38 * pingPong(loop(t, 3.2));
    pile.forEach((bean, i) => {
      const show = fill * pile.length > i;
      if (bean.getAttribute("data-on") !== String(show)) { bean.setAttribute("data-on", String(show)); bean.setAttribute("opacity", show ? "1" : "0"); }
    });
    // Scoring: the drawers chase round, the plunger taps and the needle climbs to the same 531 every time.
    const scoreU = clamp01(loop(t, 3.2) / 0.85);
    const lit = scoreU * DIMENSIONS.length;
    DIMENSIONS.forEach((_, i) => lamp(String(i), lit > i ? "on" : "off"));
    move(plunger, [0, 0, 14 * (1 - smooth(1 - Math.abs(Math.sin(t * 9))))]);
    const shown = smooth(scoreU) * SCORE;
    const angle = (shown / 1000) * Math.PI * 2;
    const { x, y, z, R } = paths.dial;
    const tip = project([x + Math.sin(angle) * R, y - Math.cos(angle) * R, z]);
    const tail = project([x - Math.sin(angle) * 4, y + Math.cos(angle) * 4, z]);
    needle?.setAttribute("d", `M${tail[0].toFixed(1)} ${tail[1].toFixed(1)}L${tip[0].toFixed(1)} ${tip[1].toFixed(1)}`);
    // The belt never stops: beans drop from the neck and ride to the drum.
    const slat = (t * 2.4) % 1;
    slats?.setAttribute("transform", `translate(${(slat * (beltAx - beltBx)).toFixed(2)} ${(slat * (beltAy - beltBy)).toFixed(2)})`);
    beltBeans.forEach((bean, i) => {
      const u = loop(t, 3.2, i / BEANS);
      let px: number, py: number;
      if (u < 0.1) {
        const drop = u / 0.1;
        px = lerp(neck[0], landing[0], drop);
        py = lerp(neck[1], landing[1], drop * drop);
      } else {
        const along3 = lerp3(paths.belt.from, paths.belt.to, (u - 0.1) / 0.9);
        [px, py] = project([along3[0], (hash(i) - 0.5) * 12, along3[2]]);
      }
      bean.setAttribute("cx", px.toFixed(1));
      bean.setAttribute("cy", py.toFixed(1));
      bean.setAttribute("transform", `rotate(${Math.round(hash(i + 7) * 170)} ${px.toFixed(1)} ${py.toFixed(1)})`);
      bean.setAttribute("opacity", (smooth(u / 0.03) * (1 - smooth((u - 0.96) / 0.04))).toFixed(2));
    });
    // The burner stays lit, and the door shows every shade of the roast at once.
    const flame = 0.86 + 0.14 * Math.sin(t * 3);
    glow.setAttribute("opacity", flame.toFixed(3));
    tongues.forEach(({ base, element }, i) => {
      const flicker = 0.62 + 0.38 * Math.sin(t * (9 + hash(i) * 7) + i * 1.7);
      const h = (20 + hash(i + 20) * 16) * flame * flicker;
      const lean = Math.sin(t * 5 + i) * 2.2;
      const [bx, by] = base;
      element.setAttribute("d", `M${(bx - 3.4).toFixed(1)} ${by.toFixed(1)}C${(bx - 3.6).toFixed(1)} ${(by - h * 0.5).toFixed(1)} ${(bx + lean - 1).toFixed(1)} ${(by - h * 0.7).toFixed(1)} ${(bx + lean).toFixed(1)} ${(by - h).toFixed(1)}C${(bx + lean + 1).toFixed(1)} ${(by - h * 0.7).toFixed(1)} ${(bx + 3.6).toFixed(1)} ${(by - h * 0.5).toFixed(1)} ${(bx + 3.4).toFixed(1)} ${by.toFixed(1)}Z`);
    });
    heat?.setAttribute("opacity", (flame * 0.75).toFixed(3));
    // The drum turns, so its ribs travel over the facing side.
    let ribs = "";
    for (let i = 0; i < 14; i++) {
      const a = t * 1.8 + (i / 14) * Math.PI * 2;
      const ry = Math.cos(a), rz = Math.sin(a);
      if (ry * paths.toward[1] + rz * paths.toward[2] < 0.12) continue;
      const [ax, ay] = project([paths.drum.x0, ry * paths.drum.r, paths.drum.z + rz * paths.drum.r]);
      const [bx, by] = project([paths.drum.x1, ry * paths.drum.r, paths.drum.z + rz * paths.drum.r]);
      ribs += `M${ax.toFixed(1)} ${ay.toFixed(1)}L${bx.toFixed(1)} ${by.toFixed(1)}`;
    }
    drumRibs.setAttribute("d", ribs);
    const roast = loop(t, 2.6);
    const [cx, cy] = project(paths.port.center);
    portBeans.forEach((bean, i) => {
      // Lifted by the drum's vanes, then falling: each bean rides the wall and drops through the middle.
      const phase = (t * 1.1 + hash(i)) % 1;
      const a = phase * Math.PI * 2 + hash(i + 11) * 0.8;
      // The door is a circle in the plane x = const, so its screen axes come straight from the camera.
      const reach = i % 3 === 0 ? 0.42 : 0.74;
      const fall = phase > 0.55 ? (phase - 0.55) / 0.45 : 0;
      const px = cx + Math.cos(a) * reach * doorX * (1 - fall * 0.35);
      const py = cy + Math.sin(a) * reach * doorZ + fall * 6;
      bean.setAttribute("cx", px.toFixed(1));
      bean.setAttribute("cy", py.toFixed(1));
      bean.setAttribute("fill", mixColor(GREEN_BEAN, ROASTED, loop(t, 2.6, hash(i + 31))));
      bean.setAttribute("transform", `rotate(${Math.round(t * 180 + i * 40) % 360} ${px.toFixed(1)} ${py.toFixed(1)})`);
    });
    // A steady stream down the chute, and a tray that's always being filled at one end and emptied at the other.
    chuteBeans.forEach((bean, i) => {
      const u = loop(t, 1.2, i / chuteBeans.length);
      const f = u * (chutePoints.length - 1);
      const n = Math.min(chutePoints.length - 2, Math.floor(f));
      const [ax, ay] = chutePoints[n], [bx, by] = chutePoints[n + 1];
      bean.setAttribute("cx", lerp(ax, bx, f - n).toFixed(1));
      bean.setAttribute("cy", lerp(ay, by, f - n).toFixed(1));
      bean.setAttribute("opacity", "1");
    });
    const trayU = loop(t, 5);
    trayBeans.forEach((bean, i) => bean.setAttribute("opacity", (((i / trayBeans.length - trayU) % 1) + 1) % 1 < 0.72 ? "1" : "0"));
    // One card per username: the same one is lifted and replaced, again and again.
    move(card, [0, 0, paths.cardRise * during(loop(t, 2.8), 0.1, 0.7, 0.18)]);

    return [
      "username · 1–39 chars · checked with Zod",
      `github · profile, repos, events · ${Math.round(fill * 100)}%`,
      `${DIMENSIONS[Math.min(DIMENSIONS.length - 1, Math.floor(lit))]} · ${Math.min(DIMENSIONS.length, Math.floor(lit) + 1)} of 8 · ${Math.round(shown)} / 1000`,
      `commit messages on the belt · ${BEANS} max`,
      `groq · json mode · roast ${Math.round(roast * 100)}%`,
      "json extracted · roast + leaderboard line",
      "firestore · one entry per username · upserted",
    ][station] ?? "";
  };
};

/** AI Checkers Arena: the tape rebuilds the board, only legal moves are offered, and the comb decides what counts. */
const referee: Mount = (svg, figure) => {
  const paths = figure.paths as {
    tape: { x: number; y: number; d: number; z: number; w: number; pitch: number; rows: { x: number; holes: number[] }[] };
    mover: { from: [number, number]; to: [number, number]; lift: number; z: number }; taken: [number, number];
    legal: [number, number][]; cell: number; boardZ: number; clock: { x: number; y: number; z: number; R: number };
    card: { from: Point3; mid: Point3; in: Point3; w: number; h: number };
  };
  const project = projector(figure.P);
  const move = mover(figure.P);
  const lamp = lamps(svg);
  // Punched tape: real rows of holes on a strip that scrolls through the reader.
  const tapeGroup = svg.querySelector("[data-tape]");
  const holes: string[] = [];
  for (const row of paths.tape.rows) {
    for (const hole of row.holes) {
      const [x, y] = project([row.x, paths.tape.y + 2 + hole * 2.7, paths.tape.z]);
      holes.push(`M${(x - 1.3).toFixed(1)} ${y.toFixed(1)}a1.3 .85 0 1 0 2.6 0a1.3 .85 0 1 0 -2.6 0Z`);
    }
  }
  make("path", { d: holes.join(""), fill: "#17151a" }, tapeGroup ?? undefined);
  // Legal squares light on the board.
  const legalSlot = svg.querySelector("[data-slot='legal']");
  const half = paths.cell / 2;
  const squares = paths.legal.map(([x, y]) => make("path", {
    d: `M${[[x - half, y - half], [x + half, y - half], [x + half, y + half], [x - half, y + half]].map(([a, b]) => project([a, b, paths.boardZ]).map((v) => v.toFixed(1)).join(" ")).join("L")}Z`,
    fill: "#e5322d",
    opacity: 0
  }, legalSlot ?? undefined));
  const hand = svg.querySelector("[data-clock-hand]");
  const bridge = svg.querySelector("[data-bridge]");
  const head = svg.querySelector("[data-head]");
  const rod = svg.querySelector("[data-head-rod]");
  const piece = svg.querySelector("[data-mover]");
  const taken = svg.querySelector("[data-taken]");
  const cardHost = svg.querySelector("[data-card]");
  const cardPath = make("path", { class: "fg-paper", opacity: 0 }, cardHost ?? undefined);
  const cardLine = make("path", { class: "iso-line fg-ink", opacity: 0 }, cardHost ?? undefined);
  const { w, h } = paths.card;
  const dx = paths.mover.to[0] - paths.mover.from[0];
  const dy = paths.mover.to[1] - paths.mover.from[1];

  const drawCard = (at: Point3, opacity: number) => {
    const corners: Point3[] = [[at[0] - w / 2, at[1], at[2]], [at[0] + w / 2, at[1], at[2]], [at[0] + w / 2, at[1], at[2] + h], [at[0] - w / 2, at[1], at[2] + h]];
    cardPath.setAttribute("d", `M${corners.map((c) => project(c).map((v) => v.toFixed(1)).join(" ")).join("L")}Z`);
    const a = project([at[0] - w / 2 + 4, at[1], at[2] + h * 0.66]), b = project([at[0] + w / 2 - 6, at[1], at[2] + h * 0.66]);
    const c = project([at[0] - w / 2 + 4, at[1], at[2] + h * 0.33]), e = project([at[0] + w / 2 - 12, at[1], at[2] + h * 0.33]);
    cardLine.setAttribute("d", `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}M${c[0].toFixed(1)} ${c[1].toFixed(1)}L${e[0].toFixed(1)} ${e[1].toFixed(1)}`);
    cardPath.setAttribute("opacity", opacity.toFixed(2));
    cardLine.setAttribute("opacity", opacity.toFixed(2));
  };

  /** One attempt: the card comes out of the booth, travels to the comb and drops in. */
  const attempt = (u: number) => {
    if (u <= 0 || u >= 1) return false;
    const travel = smooth(u / 0.62);
    const drop = smooth((u - 0.62) / 0.3);
    const at = drop > 0 ? lerp3(paths.card.mid, paths.card.in, drop) : lerp3(paths.card.from, paths.card.mid, travel);
    drawCard(at, smooth(u / 0.1) * (1 - smooth((u - 0.9) / 0.1)));
    return true;
  };

  return (t, station) => {
    // The log replays and rewinds without a break.
    const replay = smooth(pingPong(loop(t, 4)));
    move(tapeGroup, [lerp(-paths.tape.pitch * 8, 0, replay), 0, 0]);
    lamp("reader", Math.sin(t * 9) > 0 ? "on" : "off");
    // Legal squares ripple across the board.
    squares.forEach((square, i) => square.setAttribute("opacity", (0.28 + 0.3 * (0.5 + 0.5 * Math.sin(t * 5 + i * 1.3))).toFixed(2)));
    // The clock runs flat out. Not to scale.
    const angle = loop(t, 3) * Math.PI * 2;
    const { x, y, z, R } = paths.clock;
    const tip = project([x + Math.sin(angle) * R, y - Math.cos(angle) * R, z]);
    const tail = project([x - Math.sin(angle) * 4, y + Math.cos(angle) * 4, z]);
    hand?.setAttribute("d", `M${tail[0].toFixed(1)} ${tail[1].toFixed(1)}L${tip[0].toFixed(1)} ${tip[1].toFixed(1)}`);
    // Attempts, over and over: the first answer is illegal and the retry passes.
    const ask = loop(t, 5.2);
    const first = ask < 0.5;
    if (!attempt(first ? ask * 2 : (ask - 0.5) * 2)) { cardPath.setAttribute("opacity", "0"); cardLine.setAttribute("opacity", "0"); }
    const judged1 = ask >= 0.43, judged2 = ask >= 0.93;
    lamp("attempt-0", judged1 ? "bad" : "on");
    lamp("attempt-1", first ? "off" : judged2 ? "good" : "on");
    lamp("attempt-2", "off");
    lamp("comb", judged2 ? "good" : first && judged1 ? "bad" : "off");
    // The gantry carries a piece over and back again. The model never touches one.
    const m = pingPong(loop(t, 3.6));
    const down = (from: number, to: number) => smooth((m - from) / (to - from));
    const lowered = Math.max(down(0, 0.22) * (1 - down(0.34, 0.46)), down(0.74, 0.88) * (1 - down(0.92, 1)));
    const across = down(0.42, 0.74);
    move(bridge, [dx * across, 0, 0]);
    move(head, [dx * across, dy * across, 0]);
    move(rod, [dx * across, dy * across, 12 * (1 - lowered)]);
    const lift = m > 0.34 && m < 0.88 ? 16 * Math.min(smooth((m - 0.34) / 0.1), 1 - smooth((m - 0.76) / 0.1)) : 0;
    move(piece, [dx * across, dy * across, lift]);
    taken?.setAttribute("opacity", (1 - smooth((m - 0.74) / 0.12)).toFixed(2));

    const answer = first ? (judged1 ? "attempt 1 of 3 · illegal · rejected" : "attempt 1 of 3 · temperature 0.10") : judged2 ? "attempt 2 of 3 · legal · accepted" : "attempt 2 of 3 · temperature 0.25";
    return [
      `move log · replaying ply ${Math.round(replay * 24)}`,
      `rules engine · ${paths.legal.length} legal moves · only those are offered`,
      answer,
      answer,
      "move applied by the server",
      "postgres · move, reasoning, latency, tokens",
    ][station] ?? "";
  };
};

/** GigSense: the sum and the evidence stay on the device. The radio only ever carries a paper slip. */
const fieldcase: Mount = (svg, figure) => {
  const paths = figure.paths as {
    calc: { screen: { x: number; y: number; w: number; d: number }; z: number }; floor: number; evidenceFrom: Point3; evidenceTo: Point3;
    slip: { from: Point3; mid: Point3; in: Point3 }; conduit: Point3[]; mast: Point3; replyAt: Point3; keys: [number, number][]; keyZ: number;
  };
  const project = projector(figure.P);
  const lamp = lamps(svg);
  const bars = Array.from(svg.querySelectorAll("[data-bar]"));
  const receipt = Array.from(svg.querySelectorAll("[data-receipt] path"));
  // Display bars on the calculator: a pay figure minus costs, drawn in the plane of its screen.
  const calcHost = svg.querySelector("[data-calc-bars]");
  const { screen } = paths.calc;
  const rows = [0.92, 0.58, 0.36];
  const displayRows = rows.map((_, i) => make("path", { class: "fg-display", "stroke-width": 2.4, fill: "none", "data-row": i }, calcHost ?? undefined));
  // Key presses.
  const keyDots = paths.keys.map(([x, y]) => {
    const [sx, sy] = project([x + 3.2, y + 3.2, paths.keyZ]);
    return make("circle", { cx: sx.toFixed(1), cy: sy.toFixed(1), r: 2.2, fill: "#ff5243", opacity: 0 }, calcHost ?? undefined);
  });
  const fileHost = svg.querySelector("[data-evidence]");
  const file = make("path", { class: "fg-paper", opacity: 0 }, fileHost ?? undefined);
  const fileEdge = make("path", { class: "iso-line", "data-tone": "lit", opacity: 0 }, fileHost ?? undefined);
  const slipHost = svg.querySelector("[data-slip]");
  const slip = make("path", { class: "fg-paper", opacity: 0 }, slipHost ?? undefined);
  const pulse = make("circle", { r: 3.2, fill: "#ff5243", opacity: 0 }, slipHost ?? undefined);
  const pulseBack = make("circle", { r: 3.2, fill: "#5fdba7", opacity: 0 }, slipHost ?? undefined);
  const replyHost = svg.querySelector("[data-reply]");
  const reply = make("path", { class: "fg-paper", opacity: 0 }, replyHost ?? undefined);
  const replyMark = make("path", { class: "iso-line", "data-tone": "green", opacity: 0, style: "stroke-width:1.4" }, replyHost ?? undefined);
  const waveHost = svg.querySelector("[data-slot='waves']");
  const [mx, my] = project(paths.mast);
  const waves = [0, 1, 2].map(() => make("ellipse", { cx: mx.toFixed(1), cy: my.toFixed(1), fill: "none", stroke: "#ff5243", "stroke-width": 0.9, opacity: 0 }, waveHost ?? undefined));
  const conduit = paths.conduit.map(project);
  const flatCard = (at: Point3, w: number, d: number) => `M${([[at[0] - w / 2, at[1] - d / 2, at[2]], [at[0] + w / 2, at[1] - d / 2, at[2]], [at[0] + w / 2, at[1] + d / 2, at[2]], [at[0] - w / 2, at[1] + d / 2, at[2]]] as Point3[]).map((c) => project(c).map((v) => v.toFixed(1)).join(" ")).join("L")}Z`;

  return (t, station) => {
    // Signal comes and goes, the way it does on a delivery run. Nothing below depends on it.
    const signal = pingPong(loop(t, 3.6));
    bars.forEach((bar, i) => { const on = signal * 4 > i + 0.25; if (bar.getAttribute("data-state") !== String(on)) bar.setAttribute("data-state", String(on)); });
    // The sum keeps running.
    const sum = loop(t, 2.6);
    displayRows.forEach((row, i) => {
      const u = smooth((sum - i * 0.28) / 0.34);
      const y = screen.y + 5 + i * ((screen.d - 10) / 2);
      const a = project([screen.x + 4, y, paths.calc.z]), b = project([screen.x + 4 + (screen.w - 8) * rows[i] * u, y, paths.calc.z]);
      row.setAttribute("d", `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    });
    keyDots.forEach((dot, i) => {
      const cycle = t * 6;
      const pick = Math.floor(hash(Math.floor(cycle) + 3) * keyDots.length);
      dot.setAttribute("opacity", pick === i ? (0.95 * (1 - (cycle % 1))).toFixed(2) : "0");
    });
    const printed = loop(t, 3) * receipt.length;
    receipt.forEach((line, i) => line.setAttribute("opacity", printed > i ? "1" : "0"));
    // Evidence goes down into a tray and stays there.
    const store = loop(t, 2.4);
    const at = lerp3(paths.evidenceFrom, paths.evidenceTo, smooth(store / 0.8));
    const d = flatCard(at, 22, 15);
    const opacity = smooth(store / 0.12) * (1 - smooth((store - 0.88) / 0.12));
    file.setAttribute("d", d);
    fileEdge.setAttribute("d", d);
    file.setAttribute("opacity", opacity.toFixed(2));
    fileEdge.setAttribute("opacity", opacity.toFixed(2));
    // Only a slip of text goes through the slot, along the conduit and out of the mast.
    const send = loop(t, 3.2);
    lamp("slot", send < 0.66 ? "on" : "off");
    if (send < 0.42) {
      const atSlip = send < 0.22 ? lerp3(paths.slip.from, paths.slip.mid, smooth(send / 0.22)) : lerp3(paths.slip.mid, paths.slip.in, smooth((send - 0.22) / 0.2));
      slip.setAttribute("d", flatCard(atSlip, 26, 4));
      slip.setAttribute("opacity", (smooth(send / 0.05) * (1 - smooth((send - 0.36) / 0.06))).toFixed(2));
    } else slip.setAttribute("opacity", "0");
    const place = (dot: SVGCircleElement, u: number) => {
      if (u < 0 || u >= 1) { dot.setAttribute("opacity", "0"); return; }
      dot.setAttribute("cx", lerp(conduit[0][0], conduit[1][0], u).toFixed(1));
      dot.setAttribute("cy", lerp(conduit[0][1], conduit[1][1], u).toFixed(1));
      dot.setAttribute("opacity", "1");
    };
    place(pulse, send >= 0.4 && send < 0.72 ? (send - 0.4) / 0.32 : -1);
    const back = loop(t, 3.2, 0.5);
    place(pulseBack, back < 0.3 ? 1 - back / 0.3 : -1);
    // Waves ripple off the mast without a pause.
    waves.forEach((wave, i) => {
      const u = (t * 0.9 + i / 3) % 1;
      wave.setAttribute("rx", (8 + u * 46).toFixed(1));
      wave.setAttribute("ry", (4 + u * 22).toFixed(1));
      wave.setAttribute("opacity", (0.75 * (1 - u) * smooth(u / 0.1)).toFixed(2));
    });
    // Structured replies land, checked, before anything reaches the screen.
    const landed = during(back, 0.26, 0.98, 0.1);
    reply.setAttribute("d", flatCard(paths.replyAt, 34, 30));
    reply.setAttribute("opacity", landed.toFixed(2));
    const a = project([paths.replyAt[0] - 6, paths.replyAt[1] + 1, paths.replyAt[2]]), b = project([paths.replyAt[0] - 1, paths.replyAt[1] + 6, paths.replyAt[2]]), c = project([paths.replyAt[0] + 9, paths.replyAt[1] - 7, paths.replyAt[2]]);
    replyMark.setAttribute("d", `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}L${c[0].toFixed(1)} ${c[1].toFixed(1)}`);
    replyMark.setAttribute("opacity", during(back, 0.42, 0.98, 0.08).toFixed(2));

    return [
      signal > 0.15 ? "signal comes and goes · app shell cached" : "no signal · app still running",
      "pay − vehicle cost · on the device · no network",
      "indexeddb · 3 stores · 0 files uploaded",
      "text description only · files stay on the device",
      "structured json · parsed before the ui sees it",
    ][station] ?? "";
  };
};

/** A point a given fraction of the way along a polyline. */
const along = (points: Point3[], u: number): Point3 => {
  const f = clamp01(u) * (points.length - 1);
  const n = Math.min(points.length - 2, Math.floor(f));
  return lerp3(points[n], points[n + 1], f - n);
};
const d2 = (p: [number, number]) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** Her artwork, drawn around the feet at the origin, one group per pose. */
const CAT_SIT = `<path d="M6.5 -2C13 -1 13 -9 10 -11" fill="none" stroke="#3a2c22" stroke-width="3.6" stroke-linecap="round"/><path d="M6.5 -2C13 -1 13 -9 10 -11" fill="none" stroke="#fffaf2" stroke-width="2.3" stroke-linecap="round"/><ellipse cx="0" cy="-6.6" rx="7" ry="6.6" fill="#fffaf2" stroke="#3a2c22" stroke-width=".7"/><path d="M-9 -18L-9.6 -27L-2.6 -23ZM9 -18L9.6 -27L2.6 -23Z" fill="#fffaf2" stroke="#3a2c22" stroke-width=".7" stroke-linejoin="round"/><path d="M-8.3 -20.4L-8.6 -25L-5 -23ZM8.3 -20.4L8.6 -25L5 -23Z" fill="#ff8f7d"/><ellipse cx="0" cy="-17.2" rx="10.8" ry="8.8" fill="#fffaf2" stroke="#3a2c22" stroke-width=".7"/><circle cx="-4.2" cy="-17" r="1.25" fill="#20140e"/><circle cx="4.2" cy="-17" r="1.25" fill="#20140e"/><ellipse cx="-7" cy="-14.4" rx="1.9" ry="1.2" fill="#ffb9ad"/><ellipse cx="7" cy="-14.4" rx="1.9" ry="1.2" fill="#ffb9ad"/>`;
const CAT_LEAP = `<path d="M-9 -8C-15 -9 -16 -14 -14 -17" fill="none" stroke="#3a2c22" stroke-width="3.6" stroke-linecap="round"/><path d="M-9 -8C-15 -9 -16 -14 -14 -17" fill="none" stroke="#fffaf2" stroke-width="2.3" stroke-linecap="round"/><ellipse cx="-1" cy="-8" rx="10" ry="5.4" fill="#fffaf2" stroke="#3a2c22" stroke-width=".7" transform="rotate(-14 -1 -8)"/><path d="M-7 -5L-11 -1M5 -7L10 -3" stroke="#3a2c22" stroke-width="2.6" stroke-linecap="round"/><path d="M-7 -5L-11 -1M5 -7L10 -3" stroke="#fffaf2" stroke-width="1.5" stroke-linecap="round"/><path d="M1 -18L1 -25.6L7.2 -22ZM15.6 -18L16.4 -25.6L9.8 -22Z" fill="#fffaf2" stroke="#3a2c22" stroke-width=".7" stroke-linejoin="round"/><ellipse cx="8.5" cy="-15.5" rx="9.6" ry="8" fill="#fffaf2" stroke="#3a2c22" stroke-width=".7"/><circle cx="5" cy="-15.5" r="1.2" fill="#20140e"/><circle cx="12.2" cy="-15.5" r="1.2" fill="#20140e"/>`;
const CAT_NAP = `<path d="M9 -2C15 -1 15 -6 12 -7" fill="none" stroke="#3a2c22" stroke-width="3.4" stroke-linecap="round"/><path d="M9 -2C15 -1 15 -6 12 -7" fill="none" stroke="#fffaf2" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="1.5" cy="-5.6" rx="11.5" ry="5.8" fill="#fffaf2" stroke="#3a2c22" stroke-width=".7"/><path d="M-11.5 -9.6L-12.4 -16.4L-6.5 -13.4ZM-.5 -9.6L.4 -16.4L-5.5 -13.4Z" fill="#fffaf2" stroke="#3a2c22" stroke-width=".7" stroke-linejoin="round"/><ellipse cx="-6" cy="-7.4" rx="8.4" ry="6.6" fill="#fffaf2" stroke="#3a2c22" stroke-width=".7"/><path d="M-10 -7.4q1.4 1.2 2.8 0M-4.8 -7.4q1.4 1.2 2.8 0" fill="none" stroke="#20140e" stroke-width=".8" stroke-linecap="round"/>`;

/** Cookie: blank windows she can only measure, a drum that picks what she does, and a real parabola to the next window. */
const automaton: Mount = (svg, figure) => {
  const paths = figure.paths as {
    toward: Point3; rail: { x0: number; x1: number; y: number; z: number }; corners: Record<string, [Point3, Point3]>;
    drum: { x0: number; y: number; z: number; r: number; tracks: number[] }; cool: { x: number; y: number; z: number; R: number };
    board: { y: number; x0: number; x1: number; z0: number; h: number }; gov: { x: number; y: number; top: number; sleeve: number };
    mask: { z: number; y: number; clearX: number; artX: number; nozzle: number; floor: number }; box: { x: number; y: number; z: number };
    cat: { dock: Point3; dockEnd: Point3; w3: Point3; w3Raw: Point3; w2: Point3 }; routes: Record<string, Point3[]>;
  };
  const project = projector(figure.P);
  const move = mover(figure.P);
  const lamp = lamps(svg);
  const q = (s: string) => svg.querySelector(s);
  const slot = (name: string) => q(`[data-slot='${name}']`) ?? undefined;

  // The measuring arm.
  const carriage = q("[data-carriage]");
  const arm = make("path", { class: "iso-line", "data-tone": "hi", style: "stroke-width:1.5" }, slot("arm"));
  const tip = make("circle", { r: 2, class: "fg-hub" }, slot("arm"));
  // One tour of the corners, back to front. Each window gives two points and nothing else.
  const touches: { id: string; at: Point3 }[] = [];
  for (const id of ["w2", "w3", "w1"]) paths.corners[id].forEach((at, i) => touches.push({ id: `${id}-${i}`, at }));
  const brackets = new Map(touches.map(({ id }) => [id, q(`[data-corner='${id}']`)]));

  // The drum's pins, each on a track at its own angle. Only the facing half is drawn.
  const pins = Array.from({ length: 22 }, (_, i) => ({ track: i % paths.drum.tracks.length, a: hash(i + 3) * Math.PI * 2, el: make("circle", { r: 1.25, class: "fg-hub" }, slot("pins")) }));
  const tines = Array.from(svg.querySelectorAll("[data-tine]"));
  const STATES = ["sitting", "walking", "curious", "grooming", "sleeping"];
  const coolNeedle = q("[data-cool]");

  // The plotted arc, the pen on the board, and Cookie.
  const arcGhost = make("path", { class: "iso-line", "data-tone": "lo", "stroke-dasharray": "3 3", opacity: 0 }, slot("arc"));
  const arcLine = make("path", { class: "iso-line", "data-tone": "lit", style: "stroke-width:1.5" }, slot("arc"));
  const corridor = q("[data-corridor]");
  const pen = make("circle", { r: 2.2, fill: "var(--machine-accent, #ff5243)", opacity: 0 }, slot("pen"));
  const catHost = make("g", {}, slot("cat"));
  const shadow = make("ellipse", { rx: 11, ry: 3.8, fill: "#000", opacity: 0.22 }, slot("cat"));
  catHost.parentElement?.insertBefore(shadow, catHost);
  const poses = [CAT_SIT, CAT_LEAP, CAT_NAP].map((art) => { const g = make("g", { opacity: 0 }, catHost); g.innerHTML = art; return g; });
  const zees = [0, 1, 2].map(() => { const z = make("text", { "font-size": 9, "font-weight": 700, fill: "var(--machine-accent, #ff5243)", opacity: 0 }, slot("cat")); z.textContent = "z"; return z; });

  const hump = (from: Point3, to: Point3, height: number, p: number): Point3 => [lerp(from[0], to[0], p), lerp(from[1], to[1], p), lerp(from[2], to[2], p) + 4 * height * p * (1 - p)];
  const arcD = (from: Point3, to: Point3, height: number, upto: number) => {
    const steps = Math.max(2, Math.ceil(36 * upto));
    let d = "";
    for (let i = 0; i <= steps; i++) d += `${i ? "L" : "M"}${d2(project(hump(from, to, height, (i / steps) * upto)))}`;
    return d;
  };
  const APEX_A = 46, APEX_B = 30, APEX_C = 18;

  // The governor's arms and balls swap sides of the spindle as they go round.
  const front = slot("gov-front");
  const sleeve = q("[data-sleeve]");
  const balls = [0, 1].map(() => {
    const g = make("g", {}, front);
    return { g, arm: make("path", { class: "iso-line", "data-tone": "hi", style: "stroke-width:1.1" }, g), link: make("path", { class: "iso-line", "data-tone": "mid", style: "stroke-width:.8" }, g), ball: make("circle", { r: 4.2, class: "fg-ball" }, g) };
  });

  // The mask: beads drop from a travelling nozzle.
  const dropper = q("[data-dropper]");
  const beadClear = make("circle", { r: 2.5, fill: "var(--machine-accent, #ff5243)", opacity: 0 }, slot("beads"));
  const beadArt = make("circle", { r: 2.5, fill: "var(--machine-accent, #ff5243)", opacity: 0 }, slot("beads"));
  const ripple = make("ellipse", { fill: "none", stroke: "var(--machine-accent, #ff5243)", "stroke-width": 1, opacity: 0 }, slot("ripple"));
  const clearFloor = project([paths.mask.clearX, paths.mask.y, paths.mask.floor]);
  ripple.setAttribute("cx", clearFloor[0].toFixed(1));
  ripple.setAttribute("cy", clearFloor[1].toFixed(1));

  // The strongbox: one card goes in, the drawer closes, and that's the only way in or out.
  const drawer = q("[data-drawer]");
  const card = make("path", { class: "fg-paper", opacity: 0 }, slot("store-card"));
  const flat = (at: Point3, w: number, d: number) => `M${([[at[0] - w / 2, at[1] - d / 2, at[2]], [at[0] + w / 2, at[1] - d / 2, at[2]], [at[0] + w / 2, at[1] + d / 2, at[2]], [at[0] - w / 2, at[1] + d / 2, at[2]]] as Point3[]).map((c) => d2(project(c))).join("L")}Z`;

  // A pulse carries each stage's result along the floor to the next.
  const flows = Object.values(paths.routes).flatMap((route, r) => [0, 0.5].map((phase) => ({ route, phase: phase + r * 0.17, dot: make("circle", { r: 2.4, fill: "var(--machine-accent, #ff5243)", opacity: 0 }, slot("pulse")) })));
  // The governor's speed depends on how fast it has been going, so its angle is added up frame by frame.
  let spun = 0, spunAt = 0, rise = 1;

  return (t, station) => {
    // ---- The arm never rests: corner to corner to corner, all the way round.
    const f = loop(t, 4.2) * touches.length;
    const n = Math.floor(f);
    const from = touches[(n + touches.length - 1) % touches.length].at, to = touches[n].at;
    const hop = smooth((f - n) / 0.6);
    const reading = lerp3(from, to, hop);
    const lifted: Point3 = [reading[0], reading[1], reading[2] + 7 * Math.sin(Math.PI * hop)];
    move(carriage, [lifted[0], 0, 0]);
    arm.setAttribute("d", `M${d2(project([lifted[0], paths.rail.y, paths.rail.z]))}L${d2(project(lifted))}`);
    const [tx, ty] = project(lifted);
    tip.setAttribute("cx", tx.toFixed(1));
    tip.setAttribute("cy", ty.toFixed(1));
    touches.forEach(({ id }, i) => {
      const age = (f - (i + 0.6) + touches.length) % touches.length;
      brackets.get(id)?.setAttribute("opacity", age < 2.6 ? (1 - age / 2.6).toFixed(2) : "0");
    });
    const scanned = Math.floor(n / 2) + 1;

    // ---- The drum turns all the time, pins lift the tines, and the cooldown dial keeps running down.
    const spin = t * 1.9;
    const toward = paths.toward;
    pins.forEach(({ track, a, el }) => {
      const angle = a + spin;
      const y = Math.cos(angle), z = Math.sin(angle);
      if (y * toward[1] + z * toward[2] <= 0.1) { el.setAttribute("opacity", "0"); return; }
      const [px, py] = project([paths.drum.tracks[track], paths.drum.y + y * (paths.drum.r + 0.4), paths.drum.z + z * (paths.drum.r + 0.4)]);
      el.setAttribute("cx", px.toFixed(1));
      el.setAttribute("cy", py.toFixed(1));
      el.setAttribute("opacity", "1");
    });
    const lifts = [0, 0, 0, 0, 0];
    pins.forEach(({ track, a }) => {
      const angle = ((a + spin) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const gap = Math.abs(angle - Math.PI / 2);
      if (gap < 0.34) lifts[track] = Math.max(lifts[track], 1 - gap / 0.34);
    });
    tines.forEach((tine, i) => move(tine, [0, 0, lifts[i] * 3.6]));
    const coolA = (1 - loop(t, 2.4)) * (14 / 28) * Math.PI * 2;
    const { x: cx, y: cy, z: cz, R: cR } = paths.cool;
    coolNeedle?.setAttribute("d", `M${d2(project([cx, cy, cz]))}L${d2(project([cx + Math.sin(coolA) * cR, cy - Math.cos(coolA) * cR, cz]))}`);

    // ---- Cookie's own round: along the Dock, up to one window, up to the next, a nap, and home.
    const u = loop(t, 7.6);
    const { dock, dockEnd, w3, w3Raw, w2 } = paths.cat;
    const leapA = clamp01((u - 0.18) / 0.18), leapB = clamp01((u - 0.44) / 0.18), homeHop = clamp01((u - 0.86) / 0.14);
    const aim = lerp3(w3Raw, w3, smooth((u - 0.12) / 0.06));
    corridor?.setAttribute("opacity", during(u, 0.1, 0.42).toFixed(2));
    arcGhost.setAttribute("d", arcD(dockEnd, w3Raw, APEX_A, 1));
    arcGhost.setAttribute("opacity", during(u, 0.1, 0.2).toFixed(2));
    if (u >= 0.1 && u < 0.42) { arcLine.setAttribute("d", arcD(dockEnd, aim, APEX_A, 1)); arcLine.setAttribute("opacity", during(u, 0.1, 0.42).toFixed(2)); }
    else if (u >= 0.42 && u < 0.68) { arcLine.setAttribute("d", arcD(w3, w2, APEX_B, 1)); arcLine.setAttribute("opacity", during(u, 0.42, 0.68).toFixed(2)); }
    else arcLine.setAttribute("opacity", "0");
    const penU = u < 0.42 ? leapA : leapB;
    const [gx, gy] = project([lerp(paths.board.x0, paths.board.x1, penU), paths.board.y, paths.board.z0 + 4 * paths.board.h * penU * (1 - penU)]);
    pen.setAttribute("cx", gx.toFixed(1));
    pen.setAttribute("cy", gy.toFixed(1));
    pen.setAttribute("opacity", "1");
    let at: Point3 = dock, pose = 0, flip = 1, airborne = false, stateNow = 1;
    if (u < 0.12) { at = lerp3(dock, dockEnd, smooth(u / 0.12)); flip = -1; }
    else if (u < 0.18) { at = dockEnd; stateNow = 2; }
    else if (u < 0.36) { at = hump(dockEnd, w3, APEX_A, leapA); pose = 1; airborne = true; stateNow = 2; }
    else if (u < 0.44) { at = w3; stateNow = 3; }
    else if (u < 0.62) { at = hump(w3, w2, APEX_B, leapB); pose = 1; flip = -1; airborne = true; stateNow = 2; }
    else if (u < 0.86) { at = w2; pose = 2; stateNow = 4; }
    else { at = hump(w2, dock, APEX_C, homeHop); pose = 1; airborne = true; stateNow = 0; }
    STATES.forEach((_, i) => lamp(`state-${i}`, i === stateNow ? "on" : "off"));
    const [ax, ay] = project(at);
    const bob = u < 0.12 ? Math.abs(Math.sin(t * 14)) * 1.1 : 0;
    catHost.setAttribute("transform", `translate(${ax.toFixed(1)} ${(ay - bob).toFixed(1)}) scale(${(flip * 1.32).toFixed(2)} 1.32)`);
    poses.forEach((g, i) => g.setAttribute("opacity", i === pose ? "1" : "0"));
    shadow.setAttribute("cx", ax.toFixed(1));
    shadow.setAttribute("cy", (ay + 0.6).toFixed(1));
    shadow.setAttribute("opacity", airborne ? "0" : "0.22");
    zees.forEach((z, i) => {
      const zu = (t * 0.7 + i / 3) % 1;
      z.setAttribute("x", (ax + 6 + zu * 12 + i).toFixed(1));
      z.setAttribute("y", (ay - 22 - zu * 20).toFixed(1));
      z.setAttribute("opacity", pose === 2 ? (Math.sin(zu * Math.PI) * 0.95).toFixed(2) : "0");
    });

    // ---- The governor follows her: flat out while she's up, slow while she naps, and a beat of stillness when her window is hidden.
    const fps = pose !== 2 ? 60 : u < 0.8 ? 15 : 0;
    const dt = Math.max(0, Math.min(0.1, t - spunAt));
    spunAt = t;
    spun += dt * (fps / 60) * 15;
    rise += ((fps === 60 ? 1 : fps === 15 ? 0.28 : 0) - rise) * Math.min(1, dt * 7);
    const swing = 0.3 + rise * 0.78;
    const { x: gvx, y: gvy, top } = paths.gov;
    const armLen = 26;
    const drop = Math.cos(swing) * armLen;
    const reach = Math.sin(swing) * armLen;
    const sleeveZ = top - drop * 1.72 - paths.gov.sleeve;
    move(sleeve, [0, 0, sleeveZ - 11]);
    const back = slot("gov-back"), front = slot("gov-front");
    balls.forEach(({ g, arm: rod, link, ball }, i) => {
      const a = spun + i * Math.PI;
      const dx = Math.cos(a), dy = Math.sin(a);
      const b: Point3 = [gvx + dx * reach, gvy + dy * reach, top - drop];
      const mid: Point3 = [gvx + dx * reach * 0.5, gvy + dy * reach * 0.5, top - drop * 0.5];
      rod.setAttribute("d", `M${d2(project([gvx, gvy, top]))}L${d2(project(b))}`);
      link.setAttribute("d", `M${d2(project(mid))}L${d2(project([gvx, gvy, paths.gov.sleeve + sleeveZ - 11 + 3]))}`);
      const [bx, by] = project(b);
      ball.setAttribute("cx", bx.toFixed(1));
      ball.setAttribute("cy", by.toFixed(1));
      const host = dx * toward[0] + dy * toward[1] < 0 ? back : front;
      if (host && g.parentElement !== host) host.appendChild(g);
    });
    lamp("fps-60", fps === 60 ? "good" : "off");
    lamp("fps-15", fps === 15 ? "on" : "off");
    lamp("fps-0", fps === 0 ? "bad" : "off");

    // ---- Clicks keep coming: one falls through clear glass, the next is caught on her artwork.
    const click = loop(t, 2.6);
    const beadAt = (x: number, v: number, floor: number) => project([x, paths.mask.y, lerp(paths.mask.nozzle, floor, v * v)]);
    const dropX = lerp(paths.mask.clearX, paths.mask.artX, smooth((click - 0.36) / 0.14) * (1 - smooth((click - 0.88) / 0.12)));
    move(dropper, [dropX, 0, 0]);
    const [c1x, c1y] = beadAt(paths.mask.clearX, clamp01((click - 0.05) / 0.22), paths.mask.floor);
    beadClear.setAttribute("cx", c1x.toFixed(1));
    beadClear.setAttribute("cy", c1y.toFixed(1));
    beadClear.setAttribute("opacity", click > 0.05 && click < 0.3 ? "1" : "0");
    const ring = clamp01((click - 0.27) / 0.24);
    ripple.setAttribute("rx", (2 + ring * 16).toFixed(1));
    ripple.setAttribute("ry", (1 + ring * 8).toFixed(1));
    ripple.setAttribute("opacity", ring > 0 && ring < 1 ? (1 - ring).toFixed(2) : "0");
    const [c2x, c2y] = beadAt(paths.mask.artX, clamp01((click - 0.5) / 0.14), paths.mask.z + 1);
    beadArt.setAttribute("cx", c2x.toFixed(1));
    beadArt.setAttribute("cy", c2y.toFixed(1));
    beadArt.setAttribute("opacity", click > 0.5 && click < 0.88 ? "1" : "0");

    // ---- Saves: card in, drawer shut, no wires.
    const save = loop(t, 3.4);
    move(drawer, [0, 16 * during(save, 0.02, 0.86, 0.2), 0]);
    const { x: bx, y: by, z: bz } = paths.box;
    const inU = clamp01((save - 0.14) / 0.4);
    if (inU > 0 && inU < 1) {
      card.setAttribute("d", flat([bx, by + 9, lerp(bz + 40, bz, smooth(inU))], 34, 10));
      card.setAttribute("opacity", (smooth(inU / 0.2) * (1 - smooth((inU - 0.85) / 0.15))).toFixed(2));
    } else card.setAttribute("opacity", "0");
    lamp("saved", save > 0.56 && save < 0.96 ? "good" : "off");

    // ---- Results flow along every conduit, all the time.
    flows.forEach(({ route, phase, dot }) => {
      const v = loop(t, 1.5, phase);
      const [px, py] = project(along(route, v));
      dot.setAttribute("cx", px.toFixed(1));
      dot.setAttribute("cy", py.toFixed(1));
      dot.setAttribute("opacity", (smooth(v / 0.1) * (1 - smooth((v - 0.9) / 0.1))).toFixed(2));
    });

    return [
      `quartz window list · window ${scanned} of 3 · bounds only, no pixels`,
      `state: ${STATES[stateNow]} · next action after 14 s at least (balanced)`,
      u >= 0.1 && u < 0.18 ? "target too close to the edge · clamped 25 pt inside" : "arc = line + 4h · p(1 − p)",
      fps === 60 ? "she's awake · 60 fps" : fps === 15 ? "she's asleep · 15 fps" : "window hidden · scene paused",
      click < 0.42 ? "clear pixel · the click passes to the app below" : click < 0.62 ? "checking the alpha mask · 96 × 101 grid" : "her artwork · the click is hers",
      "cookie-store.json · atomic write · no account, no cloud",
    ][station] ?? "";
  };
};

/** Crimson Gate: one crank turns everything, a stop pin caps the frame time, and the frame is thrown onto the screen. */
const lantern: Mount = (svg, figure) => {
  const paths = figure.paths as {
    toward: Point3; shaft: { x0: number; y: number; z: number }; wheel: { x: number; r: number }; cams: number[]; dt: { x: number; y: number; z: number; R: number };
    hp: { x0: number; x1: number; y: number; z0: number; z1: number }; screen: { x0: number; x1: number; y: number; z0: number; z1: number }; lens: Point3; lensR: number; axis: Point3;
    forest: { z: number; spots: [number, number][]; x: number; y: number; w: number; d: number }; lever: { x: number; y: number; z: number; length: number };
    carousel: { x: number; y: number; z: number; r: number }; meterStep: number; faders: { name: string; level: number; x: number; y0: number; y1: number; z: number }[];
    tin: { x: number; y: number; z: number; away: number }; routes: Record<string, Point3[]>;
  };
  const project = projector(figure.P);
  const move = mover(figure.P);
  const lamp = lamps(svg);
  const q = (s: string) => svg.querySelector(s);
  const slot = (name: string) => q(`[data-slot='${name}']`) ?? undefined;

  const spokes = make("path", { class: "iso-line", "data-tone": "mid", style: "stroke-width:1" }, slot("wheel"));
  const needle = q("[data-dt-needle]");
  // Cams are drawn live, each a closed profile in the plane across the shaft.
  const camShapes = paths.cams.map((_, i) => {
    const host = q(`[data-cam='${i}']`) ?? undefined;
    return { back: make("path", { class: "fg-cam-side" }, host), face: make("path", { class: "fg-cam" }, host) };
  });
  const followers = paths.cams.map((_, i) => q(`[data-follower='${i}']`));
  const followerLamps = paths.cams.map((_, i) => q(`[data-follower-lamp='${i}']`));
  const lampBase = followerLamps.map((el) => Number(el?.getAttribute("cy") ?? 0));
  const hp = q("[data-hp]");
  const ENEMY = ["IDLE", "WALK", "STRAFE", "MAINTAIN_DISTANCE", "ATTACK", "RETREAT", "HURT"];

  // Trees all go down, and come back, on a single pull.
  const trees = Array.from(svg.querySelectorAll("[data-tree]")).map((el) => ({ el, x: el.getAttribute("data-x"), y: el.getAttribute("data-y"), s: Number(el.getAttribute("data-s")) }));
  const leverRod = q("[data-lever]");
  const leverKnob = q("[data-lever-knob]");

  // Beam: soft planes from the lens to the four corners of the cloth, under the lens barrel.
  const beamHost = slot("beam");
  const defs = make("defs", {}, beamHost);
  const [lx, ly] = project(paths.lens);
  const { x0, x1, y: sy, z0, z1 } = paths.screen;
  const corners = ([[x0, sy, z0], [x1, sy, z0], [x1, sy, z1], [x0, sy, z1]] as Point3[]).map(project);
  const mid = project([(x0 + x1) / 2, sy, (z0 + z1) / 2]);
  const beamGrad = make("linearGradient", { id: "ln-beam", gradientUnits: "userSpaceOnUse", x1: lx, y1: ly, x2: mid[0], y2: mid[1] }, defs);
  [["0", "#fff6da", .62], [".35", "#d6f0e6", .26], ["1", "#9fdcd0", .07]].forEach(([offset, color, opacity]) => make("stop", { offset, "stop-color": color, "stop-opacity": opacity }, beamGrad));
  const beamD = `M${lx.toFixed(1)} ${ly.toFixed(1)}L${corners.map(d2).join("L")}Z`;
  const beam = make("path", { d: beamD, fill: "url(#ln-beam)", opacity: 0 }, beamHost);
  const beamEdges = make("path", { d: [corners[0], corners[3]].map((c) => `M${lx.toFixed(1)} ${ly.toFixed(1)}L${d2(c)}`).join(""), fill: "none", stroke: "#e8fff4", "stroke-width": .5, opacity: 0 }, beamHost);
  const motes = Array.from({ length: 14 }, () => make("circle", { r: .9, fill: "#fff6da", opacity: 0 }, beamHost));
  const picture = q("[data-picture]");
  const raw = q("[data-raw]");

  // Petals: a fixed pool. They leave the ring, cross the forest and come back. None is ever created.
  const petalHost = slot("petals");
  const carouselHost = slot("carousel");
  const POOL = 24;
  const petals = Array.from({ length: POOL }, () => make("ellipse", { rx: 2.5, ry: 1.5, fill: "#ff9db0", stroke: "#7a2b3a", "stroke-width": .3 }, petalHost));
  const pegs = make("path", { class: "iso-line", "data-tone": "lo", fill: "none" }, carouselHost);

  // Mixing desk: a level meter beside each fader.
  const meters = paths.faders.map((_, i) => make("path", { class: "fg-meter", "stroke-width": 2, fill: "none", "stroke-linecap": "round" }, slot(`meter-${i}`)));

  // The tin: cards from outside, stamped with a version.
  const cardsHost = slot("cards");
  const good = make("path", { class: "fg-paper", opacity: 0 }, cardsHost);
  const bad = make("path", { fill: "#ff5243", opacity: 0 }, cardsHost);
  const upright = (x: number, y: number, z: number, w: number, h: number) => `M${([[x - w / 2, y, z], [x + w / 2, y, z], [x + w / 2, y, z + h], [x - w / 2, y, z + h]] as Point3[]).map((c) => d2(project(c))).join("L")}Z`;

  const flows = Object.values(paths.routes).flatMap((route, r) => [0, 0.5].map((phase) => ({ route, phase: phase + r * 0.17, dot: make("circle", { r: 2.4, fill: "var(--machine-accent, #ff5243)", opacity: 0 }, slot("pulse")) })));

  return (t, station) => {
    const spin = t * 7;

    // ---- The loop: flywheel flat out, needle ticking near 16.7 ms, and every so often a slow frame slams into the pin at 100.
    const { x: wx, r: wr } = paths.wheel, { y: wy, z: wz } = paths.shaft;
    let d = "";
    for (let i = 0; i < 6; i++) {
      const a = spin + (i / 6) * Math.PI * 2;
      d += `M${d2(project([wx, wy + Math.cos(a) * 4, wz + Math.sin(a) * 4]))}L${d2(project([wx, wy + Math.cos(a) * wr, wz + Math.sin(a) * wr]))}`;
    }
    spokes.setAttribute("d", d);
    const hitch = during(loop(t, 3.4), 0.5, 0.8, 0.05);
    const steady = 16.7 + Math.sin(t * 11) * 1.1;
    const dtShown = lerp(steady, 100, hitch) + (hitch > 0.98 ? Math.sin(t * 34) * 1.2 : 0);
    const dtA = (Math.min(100, dtShown) / 300) * Math.PI * 2;
    const { x: dx, y: dy, z: dz, R } = paths.dt;
    needle?.setAttribute("d", `M${d2(project([dx - Math.sin(dtA) * 4, dy + Math.cos(dtA) * 4, dz]))}L${d2(project([dx + Math.sin(dtA) * R, dy - Math.cos(dtA) * R, dz]))}`);

    // ---- Combat and AI: cams turn with the shaft, and the third changes as the boss loses health and is fought again.
    const hpU = loop(t, 7);
    const health = 1 - smooth(hpU / 0.8) * 0.82 + smooth((hpU - 0.86) / 0.14) * 0.82;
    const phaseIndex = health > 0.7 ? 0 : health > 0.35 ? 1 : 2;
    paths.cams.forEach((x, i) => {
      const lobes = i === 2 ? phaseIndex + 1 : 1;
      const a0 = spin * (i === 2 ? 0.8 : 0.62 + i * 0.13);
      const profile = (a: number) => 11 + (i === 2 ? 3.6 : 4.4) * Math.cos((a - a0) * lobes);
      const ring = (at: number) => {
        let path = "";
        for (let n = 0; n < 36; n++) {
          const a = (n / 36) * Math.PI * 2;
          const r = profile(a);
          path += `${n ? "L" : "M"}${d2(project([at, wy + Math.cos(a) * r, wz + Math.sin(a) * r]))}`;
        }
        return `${path}Z`;
      };
      camShapes[i].back.setAttribute("d", ring(x - 3));
      camShapes[i].face.setAttribute("d", ring(x + 3));
      const lift = profile(Math.PI / 2) - 11;
      move(followers[i], [0, 0, lift]);
      const lamped = followerLamps[i];
      if (lamped) lamped.setAttribute("cy", (lampBase[i] - lift * 0.866 * (figure.P.scale * Math.SQRT2 * 0.894)).toFixed(1));
      lamp(`cam-${i}`, lift > 2 ? (i === 2 ? "bad" : "on") : "off");
    });
    const { x0: hx0, x1: hx1, y: hy, z0: hz0, z1: hz1 } = paths.hp;
    const hz = lerp(hz0, hz1, health);
    hp?.setAttribute("d", `M${([[hx0, hy, hz0], [hx1, hy, hz0], [hx1, hy, hz], [hx0, hy, hz]] as Point3[]).map((c) => d2(project(c))).join("L")}Z`);
    [0, 1, 2].forEach((i) => lamp(`phase-${i}`, i === phaseIndex ? "bad" : "off"));

    // ---- World: the lever keeps pulling, and every tree dips and returns on the same pull. One mesh, one draw call.
    const treeU = loop(t, 3.8);
    const a = lerp(0.5, -0.45, during(treeU, 0.02, 0.6, 0.1));
    const { x: vx, y: vy, z: vz, length } = paths.lever;
    const top: Point3 = [vx + Math.sin(a) * length, vy, vz + Math.cos(a) * length];
    leverRod?.setAttribute("d", `M${d2(project([vx, vy, vz]))}L${d2(project(top))}`);
    const knob = project(top);
    leverKnob?.setAttribute("cx", knob[0].toFixed(1));
    leverKnob?.setAttribute("cy", knob[1].toFixed(1));
    const dip = during(treeU, 0.08, 0.26, 0.08);
    const pop = treeU > 0.22 && treeU < 0.36 ? 1 + Math.sin(((treeU - 0.22) / 0.14) * Math.PI) * 0.09 : 1;
    trees.forEach(({ el, x, y, s }) => el.setAttribute("transform", `translate(${x} ${y}) scale(${(s * (1 - dip) * pop).toFixed(3)})`));
    // Petals stream out of the ring, over the forest and back. The same 24, for ever.
    const { x: cx, y: cy, z: cz, r: cr } = paths.carousel;
    const ringA = t * 1.1;
    petals.forEach((petal, i) => {
      const slotA = (i / POOL) * Math.PI * 2 + ringA;
      const home: Point3 = [cx + Math.cos(slotA) * cr, cy + Math.sin(slotA) * cr, cz + 0.4];
      const fly = clamp01((loop(t, 3.2, i / POOL) - 0.15) / 0.85);
      let at = home;
      if (fly > 0 && fly < 1) {
        const away: Point3 = [paths.forest.x + hash(i + 5) * paths.forest.w, paths.forest.y + hash(i + 17) * paths.forest.d, 30 + hash(i + 29) * 26];
        const swing = Math.sin(fly * Math.PI);
        const pass = fly < 0.5 ? lerp3(home, away, smooth(fly * 2)) : lerp3(away, home, smooth((fly - 0.5) * 2));
        at = [pass[0] + Math.sin(t * 4 + i) * 3 * swing, pass[1], pass[2] + 16 * swing + Math.sin(t * 5 + i * 2) * 2 * swing];
      }
      const [px, py] = project(at);
      petal.setAttribute("cx", px.toFixed(1));
      petal.setAttribute("cy", py.toFixed(1));
      petal.setAttribute("transform", `rotate(${Math.round((t * 140 + i * 47) % 360)} ${px.toFixed(1)} ${py.toFixed(1)})`);
    });

    // ---- The lantern never goes out. Each pass of the shutter shows the raw frame getting its tone mapping.
    const flicker = 0.94 + Math.sin(spin * 1.6) * 0.06;
    beam.setAttribute("opacity", flicker.toFixed(3));
    beamEdges.setAttribute("opacity", "0.28");
    motes.forEach((mote, i) => {
      const u = (t * (0.12 + hash(i) * 0.1) + hash(i + 40)) % 1;
      const sway = hash(i + 70) - 0.5;
      const c = corners[i % 4];
      mote.setAttribute("cx", lerp(lx, lerp(mid[0], c[0], sway + 0.5), u).toFixed(1));
      mote.setAttribute("cy", lerp(ly, lerp(mid[1], c[1], sway + 0.5), u).toFixed(1));
      mote.setAttribute("opacity", (Math.sin(u * Math.PI) * 0.8).toFixed(2));
    });
    picture?.setAttribute("opacity", flicker.toFixed(3));
    const renderU = loop(t, 5.2);
    raw?.setAttribute("opacity", (during(renderU, 0, 0.3, 0.12) * 0.4).toFixed(3));

    // ---- Five real bus levels, and meters that never stop moving.
    meters.forEach((meter, i) => {
      const { x, y0, y1, z, level } = paths.faders[i];
      const y = lerp(y0, y1, level * (0.62 + 0.38 * Math.abs(Math.sin(t * (4.4 + i * 1.1) + i))));
      meter.setAttribute("d", `M${d2(project([x + 7.5, y0, z]))}L${d2(project([x + 7.5, y, z]))}`);
    });

    // ---- Saves: a good card goes in, a damaged one is refused, and the game still starts.
    const save = loop(t, 3.8);
    const { x: tx, y: ty, z: tz, away } = paths.tin;
    const inU = clamp01(save / 0.36), badU = clamp01((save - 0.46) / 0.34);
    good.setAttribute("d", upright(tx, ty, lerp(tz + away, tz - 16, smooth(inU)), 18, 16));
    good.setAttribute("opacity", inU > 0 && inU < 1 ? smooth(inU / 0.2).toFixed(2) : "0");
    const sink = badU < 0.45 ? smooth(badU / 0.45) : 1 - smooth((badU - 0.45) / 0.55);
    bad.setAttribute("d", upright(tx + (badU > 0.45 ? (badU - 0.45) * 30 : 0), ty, lerp(tz + away, tz + 2, sink), 18, 16));
    bad.setAttribute("opacity", badU > 0 && badU < 1 ? (1 - smooth((badU - 0.72) / 0.28)).toFixed(2) : "0");
    lamp("save", badU > 0.3 && badU < 1 ? "bad" : inU >= 1 ? "good" : "off");

    flows.forEach(({ route, phase, dot }) => {
      const v = loop(t, 1.5, phase);
      const [px, py] = project(along(route, v));
      dot.setAttribute("cx", px.toFixed(1));
      dot.setAttribute("cy", py.toFixed(1));
      dot.setAttribute("opacity", (smooth(v / 0.1) * (1 - smooth((v - 0.9) / 0.1))).toFixed(2));
    });

    return [
      hitch > 0.5 ? "a slow frame · dt stopped at 100 ms" : `requestAnimationFrame · dt ${steady.toFixed(1)} ms`,
      `yokai ${ENEMY[Math.floor(t * 1.4) % ENEMY.length]} · oni ${Math.round(health * 100)}% hp · phase ${phaseIndex + 1} of 3`,
      treeU < 0.45 ? "instancedmesh · one mesh, every tree" : "particle pool · petals reused, none created",
      renderU < 0.5 ? "three.js · aces filmic tone mapping" : "pixel ratio capped at 2 · frame on the cloth",
      paths.faders.map((bus) => `${bus.name} ${bus.level}`).join(" · "),
      badU > 0.2 ? "bad json or missing fields · save reset, game still starts" : "localstorage · version 1 · checked on load",
    ][station] ?? "";
  };
};

export const drivers: Record<string, Mount> = { roaster, referee, fieldcase, automaton, lantern };

