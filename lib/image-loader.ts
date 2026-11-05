import manifest from "./image-manifest.json";

type Entry = { name: string; widths: number[] };

/** Picks the smallest pre-built size that covers the request (see tools/images/build.py), or the original when none does. */
export default function imageLoader({ src, width }: { src: string; width: number }) {
  const entry = (manifest as Record<string, Entry>)[src];
  const size = entry?.widths.find((candidate) => candidate >= width);
  return entry && size ? `/img/${entry.name}-${size}.webp` : src;
}
