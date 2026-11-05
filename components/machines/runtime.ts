/** Shared helpers for the live machines. Every machine is a pure function of its tour clock, so any moment can be jumped to. */

export type Point3 = [number, number, number];
export type Projection = { origin: [number, number]; scale: number; azimuth?: number; elevation?: number };
export type Figure = { id: string; width: number; height: number; label: string; P: Projection; paths: Record<string, unknown>; body: string };
/** Sets every part for the machine's running clock, in seconds. Returns the live readout for the given step. */
export type Pose = (now: number, station: number) => string;
export type StationTiming = { seconds: number };

const UNIT = Math.sqrt(1.6);
const RADIANS = Math.PI / 180;

export function projector({ origin, scale, azimuth = 45, elevation = 30 }: Projection) {
  const a = azimuth * RADIANS, e = elevation * RADIANS;
  const sinA = Math.sin(a), cosA = Math.cos(a), sinE = Math.sin(e), cosE = Math.cos(e), k = scale * UNIT;
  return ([x, y, z]: Point3): [number, number] => [origin[0] + (x * sinA - y * cosA) * k, origin[1] + ((x * cosA + y * sinA) * sinE - z * cosE) * k];
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const smooth = (t: number) => { const u = clamp01(t); return u * u * (3 - 2 * u); };
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: Point3, b: Point3, t: number): Point3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
/** Attack and decay around a window, so nothing pops on or off. */
export const envelope = (now: number, from: number, to: number, ramp = 0.3) => smooth((now - from) / ramp) * (1 - smooth((now - (to - ramp)) / ramp));
export const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

export function mixColor(a: [number, number, number], b: [number, number, number], t: number) {
  const u = clamp01(t);
  return `rgb(${Math.round(lerp(a[0], b[0], u))},${Math.round(lerp(a[1], b[1], u))},${Math.round(lerp(a[2], b[2], u))})`;
}

const SVG_NS = "http://www.w3.org/2000/svg";
export function make<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, String(value));
  parent?.appendChild(element);
  return element;
}

/** Start time of each station, plus the total. */
export function schedule(stations: StationTiming[]) {
  const starts: number[] = [];
  let at = 0;
  for (const station of stations) { starts.push(at); at += station.seconds; }
  return { starts, total: at };
}

/** A translate that moves a group built at rest by a world offset. */
export function mover(P: Projection) {
  const project = projector(P);
  const zero = project([0, 0, 0]);
  return (element: Element | null, by: Point3) => {
    if (!element) return;
    const [x, y] = project(by);
    element.setAttribute("transform", `translate(${(x - zero[0]).toFixed(2)} ${(y - zero[1]).toFixed(2)})`);
  };
}

/** Lamps are off, or lit in one of the machine's status colours. Writes only when the state changes. */
export function lamps(root: Element) {
  const found = new Map<string, Element>();
  root.querySelectorAll("[data-lamp]").forEach((element) => found.set(element.getAttribute("data-lamp") ?? "", element));
  return (name: string, state: "off" | "on" | "good" | "bad") => {
    const lamp = found.get(name);
    if (lamp && lamp.getAttribute("data-state") !== state) lamp.setAttribute("data-state", state);
  };
}
