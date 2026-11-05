/**
 * The Kasif signature, written the way a calligrapher's hand writes it.
 *
 * Each stroke is a list of points the pen passes through. The geometry below turns them into:
 * - a smooth centre line,
 * - a varying pen width: pressure on the downstrokes, hairlines on the way up, tapered ends,
 * - a varying pen speed: the two-thirds power law of human movement, so the hand flies through
 *   the long sweeps and slows into the tight letters.
 *
 * It has no DOM or React dependencies, so it can be rendered and reviewed on its own.
 */

export type Point = readonly [number, number];
/** `parts` join at sharp pen turns; within a part the line is smooth. `lift` is the pen's time in the air after it, in ms. */
type StrokeSpec = { parts: Point[][]; taperIn: number; taperOut: number; weight?: number; lift: number };

export const SIGNATURE_VIEWBOX = { x: 20, y: 14, width: 656, height: 300 };

const SPECS: StrokeSpec[] = [
  // K: an entry swash that rises from low on the left, turns at the top, and falls as the long stem.
  {
    taperIn: 80,
    taperOut: 100,
    lift: 34,
    parts: [
      [[96, 216], [58, 200], [32, 164], [40, 118], [84, 84], [146, 60], [206, 44], [252, 24]],
      [[252, 24], [230, 72], [206, 124], [182, 178], [160, 230], [140, 276], [124, 308]]
    ]
  },
  // K's arm and leg, flowing without a lift through a, s, i and the looped f, whose descender
  // swings back under the name and runs out to the right as the closing flourish.
  {
    taperIn: 50,
    taperOut: 190,
    lift: 30,
    parts: [
      [[378, 34], [336, 70], [284, 108], [236, 138], [198, 154]],
      [[198, 154], [218, 158], [236, 176], [250, 198], [268, 210], [290, 202], [312, 180], [330, 156]],
      [[330, 156], [312, 148], [292, 156], [282, 176], [288, 197], [305, 198], [322, 180], [336, 152]],
      [[336, 152], [328, 182], [332, 200], [348, 198], [366, 176], [384, 148]],
      [[384, 148], [392, 170], [388, 192], [372, 204], [356, 200]],
      [[356, 200], [376, 201], [398, 186], [414, 158]],
      [[414, 158], [406, 186], [410, 202], [426, 197], [446, 170], [470, 118], [490, 66], [500, 36], [492, 22], [478, 36], [460, 92], [442, 158], [424, 222], [410, 264], [396, 292], [374, 306], [336, 300], [288, 276], [246, 250], [240, 238], [254, 232], [284, 232], [344, 236], [420, 236], [506, 226], [592, 208], [666, 180]]
    ]
  },
  // The dot of the i, a quick flick.
  { taperIn: 3, taperOut: 7, weight: 0.8, lift: 40, parts: [[[426, 138], [430, 133], [436, 126]]] }
];

/** The brand's red full stop, like the KASIF. wordmark. */
export const FULL_STOP = { x: 466, y: 198, r: 5.2 };

const HAIRLINE = 1.55;
const PEN_MAX = 6.6;
/** The slant of the pen's downstroke: pressing along this direction swells the line. */
const SLANT = (() => { const l = Math.hypot(-0.38, 0.92); return [-0.38 / l, 0.92 / l] as const; })();
const SAMPLE_STEP = 2.2;
const SMOOTH_RADIUS = 5;
const SMOOTH_PASSES = 3;
/** How far before and after a sharp turn the pen starts lightening. */
const TURN_EASE = 16;
/** Thinnest ink, so tapered tips stay a clean line instead of breaking into dots. */
const MIN_WIDTH = 0.42;

export type SignatureStroke = {
  /** Centre line samples. */
  xs: Float32Array;
  ys: Float32Array;
  /** Pen width at each sample. */
  widths: Float32Array;
  /** Time at each sample within the stroke, 0 to 1, following the hand's natural speed. */
  times: Float32Array;
  length: number;
  /** Writing time relative to the other strokes, before scaling to the total duration. */
  weight: number;
  lift: number;
};

/** Centripetal Catmull-Rom through the points, so sweeps stay round without overshooting. */
function spline(points: readonly Point[], out: [number, number][]) {
  const at = (i: number): Point => {
    if (i >= 0 && i < points.length) return points[i];
    // Mirror past the ends so a stroke leaves its first and last points along their own direction.
    const [a, b] = i < 0 ? [points[0], points[1]] : [points[points.length - 1], points[points.length - 2]];
    return [2 * a[0] - b[0], 2 * a[1] - b[1]];
  };
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const d = (a: Point, b: Point) => Math.max(1e-3, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])));
    const t1 = d(p0, p1), t2 = t1 + d(p1, p2), t3 = t2 + d(p2, p3);
    const steps = Math.max(6, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 1.5));
    for (let s = i === 0 && out.length === 0 ? 0 : 1; s <= steps; s++) {
      const t = t1 + ((t2 - t1) * s) / steps;
      const lerp = (a: Point, b: Point, ta: number, tb: number): Point => {
        const k = (t - ta) / (tb - ta);
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
      };
      const a1 = lerp(p0, p1, 0, t1), a2 = lerp(p1, p2, t1, t2), a3 = lerp(p2, p3, t2, t3);
      const b1 = lerp(a1, a2, 0, t2), b2 = lerp(a2, a3, t1, t3);
      out.push([...lerp(b1, b2, t1, t2)] as [number, number]);
    }
  }
}

function smooth(values: Float32Array, radius: number) {
  const out = new Float32Array(values.length);
  for (let i = 0; i < values.length; i++) {
    let sum = 0, weights = 0;
    for (let j = -radius; j <= radius; j++) {
      const v = values[Math.min(values.length - 1, Math.max(0, i + j))];
      const w = radius + 1 - Math.abs(j);
      sum += v * w; weights += w;
    }
    out[i] = sum / weights;
  }
  return out;
}

/** Even samples along one part of a stroke, with hand-placement kinks smoothed out. Its two ends stay exactly put. */
function samplePart(points: readonly Point[]) {
  const raw: [number, number][] = [];
  spline(points, raw);
  const px: number[] = [raw[0][0]], py: number[] = [raw[0][1]];
  let carried = 0;
  for (let i = 1; i < raw.length; i++) {
    let [ax, ay] = raw[i - 1];
    const [bx, by] = raw[i];
    let seg = Math.hypot(bx - ax, by - ay);
    while (carried + seg >= SAMPLE_STEP) {
      const k = (SAMPLE_STEP - carried) / seg;
      ax += (bx - ax) * k; ay += (by - ay) * k;
      px.push(ax); py.push(ay);
      seg = Math.hypot(bx - ax, by - ay);
      carried = 0;
    }
    carried += seg;
  }
  px.push(raw[raw.length - 1][0]); py.push(raw[raw.length - 1][1]);
  // The window narrows toward the ends, so sharp pen turns stay sharp while the curves between them flow.
  let xs = px, ys = py;
  for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
    const nx = xs.slice(), ny = ys.slice();
    for (let i = 1; i < xs.length - 1; i++) {
      const radius = Math.min(SMOOTH_RADIUS, i, xs.length - 1 - i);
      let sx = 0, sy = 0;
      for (let d = -radius; d <= radius; d++) { sx += xs[i + d]; sy += ys[i + d]; }
      nx[i] = sx / (2 * radius + 1); ny[i] = sy / (2 * radius + 1);
    }
    xs = nx; ys = ny;
  }
  return { xs, ys };
}

function buildStroke(spec: StrokeSpec): SignatureStroke {
  const xs: number[] = [], ys: number[] = [];
  const turns: number[] = [];
  spec.parts.forEach((part, index) => {
    const sampled = samplePart(part);
    // Each part starts where the last ended, so drop the repeated point.
    xs.push(...sampled.xs.slice(index ? 1 : 0)); ys.push(...sampled.ys.slice(index ? 1 : 0));
    if (index < spec.parts.length - 1) turns.push(xs.length - 1);
  });

  const n = xs.length;
  const length = (n - 1) * SAMPLE_STEP;
  const pressure = new Float32Array(n);
  const curvature = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(0, i - 2), b = Math.min(n - 1, i + 2);
    const dx = xs[b] - xs[a], dy = ys[b] - ys[a], l = Math.hypot(dx, dy) || 1;
    const along = (dx / l) * SLANT[0] + (dy / l) * SLANT[1];
    pressure[i] = Math.pow(Math.max(0, along), 1.7);
    if (i > 0 && i < n - 1) {
      const ax = xs[i] - xs[i - 1], ay = ys[i] - ys[i - 1], bx = xs[i + 1] - xs[i], by = ys[i + 1] - ys[i];
      curvature[i] = Math.abs(ax * by - ay * bx) / (SAMPLE_STEP * SAMPLE_STEP * SAMPLE_STEP);
    }
  }
  const eased = smooth(pressure, 9);
  const bend = smooth(curvature, 5);

  const widths = new Float32Array(n);
  const times = new Float32Array(n);
  const penMax = PEN_MAX * (spec.weight ?? 1);
  let elapsed = 0;
  for (let i = 0; i < n; i++) {
    const s = i * SAMPLE_STEP;
    const taper = Math.pow(Math.min(1, s / spec.taperIn), 0.72) * Math.pow(Math.min(1, (length - s) / spec.taperOut), 0.82);
    // The pen lightens as it turns, which leaves a crisp point instead of a blunt corner.
    const nearest = turns.reduce((best, turn) => Math.min(best, Math.abs(turn - i) * SAMPLE_STEP), Infinity);
    const turning = 0.34 + 0.66 * Math.min(1, nearest / TURN_EASE);
    widths[i] = Math.max(MIN_WIDTH, (HAIRLINE + (penMax - HAIRLINE) * eased[i]) * taper * turning);
    // Two-thirds power law: speed grows with the radius of the curve, so time per sample grows with curvature.
    if (i > 0) elapsed += Math.pow(Math.max(bend[i], 0.0009), 1 / 3);
    times[i] = elapsed;
  }
  for (let i = 0; i < n; i++) times[i] /= elapsed || 1;

  return { xs: Float32Array.from(xs), ys: Float32Array.from(ys), widths, times, length, weight: elapsed, lift: spec.lift };
}

export const SIGNATURE_STROKES: SignatureStroke[] = SPECS.map(buildStroke);

/** The filled outline of a stroke up to a sample, as SVG path data. */
export function strokeOutline(stroke: SignatureStroke, upTo: number) {
  const { xs, ys, widths } = stroke;
  const last = Math.min(upTo, xs.length - 1);
  if (last < 1) return "";
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i <= last; i++) {
    const a = Math.max(0, i - 1), b = Math.min(xs.length - 1, i + 1);
    const dx = xs[b] - xs[a], dy = ys[b] - ys[a], l = Math.hypot(dx, dy) || 1;
    const h = widths[i] / 2, nx = (-dy / l) * h, ny = (dx / l) * h;
    left.push(`${(xs[i] + nx).toFixed(2)} ${(ys[i] + ny).toFixed(2)}`);
    right.push(`${(xs[i] - nx).toFixed(2)} ${(ys[i] - ny).toFixed(2)}`);
  }
  return `M${left.join("L")}L${right.reverse().join("L")}Z`;
}

/** A slice of the centre line, as SVG path data, for the red light running ahead of the pen. */
export function strokeSlice(stroke: SignatureStroke, from: number, to: number) {
  const end = Math.min(to, stroke.xs.length - 1);
  const parts: string[] = [];
  for (let i = Math.max(0, from); i <= end; i++) parts.push(`${stroke.xs[i].toFixed(2)} ${stroke.ys[i].toFixed(2)}`);
  return parts.length > 1 ? `M${parts.join("L")}` : "";
}

/** The sample the pen has reached at time u (0 to 1) within a stroke. */
export function sampleAt(stroke: SignatureStroke, u: number) {
  const { times } = stroke;
  let low = 0, high = times.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (times[mid] <= u) low = mid; else high = mid - 1;
  }
  return low;
}

/** When each stroke starts and how long it runs, in ms, to fill the total writing time. */
export function strokeTimeline(totalMs: number) {
  const lifts = SIGNATURE_STROKES.reduce((sum, s) => sum + s.lift, 0);
  const weight = SIGNATURE_STROKES.reduce((sum, s) => sum + s.weight, 0);
  let at = 0;
  return SIGNATURE_STROKES.map((stroke) => {
    const ms = ((totalMs - lifts) * stroke.weight) / weight;
    const entry = { at, ms };
    at += ms + stroke.lift;
    return entry;
  });
}
