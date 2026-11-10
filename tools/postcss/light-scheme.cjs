/**
 * Builds the light theme from the dark one at build time, so the two can never drift apart.
 *
 * For every rule in app/globals.css that sets a colour, a twin rule scoped to
 * html[data-scheme="light"] is placed right after it with the colours mapped onto warm paper and ink.
 * Every twin gains the same specificity, so the cascade between twins matches the original.
 *
 * Leave a rule out with a comment inside it: `/* scheme: keep *\/` (it stays dark in both themes),
 * or list its selector in KEEP below. Hand-written fixes go in globals.css under
 * html[data-scheme="light"]; rules that mention data-scheme are never twinned.
 */

const SCOPE = 'html[data-scheme="light"]';

/** Parts of the page that stay dark in both themes: video players, the cursor and anything over footage. */
const KEEP = [
  /site-cursor/, /\.mc-/, /magnetic-cursor/,
  // The reel player's controls, menus and end cards sit on the video.
  /\.rp-(stage|controls|bar|btn|track|time|menu|bigplay|flash|end|upnext|preview|spinner|badge|icon)/
];

const PAPER = [243, 240, 234];
const INK = [21, 20, 26];

const COLOUR_PROPS = /^(color|background|background-color|background-image|border(-(top|right|bottom|left|block|inline)(-(start|end))?)?(-color)?|outline(-color)?|box-shadow|text-shadow|fill|stroke|caret-color|text-decoration(-color)?|-webkit-text-fill-color|-webkit-text-stroke(-color)?|accent-color|column-rule(-color)?|filter|stop-color|scrollbar-color)$/;

const FAMILY = /^(background|border|outline|text-decoration|column-rule)/;

const NAMED = { white: [255, 255, 255, 1], black: [0, 0, 0, 1] };

const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b(white|black)\b/g;
const HAS_COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\(|\b(white|black)\b/;

function parse(token) {
  if (NAMED[token]) return NAMED[token];
  if (token[0] === "#") {
    let hex = token.slice(1);
    if (hex.length <= 4) hex = [...hex].map((c) => c + c).join("");
    const n = (i) => parseInt(hex.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), hex.length === 8 ? n(6) / 255 : 1];
  }
  const parts = token.slice(token.indexOf("(") + 1, -1).split(/[\s,/]+/).filter(Boolean);
  const channel = (v) => (v.endsWith("%") ? (parseFloat(v) * 255) / 100 : parseFloat(v));
  const alpha = parts[3] === undefined ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
  return [channel(parts[0]), channel(parts[1]), channel(parts[2]), alpha];
}

function toHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function format([r, g, b, a]) {
  const c = [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))));
  const alpha = Math.round(Math.max(0, Math.min(1, a)) * 1000) / 1000;
  if (alpha >= 1) return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  return `rgba(${c.join(",")},${alpha})`;
}

function mapColour(rgba, shadow) {
  const [r, g, b, a] = rgba;
  const [h, s, l] = toHsl(rgba);
  const chroma = s * (1 - Math.abs(2 * l - 1));
  // A dark shadow stays a shadow, only softer: on paper a full-strength one looks dirty.
  if (shadow && l < 0.5) return [52, 38, 30, a * 0.42];
  if (chroma < 0.14) {
    // Neutral: black becomes paper, white becomes ink, and greys land in between.
    const t = Math.max(0, Math.min(1, (0.299 * r + 0.587 * g + 0.114 * b) / 255));
    const out = mix(PAPER, INK, t);
    // A faint white line on black reads stronger than the same black line on paper.
    const alpha = a < 1 && t > 0.5 ? Math.min(1, a * 1.35) : a;
    return [...out, alpha];
  }
  // Coloured: mid tones (the reds) stay, only a touch deeper; dark tints turn light and light tints dark.
  if (l >= 0.3 && l <= 0.72) return [...fromHsl(h, s, l * 0.93), a];
  if (l > 0.72) return [...fromHsl(h, Math.min(1, s * 0.9), Math.max(0.3, 1.04 - l * 0.92)), a];
  const light = 0.955 - 0.8 * l;
  return [...fromHsl(h, s * (light > 0.85 ? 0.55 : 0.8), light), a];
}

/** A solid red fill, from a variable or a colour: text on it stays white in both themes. */
function isAccentFill(value) {
  if (/var\(--(red-[456]00|accent|next-accent|machine-accent)\)/.test(value)) return true;
  return (value.match(COLOUR) || []).some((token) => {
    const rgba = parse(token);
    const [, s, l] = toHsl(rgba);
    return rgba[3] >= 0.6 && s * (1 - Math.abs(2 * l - 1)) >= 0.14 && l >= 0.3 && l <= 0.72;
  });
}

const isLight = (token) => {
  const [r, g, b] = parse(token);
  return 0.299 * r + 0.587 * g + 0.114 * b > 215;
};

function mapValue(value, shadow, keepWhite) {
  return value.replace(COLOUR, (token) => {
    try {
      if (keepWhite && isLight(token)) return token;
      return format(mapColour(parse(token), shadow));
    } catch { return token; }
  });
}

function scopeSelector(selector) {
  const s = selector.trim();
  if (s.startsWith(":root")) return `:root[data-scheme="light"]${s.slice(5)}`;
  if (/^html(?![\w-])/.test(s)) return `${SCOPE}${s.slice(4)}`;
  if (s.startsWith("::view-transition")) return `${SCOPE}${s}`;
  return `${SCOPE} ${s}`;
}

const inKeyframes = (node) => {
  for (let p = node.parent; p; p = p.parent) if (p.type === "atrule" && /keyframes$/i.test(p.name)) return true;
  return false;
};

module.exports = () => ({
  postcssPlugin: "light-scheme",
  Once(root) {
    const file = root.source?.input?.file || "";
    if (!/app[\\/]globals\.css$/.test(file)) return;
    const rules = [];
    root.walkRules((rule) => {
      if (inKeyframes(rule)) return;
      // Tailwind's base and utility layers come from the @tailwind lines at the top of the file.
      if ((rule.source?.start?.line ?? Infinity) <= 3) return;
      if (rule.selector.includes("data-scheme")) return;
      if (KEEP.some((pattern) => pattern.test(rule.selector))) return;
      if (rule.nodes.some((n) => n.type === "comment" && /scheme:\s*keep/.test(n.text))) return;
      const colour = (n) => n.type === "decl" && (COLOUR_PROPS.test(n.prop) || (n.prop.startsWith("--") && HAS_COLOUR.test(n.value)));
      // A shorthand in the twin (background, border…) would reset the longhands set beside it, such as
      // background-clip: text or border-top: 0, so the twin carries the whole family in its original order.
      const families = new Set(rule.nodes.filter(colour).map((n) => FAMILY.exec(n.prop)?.[0]).filter(Boolean));
      const decls = rule.nodes.filter((n) => colour(n) || (n.type === "decl" && families.has(FAMILY.exec(n.prop.replace(/^-webkit-/, ""))?.[0])));
      if (decls.length) rules.push([rule, decls]);
    });
    for (const [rule, decls] of rules) {
      const twin = rule.clone({ nodes: [] });
      twin.selectors = rule.selectors.map(scopeSelector);
      const onAccent = decls.some((d) => /^background(-color)?$/.test(d.prop) && isAccentFill(d.value));
      for (const decl of decls) {
        const shadow = /shadow|filter/.test(decl.prop);
        const keepWhite = onAccent && /^(color|fill|stroke|-webkit-text-fill-color|border(-color)?)$/.test(decl.prop);
        twin.append(decl.clone({ value: mapValue(decl.value, shadow, keepWhite) }));
      }
      rule.after(twin);
    }
  }
});
module.exports.postcss = true;
