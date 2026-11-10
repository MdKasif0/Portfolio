/**
 * The theme switch: the new theme spreads over the old one like ink dropped in water.
 *
 * A view transition captures the page in both themes. The new capture is clipped to a region that
 * grows from the toggle. Each point on screen gets an arrival time, its distance from the toggle
 * divided by a speed made of noise: broad lobes, finer ripples, thin fast ridges that shoot ahead as
 * tendrils, and thin slow veins that are left behind as streaks of the old theme. Every frame the
 * region where the arrival time has passed is traced with marching squares and set as the clip path,
 * so islands ahead of the edge and holes behind it come and go on their own.
 */

const DURATION = 1650;

/* Seeded gradient noise, so every switch spreads in a new shape. */
function makeNoise(seed: number) {
  let s = seed >>> 0 || 1;
  const random = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  const perm = new Uint8Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const gx = new Float32Array(8), gy = new Float32Array(8);
  for (let i = 0; i < 8; i++) { gx[i] = Math.cos((i * Math.PI) / 4); gy[i] = Math.sin((i * Math.PI) / 4); }
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const noise = (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const dot = (h: number, dx: number, dy: number) => gx[h & 7] * dx + gy[h & 7] * dy;
    const aa = dot(perm[perm[X] + Y], xf, yf);
    const ba = dot(perm[perm[X + 1] + Y], xf - 1, yf);
    const ab = dot(perm[perm[X] + Y + 1], xf, yf - 1);
    const bb = dot(perm[perm[X + 1] + Y + 1], xf - 1, yf - 1);
    const u = fade(xf), v = fade(yf);
    const top = aa + u * (ba - aa);
    return top + v * (ab + u * (bb - ab) - top);
  };
  const fbm = (x: number, y: number) => noise(x, y) + 0.5 * noise(x * 2.03 + 17.1, y * 2.03 - 9.4) + 0.25 * noise(x * 4.11 - 31.7, y * 4.11 + 5.2);
  return { noise, fbm };
}

type Field = { nx: number; ny: number; cell: number; ox: number; oy: number; arrival: Float32Array; sorted: Float32Array; key: string };

const FAR = 1e9;

function buildField(width: number, height: number, origin: { x: number; y: number }): Field {
  const { noise, fbm } = makeNoise(Math.floor(Math.random() * 2 ** 31));
  // About 55,000 grid points whatever the screen size: fine enough for thin tendrils, cheap enough per frame.
  const cell = Math.max(3.5, Math.sqrt((width * height) / 55000));
  const ox = -2 * cell, oy = -2 * cell;
  const nx = Math.ceil((width + 4 * cell) / cell) + 1;
  const ny = Math.ceil((height + 4 * cell) / cell) + 1;
  const arrival = new Float32Array(nx * ny);
  // Sizes in px, scaled a little with the screen so a phone gets the same character as a desktop.
  const scale = Math.min(1.25, Math.max(0.7, Math.hypot(width, height) / 1700));
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const index = j * nx + i;
      if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) { arrival[index] = FAR; continue; }
      const x = ox + i * cell, y = oy + j * cell;
      // Domain warp: bends every layer below into marbled, flowing shapes.
      const wx = fbm(x / (300 * scale), y / (300 * scale));
      const wy = fbm(x / (300 * scale) + 41.3, y / (300 * scale) - 12.9);
      const qx = (x + 120 * scale * wx) / scale, qy = (y + 120 * scale * wy) / scale;
      const dx = x - origin.x, dy = y - origin.y;
      const distance = Math.hypot(dx, dy);
      // Broad lobes by direction, so the ink runs further one way than another (smooth all round: no seam).
      const ux = distance ? dx / distance : 0, uy = distance ? dy / distance : 1;
      const reach = 1 + 0.32 * fbm(ux * 1.4 + 3.7, uy * 1.4 - 8.2);
      // The rest moves the edge by a fixed number of pixels, so the body stays whole and only its rim tears.
      const lobes = fbm(qx / 520, qy / 520);
      const ripples = fbm(qx / 150 + 7.7, qy / 150 + 3.1);
      const tendrils = (1 - Math.abs(noise(qx / 46 + 91.2, qy / 46 - 14.6))) ** 5;
      const veins = (1 - Math.abs(noise(qx / 70 - 23.4, qy / 70 + 61.8))) ** 6;
      // Right at the toggle the drop starts round; the texture grows in over the first few hundred px.
      const grow = Math.min(1, distance / (320 * scale));
      const rim = scale * (210 * lobes + 70 * ripples - 75 * tendrils + 55 * veins);
      const time = distance * reach + grow * rim;
      arrival[index] = time;
    }
  }
  // Sorted arrival times turn "how much of the screen is covered" into a threshold, so the easing
  // controls covered area directly and a few slow outliers can't stretch the timeline.
  const sorted = arrival.filter((time) => time < FAR).sort();
  return { nx, ny, cell, ox, oy, arrival, sorted, key: fieldKey(width, height, origin) };
}

/** Traces the region where arrival < t as one even-odd path: the main body, islands and holes. */
function makeTracer(field: Field) {
  const { nx, ny, cell, ox, oy, arrival } = field;
  const size = 2 * nx * ny;
  const linkA = new Int32Array(size).fill(-1);
  const linkB = new Int32Array(size).fill(-1);
  const px = new Float32Array(size), py = new Float32Array(size);
  const seen = new Uint8Array(size);
  const touched: number[] = [];

  return (t: number) => {
    for (const key of touched) { linkA[key] = -1; linkB[key] = -1; seen[key] = 0; }
    touched.length = 0;

    const point = (key: number) => {
      if (linkA[key] !== -1 || linkB[key] !== -1) return;
      const node = key >> 1;
      const i = node % nx, j = (node - i) / nx;
      const a = arrival[node];
      const b = key & 1 ? arrival[node + nx] : arrival[node + 1];
      const f = Math.min(1, Math.max(0, (t - a) / (b - a)));
      px[key] = ox + (i + (key & 1 ? 0 : f)) * cell;
      py[key] = oy + (j + (key & 1 ? f : 0)) * cell;
    };
    const link = (k1: number, k2: number) => {
      point(k1); point(k2);
      if (linkA[k1] === -1) { linkA[k1] = k2; touched.push(k1); } else linkB[k1] = k2;
      if (linkA[k2] === -1) { linkA[k2] = k1; touched.push(k2); } else linkB[k2] = k1;
    };

    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const n = j * nx + i;
        const ta = arrival[n], tb = arrival[n + 1], tc = arrival[n + nx + 1], td = arrival[n + nx];
        const code = (ta < t ? 1 : 0) | (tb < t ? 2 : 0) | (tc < t ? 4 : 0) | (td < t ? 8 : 0);
        if (code === 0 || code === 15) continue;
        const top = 2 * n, bottom = 2 * (n + nx), left = 2 * n + 1, right = 2 * (n + 1) + 1;
        switch (code) {
          case 1: case 14: link(left, top); break;
          case 2: case 13: link(top, right); break;
          case 3: case 12: link(left, right); break;
          case 4: case 11: link(right, bottom); break;
          case 6: case 9: link(top, bottom); break;
          case 7: case 8: link(bottom, left); break;
          case 5: case 10: {
            const centreIn = (ta + tb + tc + td) / 4 < t;
            if ((code === 5) === centreIn) { link(top, right); link(bottom, left); }
            else { link(left, top); link(right, bottom); }
          }
        }
      }
    }

    const parts: string[] = [];
    for (const start of touched) {
      if (seen[start]) continue;
      let previous = -1, current = start, first = true;
      while (current !== -1 && !seen[current]) {
        seen[current] = 1;
        parts.push(`${first ? "M" : "L"}${px[current].toFixed(1)} ${py[current].toFixed(1)}`);
        first = false;
        const next = linkA[current] !== previous ? linkA[current] : linkB[current];
        previous = current;
        current = next;
      }
      parts.push("Z");
    }
    return parts.length ? `path(evenodd, "${parts.join("")}")` : `path("M0 0Z")`;
  };
}

/** Share of the screen covered over time: a small bloom at the toggle, a fast middle, then a slow finish as the last streaks fill in. */
const coverage = (x: number) => x * x * (3 - 2 * x);

const fieldKey = (width: number, height: number, origin: { x: number; y: number }) => `${width}x${height}@${Math.round(origin.x)},${Math.round(origin.y)}`;

let prepared: Field | null = null;

/** Builds the field ahead of time (on hover or focus of the toggle), so the click starts at once. */
export function prepareInk(origin: { x: number; y: number }) {
  const key = fieldKey(window.innerWidth, window.innerHeight, origin);
  if (prepared?.key !== key) prepared = buildField(window.innerWidth, window.innerHeight, origin);
}

export async function inkReveal(origin: { x: number; y: number }, update: () => void) {
  const root = document.documentElement;
  const key = fieldKey(window.innerWidth, window.innerHeight, origin);
  const field = prepared?.key === key ? prepared : buildField(window.innerWidth, window.innerHeight, origin);
  prepared = null;
  const trace = makeTracer(field);
  const { sorted } = field;

  root.dataset.inkVt = "";
  const transition = document.startViewTransition(update);
  try {
    await transition.ready;
    const hidden = `path("M0 0Z")`;
    const animation = root.animate([{ clipPath: hidden }, { clipPath: hidden }], {
      duration: DURATION + 2000,
      fill: "forwards",
      pseudoElement: "::view-transition-new(root)"
    });
    const effect = animation.effect as KeyframeEffect;
    const start = performance.now();

    await new Promise<void>((resolve) => {
      const frame = (now: number) => {
        const progress = Math.min(1, (now - start) / DURATION);
        if (progress >= 1) {
          effect.setKeyframes([{ clipPath: "none" }, { clipPath: "none" }]);
          animation.finish();
          resolve();
          return;
        }
        const shape = trace(sorted[Math.min(sorted.length - 1, Math.floor(coverage(progress) * sorted.length))]);
        effect.setKeyframes([{ clipPath: shape }, { clipPath: shape }]);
        window.requestAnimationFrame(frame);
      };
      window.requestAnimationFrame(frame);
    });
    await transition.finished;
  } catch {
    // The browser skipped the transition, or can't animate it: the theme has still changed, just at once.
    transition.skipTransition();
  } finally {
    delete root.dataset.inkVt;
  }
}
