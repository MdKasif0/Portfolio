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
    BuildProvider.tsx     Client-only state machine, seeded director, reveal, tour, and replay context
    BuildInspector.tsx    Floating live design-tool selection inspector
    ControlBar.tsx        Speed, sound, progress, skip, and completion controls
    CursorLayer.tsx       Fixed overlay with cursors and active wireframe
    DimensionChip.tsx     Selection dimensions
    WireframeBox.tsx      Selection handles and text/image placeholder
    buildMode.config.ts   Feature defaults and agent palette
    types.ts              Build state, layer, and cursor types
    useBuildScript.ts     Seeded six-act timeline with per-section choreography
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
  favicon.svg             Compact KASIF browser icon
  og-image.svg            Social-sharing preview artwork
  hero-cutout.png         Original supplied transparent avatar
  hero-cutout.webp        Optimized desktop hero portrait
  hero-cutout-mobile.webp Optimized mobile hero portrait
```

## Content and assets to replace

Update the typed source in `data/content.ts` and add files under `public/`. Missing optional values are omitted from the page rather than shown as placeholder tokens:

- **Portrait:** the supplied transparent avatar is installed as `public/hero-cutout.webp` and `public/hero-cutout-mobile.webp`; `public/hero-cutout.png` is the original source.
- **Showreel:** replace `hero.reelEmbedUrl` with the YouTube or X video URL.
- **CV:** set `hero.cvHref` to the real downloadable CV path or URL.
- **Project URLs and details:** add each project's confirmed `href`, `year`, category and description. Cookie and ShiftKit need a real category and description before they can be fully presented.
- **Project thumbnails:** add real images for GitRoasted, ReviewPilot, GreenBoard, Gravites Network, AI Checkers Arena, Cookie, and ShiftKit; replace the CSS thumbnail previews in `components/work-section.tsx`.
- **Contact email:** set `contact.email` to the real address. The email row is omitted until this is supplied.
- **Stats and aggregate count:** set hero stats and the recognition `count` only to confirmed figures; the six brand collaborations are already supplied.
- **Years and dates:** add confirmed project, education, recognition, timeline, and milestone dates. Unknown years are omitted.
- **Recognition proof:** replace `recognition.proofHref` with a real proof or portfolio URL.
- **Raw-to-Real assets:** supply the project name and year plus its Figma wireframe and final UI screenshots.
- **Footer note:** set `footer.note` to the desired copyright/year line.
- **Site domain:** set `NEXT_PUBLIC_SITE_URL` to the production origin; Netlify's `URL` environment variable is used as a fallback for metadata, robots, and sitemap output.
- **Social preview artwork:** replace `public/og-image.svg` if you want a custom brand image.

No unprovided email address, award, year, or project statistic is fabricated. Leave unknown optional fields unset until they can be confirmed.

## Netlify deploy checklist

1. Connect the repository to Netlify and use the repository root as the base directory.
2. Set the build command to `npm run build`; set the publish directory to `out` (also configured in `netlify.toml`).
3. Confirm the deploy succeeds and that `/`, `/robots.txt`, and `/sitemap.xml` are served from the published output.
4. Set `NEXT_PUBLIC_SITE_URL` to the production HTTPS origin, add any remaining portrait/project assets, and fill in confirmed optional content.
5. Add the custom domain in Netlify, enable HTTPS, and redeploy after updating the site origin.
6. Run Lighthouse on the deployed production URL for mobile and desktop. Confirm the performance, accessibility, and SEO targets (90+) with real assets and content; score results depend on the final media, hosting, and browser environment.

## Notes

- The Motion toggle disables Lenis and visual motion; the system also honors `prefers-reduced-motion`.
- Agent Build Mode automatically runs after every page load, then restores the original DOM and interaction state. Use **Replay build** in the footer to run it again; press Escape or use the control bar's × to skip.
- Tune the intro delay, default speed, sound, cursor caps, and session behavior in `components/agent-build/buildMode.config.ts`. Set `enabled: false` to disable the feature without removing its components. Keep `data-layer` markers on meaningful content if sections are edited.
- The director maps marked layers into a deterministic ~35-second six-act desktop sequence (scan, blueprint, build, polish, finale, handoff); the mobile version is shorter, capped at 10 cursors, and omits trails. Replay reuses the same seeded sequence. In development, the control bar includes a timeline scrubber for inspecting and seeking the build.
- The mobile navigation expands into a full-screen menu and closes on selection or Escape.
- The project filter tabs, showreel dialog, and Raw-to-Real range slider support keyboard interaction.
- Next Image is used for the hero portrait; add any future raster images with `next/image`.

## Machine drawings

The machines in "A look under the surface" are built with the MIT-licensed [Anatomy](https://github.com/wheresryan22/anatomy) kit, kept in `tools/figures/kit`. Edit a machine in `tools/figures/*.mjs`, then run `node tools/figures/build.mjs` to regenerate `public/figures/*.json`. Their steps and wording live in `data/systems.ts`, and their motion in `components/machines/drivers.ts`.
