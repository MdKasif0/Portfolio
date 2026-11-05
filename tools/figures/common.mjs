// Dev-only: builds the machine drawings in public/figures with the Anatomy kit (MIT, see kit/LICENSE).
import * as k from "./kit/iso-kit.mjs";
import * as G from "./kit/lathe.mjs";

export { k, G };

/** Drawing helpers bound to one projection. */
export function drawer(P) {
  const S = (paths, style) => k.solidSvg(paths, style);
  const L = (d, style) => k.lineSvg(d, style);
  const at = (point) => k.iso(point, P);
  const D = (points, style) => k.dotsSvg(points.map(at), style);
  const byDepth = (points) => [...points].sort((a, b) => k.depthOf([a[0], a[1], a[2] ?? 0], P) - k.depthOf([b[0], b[1], b[2] ?? 0], P));
  const slab = (plan, z, h, tone = "mid", { steps = 3, bevel = 0.5, crease, inner } = {}) => S(k.slabOf(plan, z, h, P, steps, bevel), { tone, crease, inner });
  const post = (x, y, r, z, h, tone = "mid", steps = 20) => S(k.cylinder(x, y, r, z, h, P, steps), { tone, crease: "none" });
  const screws = (plan, inset, z, ring = 2) => {
    const pts = k.corners(plan, inset);
    return L(pts.map(([x, y]) => k.ring(x, y, ring, z, P, 14)).join(""), { tone: "lo" }) + D(pts.map(([x, y]) => [x, y, z]), { size: 0.5 });
  };
  /** The heavy bench every machine stands on: feet, bevelled plate, groove, corner screws, ruler and label plate. */
  const bench = (plan, { height = 12, feet = 5, ruler, label } = {}) => {
    const out = [`<path class="iso-halo" d="${k.haloOf(plan, -height - feet, height, P)}"/>`];
    for (const [x, y] of byDepth(k.corners(plan, 26))) {
      out.push(S(k.cylinder(x, y, 8, -height - feet, 1.6, P, 28), { tone: "lo" }));
      out.push(S(k.cylinder(x, y, 6.2, -height - feet + 1.6, feet - 1.6, P, 28), { tone: "mid" }));
    }
    out.push(S(k.slabOf(plan, -height, height, P, 8, 1.6), { tone: "mid", inner: L(k.sideSeam(plan, -height + 4, P, 8), { tone: "faint" }) }));
    out.push(L(k.planOutline(k.insetPlan(plan, 5), 0, P), { tone: "lo" }));
    out.push(screws(plan, 11, 0, 2.4));
    if (ruler) {
      out.push(S(k.slabOf(ruler, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
      const t = k.topTicks(ruler.x + 3, ruler.x + ruler.w - 3, 4, 5, ruler.y + 0.8, 0.6, [2, 3.8], P);
      out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
      out.push(D([[ruler.x + 1.4, ruler.y + ruler.d / 2, 0.6], [ruler.x + ruler.w - 1.4, ruler.y + ruler.d / 2, 0.6]], { size: 0.45 }));
    }
    if (label) {
      out.push(S(k.slabOf(label, 0, 0.8, P, 3), { tone: "mid", crease: "none" }));
      out.push(L(k.planOutline(k.insetPlan(label, 1.4), 0.8, P, 3), { tone: "faint" }));
      [0.72, 0.5, 0.62].forEach((f, i) => out.push(L(k.lineOnTop([label.x + 4, label.y + 4 + i * ((label.d - 8) / 2)], [label.x + 4 + (label.w - 12) * f, label.y + 4 + i * ((label.d - 8) / 2)], 0.8, P), { tone: "lo", free: true })));
      out.push(D([[label.x + label.w - 3, label.y + 3, 0.8], [label.x + label.w - 3, label.y + label.d - 3, 0.8]], { size: 0.4 }));
    }
    return out.join("");
  };
  /** A round dial gauge lying face up, with bezel, ticks and hub. */
  const dialFace = (x, y, R, z, h = 9, count = 50, every = 5) => {
    const top = z + h;
    const t = k.radialTicks(x, y, R - 3, count, every, top, [1.4, 3], P);
    return [
      S(k.cylinder(x, y, R, z, h, P, 64, 0.8), { tone: "hi", crease: "lo" }),
      L(k.knurl(x, y, R, top - 3, top, 72, P, 0.3), { tone: "lo" }),
      L(k.sideArc(x, y, R, top - 3, P, 40), { tone: "faint" }),
      L(k.ring(x, y, R - 2.2, top, P, 64), { tone: "lo" }),
      L(t.minor, { tone: "lo" }),
      L(t.major, { tone: "mid" }),
    ].join("");
  };
  return { S, L, D, at, byDepth, slab, post, screws, bench, dialFace };
}

/** Wraps a set of parts so the live layer can light it up or move it. */
export const part = (name, svg, extra = "") => `<g data-part="${name}"${extra}>${svg}</g>`;
