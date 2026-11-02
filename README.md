# KASIF Portfolio

A cinematic, responsive, single-page portfolio for Md Kasif Uddin, built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, and Lenis. The site uses static export and is configured to publish on Netlify.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js. To create and test the production export:

```bash
npm run lint
npm run build
python3 -m http.server 8000 --directory out
```

The static site is emitted to `out/`. Netlify uses `npm run build` and publishes that directory.

## Project structure

```text
.eslintrc.json            Next.js ESLint configuration
README.md                 Setup, content placeholders, and deploy guide
netlify.toml              Netlify build and publish settings
next.config.mjs           Static export and image settings
package.json              Scripts and dependencies
package-lock.json         Locked npm dependency tree
postcss.config.mjs         Tailwind/PostCSS integration
tailwind.config.ts        Tailwind theme configuration
tsconfig.json             TypeScript configuration
app/
  globals.css             Design system, responsive layout, and motion styles
  layout.tsx              Fonts, document shell, SEO and social metadata
  page.tsx                Single-page section composition
  robots.ts               Search crawler rules and sitemap reference
  sitemap.ts              Static sitemap for /
components/
  about-journey.tsx       Raw-to-Real, About, process, and Journey sections
  agent-build/
    AgentCursor.tsx       Multiplayer cursor visual, persona tags, and status
    BuildDebugPanel.tsx   Optional sampled work-ratio, idle-gap, window, and action diagnostics
    BuildProvider.tsx     Client-only state machine, DOM capture, reveal, tour, and replay context
    BuildInspector.tsx    Floating live design-tool selection inspector
    ControlBar.tsx        Speed, sound, progress, skip, and completion controls
    CursorLayer.tsx       Fixed overlay with task cursors, frames, and tool inspector
    DimensionChip.tsx     Selection dimensions
    GhostLayer.tsx        Computed-style DOM clone, image placeholder, and progressive text
    LayerProgressPanel.tsx Compact list of recently completed layers
    ToolChrome.tsx        Per-task action and style-value labels
    WireframeBox.tsx      Action-specific selection frame, handles, and ghost preview
    buildMode.config.ts   Feature defaults and agent palette
    taskCompiler.ts       Deterministic action recipes, worker queues, and debug metrics
    types.ts              Build phases, layers, actions, frames, and debug types
    useBuildScript.ts     Compile captured layers into a deterministic task timeline
  contact-footer.tsx      Contact section, social links, and site footer
  collab-recognition.tsx  Collaborator strip and recognition panel
  hero-section.tsx        Hero, portrait, stats, and showreel trigger
  motion-shell.tsx        Motion preference, Lenis lifecycle, and reveal polish
  showreel-modal.tsx      Shared keyboard-accessible showreel dialog
  site-nav.tsx            Sticky navigation, mobile menu, and scroll progress
  work-section.tsx        Filterable, searchable, paginated project cards
data/
  content.ts              Typed, editable portfolio copy and links
public/
  og-image.svg            Social-sharing preview artwork
  hero-cutout.png         Supplied transparent avatar used in the hero
```

## Content and assets to replace

Edit `data/content.ts`; unset values use `undefined` and are omitted from the rendered page.

- **Portrait:** the supplied transparent avatar is installed at `public/hero-cutout.png`; replace it only if you want to use another portrait.
- **Showreel:** replace `hero.reelEmbedUrl` with the YouTube or X video URL.
- **CV:** replace `hero.cvHref` with the real downloadable CV path or URL.
- **Project URLs and details:** add confirmed URLs, years, categories, and descriptions. Projects without enough details to present are omitted until those fields are supplied.
- **Project thumbnails:** add real images for GitRoasted, ReviewPilot, GreenBoard, Gravites Network, AI Checkers Arena, Cookie, and ShiftKit; replace the CSS thumbnail previews in `components/work-section.tsx`.
- **Collaborator logos:** add supplied logo assets for Blackbox AI, Kimi, SuperApp, yapper.so, Glass Editor, and startblock.shop; the current strip uses text wordmarks.
- **Contact email:** set `contact.email` to the real address; the email row appears only when supplied.
- **Stats and aggregate count:** supply confirmed figures for optional hero stats and the recognition count; preserve the supplied six brand collaborations.
- **Years and dates:** supply confirmed project, education, recognition, timeline, and milestone dates.
- **Recognition proof:** replace `recognition.proofHref` with a real proof or portfolio URL.
- **Raw-to-Real assets:** supply the project name and year plus its Figma wireframe and final UI screenshots.
- **Footer note:** set `footer.note` to the desired copyright/year line.
- **Site domain:** set `siteUrl` in `data/content.ts` to the production origin. Metadata, robots, and sitemap output omit the domain-dependent values until then.
- **Social preview artwork:** replace `public/og-image.svg` if you want a custom brand image.

No unprovided email address, award, year, or project statistic is fabricated. Missing fields are listed in the development console and omitted from the page.

## Netlify deploy checklist

1. Connect the repository to Netlify and use the repository root as the base directory.
2. Set the build command to `npm run build`; set the publish directory to `out` (also configured in `netlify.toml`).
3. Confirm the deploy succeeds and that `/`, `/robots.txt`, and `/sitemap.xml` are served from the published output.
4. Replace `siteUrl` with the production HTTPS origin, add the portrait and project assets, and replace the content placeholders.
5. Add the custom domain in Netlify, enable HTTPS, and redeploy after updating the site origin.
6. Run Lighthouse on the deployed production URL for mobile and desktop. Confirm the performance, accessibility, and SEO targets (90+) with real assets and content; score results depend on the final media, hosting, and browser environment.

## Notes

- The Motion toggle disables Lenis and visual motion; the system also honors `prefers-reduced-motion`.
- Agent Build Mode automatically runs after every page load, then restores the original DOM and interaction state. Use **Replay build** in the footer to run it again; press Escape or use the control bar's × to skip.
- Tune the intro delay, desktop/mobile speed, active workers, rendered-cursor caps, sound, action timings, sparse-window minimum task duration, camera-window size/handoff, seed, and session behavior in `components/agent-build/buildMode.config.ts`. Set `enabled: false` to disable the feature without removing its components. Keep `data-layer` markers on meaningful content if sections are edited.
- The engine captures each marked layer's geometry, hierarchy, image source, and computed style once, then compiles a seeded, viewport-windowed recipe and worker schedule. The real DOM remains the source of truth; cursors and selection frames are a temporary overlay, and each original layer is restored after its recipe. Repeated cards use copy/retype/swap recipes. Desktop rendering is capped at 14 cursors; mobile at 8, with a shorter timeline.
- Add `?buildDebug=1` to show the diagnostics panel. It samples active worker time at a 10 Hz target and reports the active camera window, cumulative sampled action counts, sampled work ratio, longest gap, and idle violations. The completed run also prints a per-window runtime report to the browser console. The development control bar includes a timeline scrubber. Layer totals are discovered from the current DOM (300 in the default server-rendered page), rather than hard-coded, so filters and project pagination can change the total.
- Press Escape or × to skip; use **Replay build** in the footer or **Replay** on the completion bar to run it again. A user input cancels the guided camera movement while the build continues. The Motion toggle and `prefers-reduced-motion` skip the build and leave the site interactive.
- The mobile navigation expands into a full-screen menu and closes on selection or Escape.
- The project filter tabs, showreel dialog, and Raw-to-Real range slider support keyboard interaction.
- Next Image is used for the hero portrait; add any future raster images with `next/image`.
