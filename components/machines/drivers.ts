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

export const drivers: Record<string, Mount> = { roaster, referee, fieldcase };
