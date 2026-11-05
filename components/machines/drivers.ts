import { clamp01, envelope, hash, lamps, lerp, lerp3, make, mixColor, mover, projector, schedule, smooth, type Figure, type Point3, type Pose, type StationTiming } from "@/components/machines/runtime";

type Mount = (svg: SVGSVGElement, figure: Figure, stations: StationTiming[]) => Pose;

const GREEN_BEAN: [number, number, number] = [176, 150, 96];
const ROASTED: [number, number, number] = [74, 42, 24];
const DIMENSIONS = ["impact", "consistency", "quality", "community", "diversity", "experience", "activity", "bonuses"];
const SCORE = 531;
const BEANS = 20;

/** GitRoasted: username at the gate, data in the hopper, a score with no flame near it, then 20 commits into the fire. */
const roaster: Mount = (svg, figure, stations) => {
  const paths = figure.paths as {
    belt: { from: Point3; to: Point3 }; probeX: number; port: { center: Point3; r: number }; dial: { x: number; y: number; z: number; R: number };
    tray: { x: number; y: number; w: number; d: number; z: number }; burner: { x0: number; x1: number; y: number; z: number }; slatStep: number;
    cardRise: number; hopper: { x: number; y: number; neck: number }; chute: Point3[];
  };
  const project = projector(figure.P);
  const move = mover(figure.P);
  const lamp = lamps(svg);
  const { starts, total } = schedule(stations);
  const [tGate, tFetch, tScore, tBelt, tRoast, tParse, tSave] = starts;
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

  // Beans on the belt, tumbling behind the door glass, and landing in the tray.
  const beltSlot = svg.querySelector("[data-slot='beans-belt']");
  const beltBeans = Array.from({ length: BEANS }, () => make("ellipse", { rx: 3.9, ry: 2.7, fill: "none" }, beltSlot ?? undefined));
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

  return (now) => {
    const t = ((now % total) + total) % total;
    // Gate.
    const open = envelope(t, tGate + 0.2, tBelt + 2.4, 0.5);
    move(handle, [14 * open, 0, 0]);
    // Fetching fills the hopper, bean by bean.
    const fill = smooth((t - tFetch) / (stations[1].seconds * 0.8)) * (1 - smooth((t - (total - 0.8)) / 0.6));
    pile.forEach((bean, i) => {
      const show = fill * pile.length > i;
      if (bean.getAttribute("data-on") !== String(show)) { bean.setAttribute("data-on", String(show)); bean.setAttribute("opacity", show ? "1" : "0"); }
    });
    // Scoring: eight drawers in turn, one tap each, and the needle climbs. No flame anywhere yet.
    const scoreT = clamp01((t - tScore) / stations[2].seconds);
    const lit = scoreT * DIMENSIONS.length;
    DIMENSIONS.forEach((_, i) => lamp(String(i), t < total - 0.5 && t >= tScore && lit > i ? "on" : "off"));
    const tap = t >= tScore && t < tBelt ? Math.abs(Math.sin(lit * Math.PI)) : 0;
    move(plunger, [0, 0, 14 * (1 - smooth(1 - tap))]);
    const shown = smooth(scoreT) * SCORE * (1 - smooth((t - (total - 0.7)) / 0.6));
    const angle = (shown / 1000) * Math.PI * 2;
    const { x, y, z, R } = paths.dial;
    const tip = project([x + Math.sin(angle) * R, y - Math.cos(angle) * R, z]);
    const tail = project([x - Math.sin(angle) * 4, y + Math.cos(angle) * 4, z]);
    needle?.setAttribute("d", `M${tail[0].toFixed(1)} ${tail[1].toFixed(1)}L${tip[0].toFixed(1)} ${tip[1].toFixed(1)}`);
    // Commit messages ride the belt. At most 20 reach the model.
    const beltRun = t >= tBelt && t < tRoast + 0.5;
    if (beltRun) slats?.setAttribute("transform", `translate(${(((t - tBelt) * 1.6 % 1) * (beltAx - beltBx)).toFixed(2)} ${(((t - tBelt) * 1.6 % 1) * (beltAy - beltBy)).toFixed(2)})`);
    let onBelt = 0;
    beltBeans.forEach((bean, i) => {
      const age = t - tBelt - i * ((stations[3].seconds - 1.2) / BEANS);
      if (age < 0 || age > 1.5 || t >= tRoast + 0.6) { bean.setAttribute("opacity", "0"); return; }
      onBelt++;
      const drop = smooth(age / 0.22);
      const u = smooth(clamp01((age - 0.2) / 1.3));
      const along = lerp3(paths.belt.from, paths.belt.to, u);
      const [sx, sy] = project([along[0], (hash(i) - 0.5) * 12, along[2]]);
      const px = u === 0 ? lerp(neck[0], landing[0], drop) : sx;
      const py = u === 0 ? lerp(neck[1], landing[1], drop * drop) : sy;
      bean.setAttribute("cx", px.toFixed(1));
      bean.setAttribute("cy", py.toFixed(1));
      bean.setAttribute("fill", "rgb(176,150,96)");
      bean.setAttribute("stroke", "#1a100a");
      bean.setAttribute("stroke-width", "0.4");
      bean.setAttribute("transform", `rotate(${Math.round(hash(i + 7) * 170)} ${px.toFixed(1)} ${py.toFixed(1)})`);
      bean.setAttribute("opacity", "1");
    });
    // The burner lights only once the score is done, then the beans roast behind the glass.
    const flame = envelope(t, tRoast - 0.2, tParse + 0.4, 0.5);
    glow.setAttribute("opacity", flame.toFixed(3));
    tongues.forEach(({ base, element }, i) => {
      const flicker = 0.62 + 0.38 * Math.sin(t * (9 + hash(i) * 7) + i * 1.7);
      const h = (20 + hash(i + 20) * 16) * flame * flicker;
      if (h < 0.5) { element.setAttribute("d", ""); return; }
      const lean = Math.sin(t * 5 + i) * 2.2;
      const [bx, by] = base;
      element.setAttribute("d", `M${(bx - 3.4).toFixed(1)} ${by.toFixed(1)}C${(bx - 3.6).toFixed(1)} ${(by - h * 0.5).toFixed(1)} ${(bx + lean - 1).toFixed(1)} ${(by - h * 0.7).toFixed(1)} ${(bx + lean).toFixed(1)} ${(by - h).toFixed(1)}C${(bx + lean + 1).toFixed(1)} ${(by - h * 0.7).toFixed(1)} ${(bx + 3.6).toFixed(1)} ${(by - h * 0.5).toFixed(1)} ${(bx + 3.4).toFixed(1)} ${by.toFixed(1)}Z`);
    });
    heat?.setAttribute("opacity", (flame * 0.75).toFixed(3));
    const roast = smooth((t - tRoast) / stations[4].seconds);
    const [cx, cy] = project(paths.port.center);
    const inDrum = envelope(t, tRoast - 0.4, tParse + 0.5, 0.35);
    const beanColor = mixColor(GREEN_BEAN, ROASTED, roast);
    portBeans.forEach((bean, i) => {
      // Lifted by the drum's vanes, then falling: each bean rides the wall and drops through the middle.
      const phase = (t * 0.62 + hash(i)) % 1;
      const a = phase * Math.PI * 2 + hash(i + 11) * 0.8;
      // The door is a circle in the plane x = const, so its screen axes come straight from the camera.
      const reach = i % 3 === 0 ? 0.42 : 0.74;
      const fall = phase > 0.55 ? (phase - 0.55) / 0.45 : 0;
      const px = cx + Math.cos(a) * reach * doorX * (1 - fall * 0.35);
      const py = cy + Math.sin(a) * reach * doorZ + fall * 6;
      bean.setAttribute("cx", px.toFixed(1));
      bean.setAttribute("cy", py.toFixed(1));
      bean.setAttribute("fill", beanColor);
      bean.setAttribute("opacity", inDrum.toFixed(2));
      bean.setAttribute("transform", `rotate(${Math.round(t * 90 + i * 40) % 360} ${px.toFixed(1)} ${py.toFixed(1)})`);
    });
    // Down the chute and into the cooling tray.
    chuteBeans.forEach((bean, i) => {
      const u = (t - tParse - i * 0.12) / 0.7;
      if (u <= 0 || u >= 1) { bean.setAttribute("opacity", "0"); return; }
      const f = u * (chutePoints.length - 1);
      const n = Math.min(chutePoints.length - 2, Math.floor(f));
      const [ax, ay] = chutePoints[n], [bx, by] = chutePoints[n + 1];
      const px = lerp(ax, bx, f - n), py = lerp(ay, by, f - n);
      bean.setAttribute("cx", px.toFixed(1));
      bean.setAttribute("cy", py.toFixed(1));
      bean.setAttribute("opacity", "1");
    });
    const inTray = smooth((t - tParse - 0.2) / (stations[5].seconds - 0.2)) * (1 - smooth((t - (total - 0.7)) / 0.6));
    trayBeans.forEach((bean, i) => bean.setAttribute("opacity", inTray * trayBeans.length > i ? "1" : "0"));
    // One card per username: the same one is lifted and replaced.
    const rise = envelope(t, tSave + 0.1, tSave + stations[6].seconds - 0.05, 0.5);
    move(card, [0, 0, paths.cardRise * rise]);

    if (t < tFetch) return "username · 1–39 chars · checked with Zod";
    if (t < tScore) return `github · profile, repos, events · ${Math.round(fill * 100)}%`;
    if (t < tBelt) return `${DIMENSIONS[Math.min(DIMENSIONS.length - 1, Math.floor(lit))]} · ${Math.min(DIMENSIONS.length, Math.floor(lit) + 1)} of 8 · ${Math.round(shown)} / 1000`;
    if (t < tRoast) return `commit messages on the belt · ${Math.min(BEANS, Math.max(onBelt, Math.ceil(((t - tBelt) / (stations[3].seconds - 1.2)) * BEANS)))} of ${BEANS} max`;
    if (t < tParse) return `groq · json mode · roast ${Math.round(roast * 100)}%`;
    if (t < tSave) return "json extracted · roast + leaderboard line";
    return "firestore · one entry per username · upserted";
  };
};

/** AI Checkers Arena: the tape rebuilds the board, only legal moves are offered, and the comb decides what counts. */
const referee: Mount = (svg, figure, stations) => {
  const paths = figure.paths as {
    tape: { x: number; y: number; d: number; z: number; w: number; pitch: number; rows: { x: number; holes: number[] }[] };
    mover: { from: [number, number]; to: [number, number]; lift: number; z: number }; taken: [number, number];
    legal: [number, number][]; cell: number; boardZ: number; clock: { x: number; y: number; z: number; R: number };
    card: { from: Point3; mid: Point3; in: Point3; w: number; h: number };
  };
  const project = projector(figure.P);
  const move = mover(figure.P);
  const lamp = lamps(svg);
  const { starts, total } = schedule(stations);
  const [tLog, tRules, tAsk, tRetry, tMove, tSave] = starts;
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
  const attempt = (t: number, from: number, seconds: number) => {
    const u = clamp01((t - from) / seconds);
    if (u <= 0 || u >= 1) return false;
    const travel = smooth(u / 0.62);
    const drop = smooth((u - 0.62) / 0.3);
    const at = drop > 0 ? lerp3(paths.card.mid, paths.card.in, drop) : lerp3(paths.card.from, paths.card.mid, travel);
    drawCard(at, smooth(u / 0.1) * (1 - smooth((u - 0.9) / 0.1)));
    return true;
  };

  return (now) => {
    const t = ((now % total) + total) % total;
    // The whole log replays on every turn, then one new row at the end.
    const scrolling = smooth((t - tLog) / stations[0].seconds);
    const saving = smooth((t - tSave) / stations[5].seconds);
    move(tapeGroup, [lerp(-paths.tape.pitch * 8, 0, scrolling) + paths.tape.pitch * saving, 0, 0]);
    lamp("reader", t < tRules || (t >= tSave && t < total - 0.2) ? "on" : "off");
    // Legal moves are worked out before the model is asked anything.
    const legal = envelope(t, tRules + 0.1, tMove + 0.5, 0.35);
    squares.forEach((square) => square.setAttribute("opacity", (legal * 0.5).toFixed(2)));
    // The 60 s clock runs while the model answers. The dial is slowed for the eye, not to scale.
    const asking = t >= tAsk && t < tMove;
    const seconds = asking ? (t - tAsk) * 3.2 : 0;
    const angle = (seconds / 60) * Math.PI * 2;
    const { x, y, z, R } = paths.clock;
    const tip = project([x + Math.sin(angle) * R, y - Math.cos(angle) * R, z]);
    const tail = project([x - Math.sin(angle) * 4, y + Math.cos(angle) * 4, z]);
    hand?.setAttribute("d", `M${tail[0].toFixed(1)} ${tail[1].toFixed(1)}L${tip[0].toFixed(1)} ${tip[1].toFixed(1)}`);
    // Attempts: the first answer is illegal, the second passes.
    const first = attempt(t, tAsk, stations[2].seconds - 0.2);
    const second = attempt(t, tRetry, stations[3].seconds - 0.2);
    if (!first && !second) { cardPath.setAttribute("opacity", "0"); cardLine.setAttribute("opacity", "0"); }
    const judged1 = t >= tAsk + (stations[2].seconds - 0.2) * 0.86;
    const judged2 = t >= tRetry + (stations[3].seconds - 0.2) * 0.86;
    lamp("attempt-0", t < tAsk ? "off" : judged1 ? "bad" : "on");
    lamp("attempt-1", t < tRetry ? "off" : judged2 ? "good" : "on");
    lamp("attempt-2", "off");
    lamp("comb", judged2 && t < tMove + 1 ? "good" : judged1 && t < tRetry ? "bad" : "off");
    // The gantry makes the move. The model never touches a piece.
    const m = clamp01((t - tMove) / stations[4].seconds);
    const down = (from: number, to: number) => smooth((m - from) / (to - from));
    const grip = down(0, 0.22) * (1 - down(0.34, 0.46));
    const place = down(0.74, 0.88) * (1 - down(0.92, 1));
    const lowered = t >= tMove && t < tSave ? Math.max(grip, place) : 0;
    const across = down(0.42, 0.74);
    const done = t >= tSave;
    const travel = done ? 1 - smooth((t - (total - 1)) / 0.9) : across;
    const carried = t >= tMove ? travel : 0;
    move(bridge, [dx * carried, 0, 0]);
    move(head, [dx * carried, dy * carried, 0]);
    move(rod, [dx * carried, dy * carried, 12 * (1 - lowered)]);
    const lift = t >= tMove && m > 0.34 && m < 0.88 ? 16 * Math.min(smooth((m - 0.34) / 0.1), 1 - smooth((m - 0.76) / 0.1)) : 0;
    const placed = t >= tSave ? 1 : across;
    move(piece, [dx * placed, dy * placed, lift]);
    const gone = 1 - smooth((m - 0.74) / 0.12);
    taken?.setAttribute("opacity", (t >= tMove ? gone : 1).toFixed(2));

    if (t < tRules) return `move log · replaying ply ${Math.round(scrolling * 24)}`;
    if (t < tAsk) return `rules engine · ${paths.legal.length} legal moves · only those are offered`;
    if (t < tRetry) return judged1 ? "attempt 1 of 3 · illegal · rejected" : "attempt 1 of 3 · temperature 0.10";
    if (t < tMove) return judged2 ? "attempt 2 of 3 · legal · accepted" : "attempt 2 of 3 · temperature 0.25";
    if (t < tSave) return "move applied by the server";
    return "postgres · move, reasoning, latency, tokens";
  };
};

/** GigSense: the sum and the evidence stay on the device. The radio only ever carries a paper slip. */
const fieldcase: Mount = (svg, figure, stations) => {
  const paths = figure.paths as {
    calc: { screen: { x: number; y: number; w: number; d: number }; z: number }; floor: number; evidenceFrom: Point3; evidenceTo: Point3;
    slip: { from: Point3; mid: Point3; in: Point3 }; conduit: Point3[]; mast: Point3; replyAt: Point3; keys: [number, number][]; keyZ: number;
  };
  const project = projector(figure.P);
  const lamp = lamps(svg);
  const { starts, total } = schedule(stations);
  const [tOffline, tCalc, tStore, tSend, tReply] = starts;
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
  const replyHost = svg.querySelector("[data-reply]");
  const reply = make("path", { class: "fg-paper", opacity: 0 }, replyHost ?? undefined);
  const replyMark = make("path", { class: "iso-line", "data-tone": "green", opacity: 0, style: "stroke-width:1.4" }, replyHost ?? undefined);
  const waveHost = svg.querySelector("[data-slot='waves']");
  const [mx, my] = project(paths.mast);
  const waves = [0, 1, 2].map(() => make("ellipse", { cx: mx.toFixed(1), cy: my.toFixed(1), fill: "none", stroke: "#ff5243", "stroke-width": 0.9, opacity: 0 }, waveHost ?? undefined));
  const conduit = paths.conduit.map(project);
  const flatCard = (at: Point3, w: number, d: number) => `M${([[at[0] - w / 2, at[1] - d / 2, at[2]], [at[0] + w / 2, at[1] - d / 2, at[2]], [at[0] + w / 2, at[1] + d / 2, at[2]], [at[0] - w / 2, at[1] + d / 2, at[2]]] as Point3[]).map((c) => project(c).map((v) => v.toFixed(1)).join(" ")).join("L")}Z`;

  return (now) => {
    const t = ((now % total) + total) % total;
    // Signal: gone for the local work, back only for the AI step.
    const signal = t < tOffline + 1.2 ? 1 - smooth((t - tOffline) / 1.2) : smooth((t - tSend + 0.4) / 0.8);
    bars.forEach((bar, i) => { const on = signal * 4 > i + 0.25; if (bar.getAttribute("data-state") !== String(on)) bar.setAttribute("data-state", String(on)); });
    // The sum runs with the radio dead.
    const sum = clamp01((t - tCalc) / stations[1].seconds);
    displayRows.forEach((row, i) => {
      const u = smooth((sum - i * 0.28) / 0.34) * (1 - smooth((t - (total - 0.7)) / 0.6));
      const y = screen.y + 5 + i * ((screen.d - 10) / 2);
      const a = project([screen.x + 4, y, paths.calc.z]), b = project([screen.x + 4 + (screen.w - 8) * rows[i] * u, y, paths.calc.z]);
      row.setAttribute("d", `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
    });
    keyDots.forEach((dot, i) => {
      const cycle = (t - tCalc) * 3.6;
      const pick = Math.floor(hash(Math.floor(cycle) + 3) * keyDots.length);
      dot.setAttribute("opacity", t >= tCalc && t < tStore && pick === i ? (0.95 * (1 - (cycle % 1))).toFixed(2) : "0");
    });
    const printed = sum * receipt.length * (1 - smooth((t - (total - 0.7)) / 0.6));
    receipt.forEach((line, i) => line.setAttribute("opacity", printed > i ? "1" : "0"));
    // Evidence goes down into a tray and stays there.
    const store = clamp01((t - tStore) / stations[2].seconds);
    if (store > 0 && store < 1) {
      const at = lerp3(paths.evidenceFrom, paths.evidenceTo, smooth(store / 0.8));
      const d = flatCard(at, 22, 15);
      file.setAttribute("d", d);
      fileEdge.setAttribute("d", d);
      const opacity = smooth(store / 0.12) * (1 - smooth((store - 0.88) / 0.12));
      file.setAttribute("opacity", opacity.toFixed(2));
      fileEdge.setAttribute("opacity", opacity.toFixed(2));
    } else {
      file.setAttribute("opacity", "0");
      fileEdge.setAttribute("opacity", "0");
    }
    // Only a slip of text goes through the slot, along the conduit and out of the mast.
    const send = clamp01((t - tSend) / stations[3].seconds);
    lamp("slot", send > 0 && send < 1 ? "on" : "off");
    if (send > 0 && send < 0.42) {
      const at = send < 0.22 ? lerp3(paths.slip.from, paths.slip.mid, smooth(send / 0.22)) : lerp3(paths.slip.mid, paths.slip.in, smooth((send - 0.22) / 0.2));
      slip.setAttribute("d", flatCard(at, 26, 4));
      slip.setAttribute("opacity", (smooth(send / 0.05) * (1 - smooth((send - 0.36) / 0.06))).toFixed(2));
    } else slip.setAttribute("opacity", "0");
    const inPipe = send >= 0.4 && send < 0.66 ? (send - 0.4) / 0.26 : -1;
    const returning = t >= tReply && t < tReply + 0.9 ? (t - tReply) / 0.9 : -1;
    const travel = inPipe >= 0 ? inPipe : returning >= 0 ? 1 - returning : -1;
    if (travel >= 0) {
      pulse.setAttribute("cx", lerp(conduit[0][0], conduit[1][0], travel).toFixed(1));
      pulse.setAttribute("cy", lerp(conduit[0][1], conduit[1][1], travel).toFixed(1));
      pulse.setAttribute("opacity", "1");
    } else pulse.setAttribute("opacity", "0");
    // Waves out, then waves back in.
    const outgoing = send > 0.62 && send < 1;
    const incoming = t >= tReply - 0.2 && t < tReply + 0.6;
    waves.forEach((wave, i) => {
      const clock = (t * 0.9 + i / 3) % 1;
      const u = incoming ? 1 - clock : clock;
      wave.setAttribute("rx", (8 + u * 46).toFixed(1));
      wave.setAttribute("ry", (4 + u * 22).toFixed(1));
      wave.setAttribute("opacity", outgoing || incoming ? (0.75 * (1 - u) * smooth(u / 0.1)).toFixed(2) : "0");
    });
    // The structured reply lands, checked, before anything reaches the screen.
    const landed = smooth((t - tReply - 0.8) / 0.5) * (1 - smooth((t - (total - 0.7)) / 0.6));
    reply.setAttribute("d", flatCard(paths.replyAt, 34, 30));
    reply.setAttribute("opacity", landed.toFixed(2));
    const a = project([paths.replyAt[0] - 6, paths.replyAt[1] + 1, paths.replyAt[2]]), b = project([paths.replyAt[0] - 1, paths.replyAt[1] + 6, paths.replyAt[2]]), c = project([paths.replyAt[0] + 9, paths.replyAt[1] - 7, paths.replyAt[2]]);
    replyMark.setAttribute("d", `M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}L${c[0].toFixed(1)} ${c[1].toFixed(1)}`);
    replyMark.setAttribute("opacity", (smooth((t - tReply - 1.2) / 0.3) * (1 - smooth((t - (total - 0.7)) / 0.6))).toFixed(2));

    if (t < tCalc) return signal > 0 ? "signal fading · app shell cached" : "no signal · app still running";
    if (t < tStore) return "pay − vehicle cost · on the device · no network";
    if (t < tSend) return "indexeddb · 3 stores · 0 files uploaded";
    if (t < tReply) return "text description only · files stay on the device";
    return "structured json · parsed before the ui sees it";
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
const automaton: Mount = (svg, figure, stations) => {
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
  const { starts, total } = schedule(stations);
  const [tScan, tPick, tJump, tFrames, tClick, tSave] = starts;
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
  const back = slot("gov-back"), front = slot("gov-front");
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
  const pulse = make("circle", { r: 2.6, fill: "var(--machine-accent, #ff5243)", opacity: 0 }, slot("pulse"));
  const hand: [string, number][] = [["scanToDrum", tPick], ["drumToBoard", tJump], ["boardToGov", tFrames], ["govToMask", tClick], ["maskToBox", tSave]];

  return (now) => {
    const t = ((now % total) + total) % total;
    const fadeOut = 1 - smooth((t - (total - 0.7)) / 0.6);

    // ---- Scan: the arm visits each corner in turn. It never looks at a face.
    const scan = clamp01((t - tScan) / stations[0].seconds);
    const f = scan * touches.length;
    const n = Math.min(touches.length - 1, Math.floor(f));
    const home: Point3 = [paths.rail.x0 + 30, paths.rail.y, paths.rail.z - 18];
    const from = n === 0 ? home : touches[n - 1].at;
    const to = touches[n].at;
    const hop = smooth((f - n) / 0.7);
    const reading = t < tPick ? lerp3(from, to, hop) : lerp3(touches[touches.length - 1].at, home, smooth((t - tPick) / 0.8));
    const lifted: Point3 = [reading[0], reading[1], reading[2] + 7 * Math.sin(Math.PI * (t < tPick ? hop : 0))];
    move(carriage, [lifted[0], 0, 0]);
    arm.setAttribute("d", `M${d2(project([lifted[0], paths.rail.y, paths.rail.z]))}L${d2(project(lifted))}`);
    const [tx, ty] = project(lifted);
    tip.setAttribute("cx", tx.toFixed(1));
    tip.setAttribute("cy", ty.toFixed(1));
    touches.forEach(({ id }, i) => brackets.get(id)?.setAttribute("opacity", t < tPick + 0.5 && f > i + 0.7 ? "1" : (t < tPick + 1 && f > i + 0.7 ? (1 - smooth((t - tPick - 0.5) / 0.5)).toFixed(2) : "0")));
    const scanned = Math.min(3, Math.ceil(f / 2));

    // ---- Pick: the drum turns, pins lift tines, and the lamp shows the state it landed on.
    const spin = t * 0.9;
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
    // What she's doing, across the whole tour.
    const stateNow = t < tPick + 0.8 ? 0 : t < tJump ? 1 : t < tFrames ? 2 : t < tClick - 0 ? 4 : t < tClick + stations[4].seconds * 0.62 ? 4 : 0;
    STATES.forEach((_, i) => lamp(`state-${i}`, i === stateNow ? "on" : "off"));
    // The cooldown runs down: there's a minimum wait between autonomous actions.
    const cool = t >= tPick && t < tJump ? 1 - clamp01((t - tPick) / stations[1].seconds) : 1;
    const coolA = cool * (14 / 28) * Math.PI * 2;
    const { x: cx, y: cy, z: cz, R: cR } = paths.cool;
    coolNeedle?.setAttribute("d", `M${d2(project([cx, cy, cz]))}L${d2(project([cx + Math.sin(coolA) * cR, cy - Math.cos(coolA) * cR, cz]))}`);

    // ---- Jump: plotted on the board, clamped, then flown for real along the same formula.
    const jump = clamp01((t - tJump) / stations[2].seconds);
    const { dock, dockEnd, w3, w3Raw, w2 } = paths.cat;
    const clamp = smooth((jump - 0.04) / 0.14);
    const aim = lerp3(w3Raw, w3, clamp);
    corridor?.setAttribute("opacity", (envelope(t, tJump, tFrames - 0.5, 0.3)).toFixed(2));
    const leapA = clamp01((jump - 0.2) / 0.28), leapB = clamp01((jump - 0.62) / 0.26);
    const home2 = clamp01((t - (total - 1.15)) / 0.95);
    arcGhost.setAttribute("d", arcD(dockEnd, w3Raw, APEX_A, 1));
    arcGhost.setAttribute("opacity", (envelope(t, tJump + 0.05, tJump + stations[2].seconds * 0.24, 0.2)).toFixed(2));
    if (jump > 0 && jump < 1 || (t >= tFrames && t < tFrames + 0.5)) {
      arcLine.setAttribute("d", (jump < 0.2 ? arcD(dockEnd, aim, APEX_A, 1) : jump < 0.56 ? arcD(dockEnd, w3, APEX_A, 1) : "") + (jump > 0.56 ? arcD(w3, w2, APEX_B, 1) : ""));
      arcLine.setAttribute("opacity", (t < tFrames ? 1 : 1 - smooth((t - tFrames) / 0.5)).toFixed(2));
    } else arcLine.setAttribute("opacity", "0");
    const penU = jump < 0.56 ? leapA : leapB;
    const [gx, gy] = project([lerp(paths.board.x0, paths.board.x1, penU), paths.board.y, paths.board.z0 + 4 * paths.board.h * penU * (1 - penU)]);
    pen.setAttribute("cx", gx.toFixed(1));
    pen.setAttribute("cy", gy.toFixed(1));
    pen.setAttribute("opacity", jump > 0 && jump < 1 ? "1" : "0");

    // Where she is, and which pose.
    let at: Point3, pose = 0, flip = 1, ground = 0;
    if (t < tPick) at = dock;
    else if (t < tJump) { at = lerp3(dock, dockEnd, smooth((t - tPick - 0.8) / (stations[1].seconds - 1))); flip = -1; }
    else if (jump < 0.2) at = dockEnd;
    else if (jump < 0.48) { at = hump(dockEnd, w3, APEX_A, leapA); pose = 1; ground = 1; }
    else if (jump < 0.62) at = w3;
    else if (jump < 0.88) { at = hump(w3, w2, APEX_B, leapB); pose = 1; flip = -1; ground = 1; }
    else at = w2;
    const asleepFrom = tFrames + 0.9;
    const awakeAt = tClick + stations[4].seconds * 0.62;
    if (t >= tFrames) at = w2;
    if (t >= asleepFrom && t < awakeAt) pose = 2;
    if (home2 > 0) { at = hump(w2, dock, APEX_C, home2); pose = home2 < 1 ? 1 : 0; flip = 1; ground = home2 < 1 ? 1 : 0; }
    const [ax, ay] = project(at);
    const bob = pose === 0 && t >= tPick && t < tJump ? Math.abs(Math.sin(t * 9)) * 1.1 : 0;
    catHost.setAttribute("transform", `translate(${ax.toFixed(1)} ${(ay - bob).toFixed(1)}) scale(${(flip * 1.32).toFixed(2)} 1.32)`);
    poses.forEach((g, i) => g.setAttribute("opacity", i === pose ? "1" : "0"));
    shadow.setAttribute("cx", ax.toFixed(1));
    shadow.setAttribute("cy", (ay + 0.6).toFixed(1));
    shadow.setAttribute("opacity", ground ? "0" : "0.22");
    zees.forEach((z, i) => {
      const u = ((t * 0.45 + i / 3) % 1);
      const on = pose === 2;
      z.setAttribute("x", (ax + 6 + u * 12 + i).toFixed(1));
      z.setAttribute("y", (ay - 22 - u * 20).toFixed(1));
      z.setAttribute("opacity", on ? (Math.sin(u * Math.PI) * 0.95).toFixed(2) : "0");
    });

    // ---- Frames: 60 awake, 15 asleep, and stopped when her window is hidden. The clock here is slowed for the eye.
    const hidden = tFrames + stations[3].seconds * 0.74;
    const fps = t < asleepFrom ? 60 : t < hidden ? 15 : t < tClick ? 0 : t < awakeAt ? 15 : 60;
    const speedOf = (v: number) => v / 60 * 12;
    const phase = (() => {
      const a = Math.min(t, asleepFrom) * speedOf(60);
      const b = Math.max(0, Math.min(t, hidden) - asleepFrom) * speedOf(15);
      const c = Math.max(0, Math.min(t, awakeAt) - tClick) * speedOf(15);
      const e = Math.max(0, t - awakeAt) * speedOf(60);
      return a + b + c + e;
    })();
    const rising = t < asleepFrom ? 1 : t < hidden ? 1 - smooth((t - asleepFrom) / 0.6) * 0.72 : t < tClick ? 0.28 - smooth((t - hidden) / 0.4) * 0.28 : t < awakeAt ? smooth((t - tClick) / 0.5) * 0.28 : 0.28 + smooth((t - awakeAt) / 0.6) * 0.72;
    const swing = 0.3 + rising * 0.78;
    const { x: gvx, y: gvy, top } = paths.gov;
    const armLen = 26;
    const drop = Math.cos(swing) * armLen;
    const reach = Math.sin(swing) * armLen;
    const sleeveZ = top - drop * 1.72 - paths.gov.sleeve;
    move(sleeve, [0, 0, sleeveZ - 11]);
    balls.forEach(({ g, arm: rod, link, ball }, i) => {
      const a = phase + i * Math.PI;
      const dx = Math.cos(a), dy = Math.sin(a);
      const b: Point3 = [gvx + dx * reach, gvy + dy * reach, top - drop];
      const mid: Point3 = [gvx + dx * reach * 0.5, gvy + dy * reach * 0.5, top - drop * 0.5];
      rod.setAttribute("d", `M${d2(project([gvx, gvy, top]))}L${d2(project(b))}`);
      link.setAttribute("d", `M${d2(project(mid))}L${d2(project([gvx, gvy, paths.gov.sleeve + sleeveZ - 11 + 3]))}`);
      const [bx, by] = project(b);
      ball.setAttribute("cx", bx.toFixed(1));
      ball.setAttribute("cy", by.toFixed(1));
      const behind = dx * toward[0] + dy * toward[1] < 0;
      const host = behind ? back : front;
      if (host && g.parentElement !== host) host.appendChild(g);
    });
    lamp("fps-60", fps === 60 ? "good" : "off");
    lamp("fps-15", fps === 15 ? "on" : "off");
    lamp("fps-0", fps === 0 ? "bad" : "off");

    // ---- Clicks: one on a clear pixel falls through to the app. One on her artwork stays with her.
    const click = clamp01((t - tClick) / stations[4].seconds);
    const beadAt = (x: number, u: number, floor: number) => project([x, paths.mask.y, lerp(paths.mask.nozzle, floor, u * u)]);
    const firstU = clamp01((click - 0.12) / 0.2), secondU = clamp01((click - 0.5) / 0.12);
    const dropX = click < 0.42 ? paths.mask.clearX : t < tClick ? paths.mask.clearX : lerp(paths.mask.clearX, paths.mask.artX, smooth((click - 0.34) / 0.14));
    move(dropper, [dropX, 0, 0]);
    const [c1x, c1y] = beadAt(paths.mask.clearX, firstU, paths.mask.floor);
    beadClear.setAttribute("cx", c1x.toFixed(1));
    beadClear.setAttribute("cy", c1y.toFixed(1));
    beadClear.setAttribute("opacity", click > 0.12 && click < 0.34 ? "1" : "0");
    const ring = clamp01((click - 0.32) / 0.22);
    ripple.setAttribute("rx", (2 + ring * 16).toFixed(1));
    ripple.setAttribute("ry", (1 + ring * 8).toFixed(1));
    ripple.setAttribute("opacity", ring > 0 && ring < 1 ? (1 - ring).toFixed(2) : "0");
    const [c2x, c2y] = beadAt(paths.mask.artX, secondU, paths.mask.z + 1);
    beadArt.setAttribute("cx", c2x.toFixed(1));
    beadArt.setAttribute("cy", c2y.toFixed(1));
    beadArt.setAttribute("opacity", click > 0.5 && click < 0.92 ? "1" : "0");

    // ---- Save: a card, one drawer, no wires.
    const save = clamp01((t - tSave) / stations[5].seconds);
    const out = envelope(t, tSave, tSave + stations[5].seconds * 0.82, 0.35);
    move(drawer, [0, 16 * out, 0]);
    const { x: bx, y: by, z: bz } = paths.box;
    const inU = clamp01((save - 0.14) / 0.4);
    if (inU > 0 && inU < 1) {
      const height = lerp(bz + 40, bz, smooth(inU));
      card.setAttribute("d", flat([bx, by + 9, height], 34, 10));
      card.setAttribute("opacity", (smooth(inU / 0.2) * (1 - smooth((inU - 0.85) / 0.15))).toFixed(2));
    } else card.setAttribute("opacity", "0");
    lamp("saved", save > 0.56 && fadeOut > 0.5 ? "good" : "off");

    // ---- Hand-offs along the floor.
    let shown = false;
    for (const [name, start] of hand) {
      const u = (t - (start - 0.55)) / 0.8;
      if (u > 0 && u < 1) {
        const [px, py] = project(along(paths.routes[name], u));
        pulse.setAttribute("cx", px.toFixed(1));
        pulse.setAttribute("cy", py.toFixed(1));
        shown = true;
      }
    }
    pulse.setAttribute("opacity", shown ? "1" : "0");

    if (t < tPick) return `quartz window list · window ${scanned} of 3 · bounds only, no pixels`;
    if (t < tJump) return `state: ${STATES[stateNow]} · next action after 14 s at least (balanced)`;
    if (t < tFrames) return jump < 0.2 ? "target too close to the edge · clamped 25 pt inside" : "arc = line + 4h · p(1 − p)";
    if (t < tClick) return fps === 60 ? "she's awake · 60 fps" : fps === 15 ? "she's asleep · 15 fps" : "window hidden · scene paused";
    if (t < tSave) return click < 0.42 ? "clear pixel · the click passes to the app below" : click < 0.62 ? "checking the alpha mask · 96 × 101 grid" : "her artwork · the click is hers, and she wakes";
    return "cookie-store.json · atomic write · no account, no cloud";
  };
};

/** Crimson Gate: one crank turns everything, a stop pin caps the frame time, and the frame is thrown onto the screen. */
const lantern: Mount = (svg, figure, stations) => {
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
  const { starts, total } = schedule(stations);
  const [tLoop, tCombat, tWorld, tRender, tAudio, tSave] = starts;
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

  const pulse = make("circle", { r: 2.6, fill: "var(--machine-accent, #ff5243)", opacity: 0 }, slot("pulse"));
  const hand: [string, number][] = [["shaftToBoss", tCombat], ["shaftToLever", tWorld], ["lampToDesk", tAudio], ["deskToTin", tSave]];

  return (now) => {
    const t = ((now % total) + total) % total;
    const spin = t * 5.2;
    const fadeOut = 1 - smooth((t - (total - 0.7)) / 0.6);

    // ---- Loop: flywheel and dt. A hitch throws the needle round, and the pin stops it at 100 ms.
    const { x: wx, r: wr } = paths.wheel, { y: wy, z: wz } = paths.shaft;
    let d = "";
    for (let i = 0; i < 6; i++) {
      const a = spin + (i / 6) * Math.PI * 2;
      d += `M${d2(project([wx, wy + Math.cos(a) * 4, wz + Math.sin(a) * 4]))}L${d2(project([wx, wy + Math.cos(a) * wr, wz + Math.sin(a) * wr]))}`;
    }
    spokes.setAttribute("d", d);
    const loop = clamp01((t - tLoop) / stations[0].seconds);
    const hitch = envelope(t, tLoop + stations[0].seconds * 0.38, tLoop + stations[0].seconds * 0.8, 0.14);
    const steady = 16.7 + Math.sin(t * 11) * 1.1;
    const dtShown = lerp(steady, 100, hitch) + (hitch > 0.98 ? Math.sin(t * 34) * 1.2 : 0);
    const dtA = (Math.min(100, dtShown) / 300) * Math.PI * 2;
    const { x: dx, y: dy, z: dz, R } = paths.dt;
    needle?.setAttribute("d", `M${d2(project([dx - Math.sin(dtA) * 4, dy + Math.cos(dtA) * 4, dz]))}L${d2(project([dx + Math.sin(dtA) * R, dy - Math.cos(dtA) * R, dz]))}`);

    // ---- Combat and AI: cams turn with the shaft, and the third one changes as the boss loses health.
    const combat = clamp01((t - tCombat) / stations[1].seconds);
    const health = 1 - smooth(combat / 0.9) * 0.82 + smooth((t - (total - 0.8)) / 0.7) * 0.82;
    const phaseIndex = health > 0.7 ? 0 : health > 0.35 ? 1 : 2;
    const toward = paths.toward;
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

    // ---- World: one pull and every tree is set at once. Same mesh, one draw call.
    const world = clamp01((t - tWorld) / stations[2].seconds);
    const pull = envelope(t, tWorld + 0.1, tWorld + stations[2].seconds * 0.5, 0.3);
    const a = lerp(0.5, -0.45, pull);
    const { x: vx, y: vy, z: vz, length } = paths.lever;
    const top: Point3 = [vx + Math.sin(a) * length, vy, vz + Math.cos(a) * length];
    leverRod?.setAttribute("d", `M${d2(project([vx, vy, vz]))}L${d2(project(top))}`);
    const knob = project(top);
    leverKnob?.setAttribute("cx", knob[0].toFixed(1));
    leverKnob?.setAttribute("cy", knob[1].toFixed(1));
    const gone = t >= tWorld ? smooth(world / 0.1) * (1 - smooth((world - 0.24) / 0.1)) : 0;
    const scale = 1 - gone;
    const pop = world > 0.24 && world < 0.42 ? 1 + Math.sin(((world - 0.24) / 0.18) * Math.PI) * 0.08 : 1;
    trees.forEach(({ el, x, y, s }) => el.setAttribute("transform", `translate(${x} ${y}) scale(${(s * scale * pop).toFixed(3)})`));
    const { x: cx, y: cy, z: cz, r: cr } = paths.carousel;
    const ringA = t * 0.5;
    let pegD = "";
    petals.forEach((petal, i) => {
      const slotA = (i / POOL) * Math.PI * 2 + ringA;
      const home: Point3 = [cx + Math.cos(slotA) * cr, cy + Math.sin(slotA) * cr, cz + 0.4];
      if (i < POOL) pegD += `M${d2(project(home))}`;
      const delay = (i / POOL) * 0.34;
      const u = clamp01((world - 0.4 - delay) / 0.46);
      let at = home;
      if (u > 0 && u < 1 && t >= tWorld) {
        const fx = paths.forest.x + hash(i + 5) * paths.forest.w;
        const fy = paths.forest.y + hash(i + 17) * paths.forest.d;
        const away: Point3 = [fx, fy, 30 + hash(i + 29) * 26];
        const swing = Math.sin(u * Math.PI);
        const pass = u < 0.5 ? lerp3(home, away, smooth(u * 2)) : lerp3(away, home, smooth((u - 0.5) * 2));
        at = [pass[0] + Math.sin(t * 3 + i) * 3 * swing, pass[1], pass[2] + 16 * swing + Math.sin(t * 4 + i * 2) * 2 * swing];
      }
      const [px, py] = project(at);
      petal.setAttribute("cx", px.toFixed(1));
      petal.setAttribute("cy", py.toFixed(1));
      petal.setAttribute("transform", `rotate(${Math.round((t * 80 + i * 47) % 360)} ${px.toFixed(1)} ${py.toFixed(1)})`);
    });
    pegs.setAttribute("d", "");

    // ---- Render: the lamp comes up, the raw frame gets its tone mapping, and it stays until the tour ends.
    const render = clamp01((t - tRender) / stations[3].seconds);
    const up = envelope(t, tRender, tAudio + 0.1, 0.5);
    const flicker = 0.93 + Math.sin(spin * 1.6) * 0.07;
    beam.setAttribute("opacity", (up * flicker).toFixed(3));
    beamEdges.setAttribute("opacity", (up * 0.28).toFixed(3));
    motes.forEach((mote, i) => {
      const u = ((t * (0.05 + hash(i) * 0.05) + hash(i + 40)) % 1);
      const sway = (hash(i + 70) - 0.5);
      const c = corners[i % 4];
      const px = lerp(lx, lerp(mid[0], c[0], sway + 0.5), u);
      const py = lerp(ly, lerp(mid[1], c[1], sway + 0.5), u);
      mote.setAttribute("cx", px.toFixed(1));
      mote.setAttribute("cy", py.toFixed(1));
      mote.setAttribute("opacity", (up * Math.sin(u * Math.PI) * 0.8).toFixed(2));
    });
    // A dim frame is left on the cloth between runs, so the screen is never just a black rectangle.
    picture?.setAttribute("opacity", Math.max(0.22, up * flicker).toFixed(3));
    raw?.setAttribute("opacity", (t >= tRender && t < tAudio ? (1 - smooth((render - 0.28) / 0.34)) * 0.55 : 0).toFixed(3));

    // ---- Audio: five real bus levels, and meters that move with the mix.
    const audio = envelope(t, tAudio, tSave + 0.2, 0.3);
    meters.forEach((meter, i) => {
      const { x, y0, y1, z, level } = paths.faders[i];
      const beat = 0.62 + 0.38 * Math.abs(Math.sin(t * (3.2 + i * 0.9) + i));
      const y = lerp(y0, y1, level * beat * audio);
      meter.setAttribute("d", audio > 0.01 ? `M${d2(project([x + 7.5, y0, z]))}L${d2(project([x + 7.5, y, z]))}` : "");
    });

    // ---- Save: a good card goes in, a damaged one is refused, and the game still starts.
    const save = clamp01((t - tSave) / stations[5].seconds);
    const { x: tx, y: ty, z: tz, away } = paths.tin;
    const inU = clamp01(save / 0.36), badU = clamp01((save - 0.46) / 0.34);
    good.setAttribute("d", upright(tx, ty, lerp(tz + away, tz - 16, smooth(inU)), 18, 16));
    good.setAttribute("opacity", inU > 0 && inU < 1 ? (smooth(inU / 0.2)).toFixed(2) : "0");
    const dip = badU < 0.45 ? smooth(badU / 0.45) : 1 - smooth((badU - 0.45) / 0.55);
    bad.setAttribute("d", upright(tx + (badU > 0.45 ? (badU - 0.45) * 30 : 0), ty, lerp(tz + away, tz + 2, dip), 18, 16));
    bad.setAttribute("opacity", badU > 0 && badU < 1 ? (1 - smooth((badU - 0.72) / 0.28)).toFixed(2) : "0");
    lamp("save", save <= 0 || fadeOut < 0.5 ? "off" : badU > 0.3 && badU < 1 ? "bad" : inU >= 1 ? "good" : "off");

    let shown = false;
    for (const [name, start] of hand) {
      const u = (t - (start - 0.5)) / 0.8;
      if (u > 0 && u < 1) {
        const [px, py] = project(along(paths.routes[name], u));
        pulse.setAttribute("cx", px.toFixed(1));
        pulse.setAttribute("cy", py.toFixed(1));
        shown = true;
      }
    }
    pulse.setAttribute("opacity", shown ? "1" : "0");

    if (t < tCombat) return hitch > 0.5 ? "a slow frame · dt stopped at 100 ms" : `requestAnimationFrame · dt ${steady.toFixed(1)} ms`;
    if (t < tWorld) return `yokai ${ENEMY[Math.floor(t * 1.4) % ENEMY.length]} · oni ${Math.round(health * 100)}% hp · phase ${phaseIndex + 1} of 3`;
    if (t < tRender) return world < 0.4 ? "instancedmesh · one mesh, every tree" : "particle pool · petals reused, none created";
    if (t < tAudio) return render < 0.5 ? "three.js · aces filmic tone mapping" : "pixel ratio capped at 2 · frame on the cloth";
    if (t < tSave) return paths.faders.map((bus) => `${bus.name} ${bus.level}`).join(" · ");
    return badU > 0.2 ? "bad json or missing fields · save reset, game still starts" : "localstorage · version 1 · checked on load";
  };
};

export const drivers: Record<string, Mount> = { roaster, referee, fieldcase, automaton, lantern };

