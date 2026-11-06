import { automatonMachine, lanternMachine, roasterMachine, type Machine, type SystemFact, type TradeOff } from "@/data/systems";

/**
 * Case studies. Every fact comes from the project's source code, its commit history or a
 * measurement of the live product, with the date in `factsNote`. Code excerpts are verbatim.
 * Keep it that way: no invented users, revenue or results. When you have real usage numbers,
 * add them to `results`.
 */

export type Incident = { date: string; title: string; what: string; fix: string };
export type Media = { kind: "image" | "video"; src: string; poster?: string; width: number; height: number; alt: string; caption: string };
export type Excerpt = { file: string; href: string; lang: string; code: string; note: string };
/** Every page is dark, tinted for its project: ember on black, the site's own red and black, moonlit teal. */
export type CaseStudyTheme = "ember" | "brand" | "moon";
/** The real product, loaded in place of the lead picture when a visitor asks for it. */
export type Demo = { label: string; note: string; touchNote: string; needsKeyboard: boolean };

export type CaseStudy = {
  slug: string;
  /** Must match the project's title in portfolioContent.work.projects. */
  project: string;
  theme: CaseStudyTheme;
  title: string;
  deck: string;
  description: string;
  cover: string;
  coverAlt: string;
  year: string;
  role: string;
  stack: string[];
  live: string;
  github: string;
  lead: Media;
  demo?: Demo;
  facts: SystemFact[];
  factsNote: string;
  problemHeadline: string;
  problem: string[];
  architectureHeadline: string;
  machine: Machine;
  machineNote: string;
  figures: Media[];
  decisionsHeadline: string;
  decisions: TradeOff[];
  excerpt: Excerpt;
  wrongHeadline: string;
  wrong: Incident[];
  results: string[];
  next: string[];
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "gitroasted",
    project: "GitRoasted",
    theme: "ember",
    title: "GitRoasted",
    deck: "It scores any GitHub profile out of 1,000, then has an LLM write a roast from the result. The number comes from code, so it holds up on a public leaderboard. The words come from the model.",
    description: "How GitRoasted scores any GitHub profile out of 1,000 in plain code, then lets an LLM write the roast: architecture, trade-offs, failures and real latency.",
    cover: "/projects/gitroasted.webp",
    coverAlt: "GitRoasted: your GitHub deserves to get roasted",
    year: "2025 – now",
    role: "Product, full-stack and AI engineering",
    stack: ["Next.js", "TypeScript", "Groq", "GitHub REST API", "Firebase", "Zod", "PWA"],
    live: "https://gitroasted.netlify.app",
    github: "https://github.com/MdKasif0/GitRoasted",
    lead: {
      kind: "video",
      src: "/case-studies/gitroasted/roast-flow.mp4",
      poster: "/case-studies/gitroasted/roast-flow.jpg",
      width: 1600,
      height: 900,
      alt: "A username is typed into GitRoasted and the loader steps through fetching, scoring and roasting",
      caption: "The live site, roasting my own profile."
    },
    demo: {
      label: "Try it here",
      note: "This is the real site, in a frame. Type any GitHub username and it runs a live roast.",
      touchNote: "Works on a phone too, or open it in a new tab.",
      needsKeyboard: false
    },
    facts: [
      { value: "~2.1s", label: "Median live roast, 5 runs, range 1.8–5.6 s", source: "Measured" },
      { value: "8", label: "Scoring dimensions, 1,000 points", source: "From the code" },
      { value: "296", label: "Commits since November 2025", source: "GitHub" },
      { value: "21", label: "GitHub stars, 2 forks", source: "GitHub" }
    ],
    factsNote: "Measured and counted in November 2026. Latency is end to end, from a browser on one connection, against the live site.",
    problemHeadline: "The score had to be fair. The roast had to sting.",
    problem: [
      "A roast only works if it feels earned. If the score behind it changes every time you refresh, nobody trusts it, and a public leaderboard falls apart.",
      "So I split the product in two. Everything that can be calculated gets calculated: stars, consistency, quality, community, activity. The model is handed that result and only writes about it, going after the weakest category first.",
      "That split decided the rest of the system: what gets fetched, how much of it reaches the model, and what happens when the model misbehaves."
    ],
    architectureHeadline: "One request, seven stops.",
    machine: roasterMachine,
    machineNote: "A single server action runs this whole path. The model only sees data that has already been fetched, capped and scored. The machine is an illustration, with every stage running at once like a production line. A real request passes through them in order, in about 2 seconds.",
    figures: [
      {
        kind: "image",
        src: "/case-studies/gitroasted/roast-result.jpg",
        width: 1600,
        height: 1187,
        alt: "A GitRoasted result page showing a score of 531 out of 1000 and a three-line roast",
        caption: "A real result from my own profile. The AI wasn't told to go easy on me."
      }
    ],
    decisionsHeadline: "The calls that shaped it.",
    decisions: [
      {
        chose: "Score in code, words from the LLM",
        over: "One model doing both",
        why: "The score is ordinary TypeScript across eight dimensions. The model gets the result and writes about it, so the same data always gets the same number.",
        cost: "The weights are mine to tune by hand, and any unfairness in them is my fault."
      },
      {
        chose: "A direct Groq API call",
        over: "Staying on the Genkit and Gemini flow",
        why: "In August 2026 I replaced the framework flow with one HTTP call in JSON mode, with the model name in an environment variable. There's less between the prompt and the response.",
        cost: "Keeping up with model changes is on me now, which caused the outage below."
      },
      {
        chose: "Hard limits on what gets read",
        over: "Reading a whole account",
        why: "Up to 10 pages of 100 repos, the last 100 events and 20 commit messages keep GitHub usage and prompt size predictable. Responses are cached for 5 minutes.",
        cost: "A very large account is scored on partial data."
      },
      {
        chose: "Tolerant parsing of model output",
        over: "Trusting JSON mode completely",
        why: "The parser pulls out the JSON object even if a model wraps it in markdown or adds a preamble, and fails with a clear error otherwise.",
        cost: "A malformed reply still fails the roast. There's no automatic retry yet."
      }
    ],
    excerpt: {
      file: "src/app/actions.ts",
      href: "https://github.com/MdKasif0/GitRoasted/blob/main/src/app/actions.ts",
      lang: "ts",
      code: `const commitHistory = events
  .filter(e => e.type === 'PushEvent' && (e.payload as any).commits)
  .flatMap(e => (e.payload as any).commits)
  .map(commit => \`- \${commit.message.split('\\n')[0]}\`)
  .slice(0, 20) // Limit commit history sent to AI
  .join('\\n');`,
      note: "How much of someone's history the model sees: first lines of 20 commit messages, and nothing else from the code."
    },
    wrongHeadline: "What broke.",
    wrong: [
      {
        date: "Nov 2026",
        title: "Anyone could edit the leaderboard",
        what: "The Firestore rules still allowed public writes, left over from the demo. With the public client config, anyone could have changed or deleted entries.",
        fix: "Writes moved to the server through the Firebase Admin SDK, and the rules now reject every client write. Reads stay public."
      },
      {
        date: "Oct 2026",
        title: "A dead model ID took roasts down",
        what: "The configured model started returning 404 from Groq, and with only one model configured, every roast failed.",
        fix: "I replaced the model and added a fallback list. A month later I found that list held the same ID twice, so a genuinely different model went in."
      },
      {
        date: "Aug 2026",
        title: "Three model changes in one day",
        what: "While moving to Groq I went from llama3-70b to llama-3.3-70b-versatile to groq/compound. Hosted model names change faster than application code.",
        fix: "The model moved into an environment variable, so changing it no longer needs a code change."
      },
      {
        date: "Nov 2025",
        title: "Leaderboard reads needed limits",
        what: "A live leaderboard can run up Firestore reads quickly once it grows.",
        fix: "I added query limits, pagination, a manual refresh strategy and read monitoring."
      }
    ],
    results: [
      "Live and free, with a median roast of about 2 seconds in my test.",
      "It grew from a score into a product: a leaderboard, one-on-one comparison, Quick Wins improvement steps, shareable cards and an installable PWA.",
      "Open source, with 21 stars and 2 forks on GitHub."
    ],
    next: [
      "Retry once when a model returns malformed JSON, before showing an error.",
      "Cache repeat roasts of the same profile for a few minutes, so they don't pay for another model call.",
      "Measure latency from more than one connection."
    ]
  },
  {
    slug: "cookie",
    project: "Cookie",
    theme: "brand",
    title: "Cookie",
    deck: "A tiny cat that lives on your desktop. She walks along your windows, sits on the Dock and naps when you stop working. The hard part is being a polite background app.",
    description: "How Cookie, a tiny desktop companion for macOS and Windows, navigates real windows, stays out of your clicks, and keeps everything offline.",
    cover: "/projects/cookie.webp",
    coverAlt: "Cookie, a tiny cat sitting on a desktop",
    year: "2026",
    role: "Native app design and engineering",
    stack: ["Swift", "SwiftUI", "SpriteKit", "AppKit", "Sparkle", "C#"],
    live: "https://cookie-v1.netlify.app/",
    github: "https://github.com/MdKasif0/Cookie",
    lead: {
      kind: "video",
      src: "/case-studies/cookie/hero.mp4",
      poster: "/case-studies/cookie/hero.jpg",
      width: 1800,
      height: 1012,
      alt: "The Cookie website, with the cat sitting on a sunlit desk",
      caption: "Cookie's website, where you can try her before installing anything."
    },
    facts: [
      { value: "10", label: "Days from first commit to macOS and Windows", source: "GitHub" },
      { value: "126", label: "macOS unit tests", source: "From the code" },
      { value: "24 MB", label: "macOS disk image, universal binary", source: "Measured" },
      { value: "0", label: "Accounts, analytics or cloud calls", source: "From the code" }
    ],
    factsNote: "Counted from the repository in November 2026: 330 commits, 15,741 lines of Swift and 14,542 lines of C#.",
    problemHeadline: "A desktop pet lives next to your real work.",
    problem: [
      "Cookie runs all day beside whatever you're doing, so her bugs aren't cosmetic. One stolen click or a spinning fan and she gets uninstalled.",
      "She has to know where windows and the Dock are without looking at what's on your screen. She has to feel alive, with moods and habits rather than a looping animation. And all of that has to work offline, with no account.",
      "I built the macOS app in SwiftUI and SpriteKit, then wrote a separate C# version for Windows."
    ],
    architectureHeadline: "How she finds her way around a desktop she can't read.",
    machine: automatonMachine,
    machineNote: "The macOS architecture, drawn as a machine with every part running at once. The Windows version is a separate C# implementation of the same behavior.",
    figures: [
      {
        kind: "video",
        src: "/case-studies/cookie/drag.mp4",
        poster: "/case-studies/cookie/drag.jpg",
        width: 1000,
        height: 880,
        alt: "Cookie being picked up and moved around a desk mat",
        caption: "Pick her up on the site's live desk mat."
      },
      {
        kind: "video",
        src: "/case-studies/cookie/play.mp4",
        poster: "/case-studies/cookie/play.jpg",
        width: 1000,
        height: 880,
        alt: "A grid of treats and toys being selected",
        caption: "Treats and toys, each with its own reaction."
      }
    ],
    decisionsHeadline: "The calls that shaped her.",
    decisions: [
      {
        chose: "Quartz window metadata",
        over: "Screenshots or screen analysis",
        why: "CGWindowListCopyWindowInfo gives window positions without capturing a single pixel. Scans are throttled to one every 0.4 seconds at most.",
        cost: "She knows where windows are, never what's in them, so she can't react to content."
      },
      {
        chose: "An alpha-mask hit test",
        over: "A rectangular click area",
        why: "The app tests her actual artwork, so a click on a transparent pixel goes through to the app underneath. The same mask tells nose from tail for petting.",
        cost: "The mask has to stay in sync with the artwork."
      },
      {
        chose: "Frame rate that follows behavior",
        over: "A constant 60 FPS",
        why: "She renders at 60 FPS when active and 15 when asleep, and pauses completely when her window is hidden.",
        cost: "Every behavior change also has to think about rendering."
      },
      {
        chose: "Fully offline, with signed updates",
        over: "Accounts and a backend",
        why: "Everything is stored as local JSON. The only network feature is the Sparkle updater, which verifies EdDSA signatures.",
        cost: "No usage data, so I have to ask people what they like."
      }
    ],
    excerpt: {
      file: "Cookie/Cookie/CookieScene.swift",
      href: "https://github.com/MdKasif0/Cookie/blob/main/Cookie/Cookie/CookieScene.swift",
      lang: "swift",
      code: `// Sleeping CPU optimization: run at 15 FPS while sleeping to reduce CPU to ~0%
if let engine = behaviorEngine {
    let targetFPS = engine.state == .sleeping ? 15 : 60
    if view?.preferredFramesPerSecond != targetFPS {
        view?.preferredFramesPerSecond = targetFPS
    }
}`,
      note: "That ~0% is the target in my comment, not a published measurement. Measuring it properly is on the list below."
    },
    wrongHeadline: "What broke.",
    wrong: [
      {
        date: "Oct 2026",
        title: "Landing on the edge of nothing",
        what: "Jump targets on top of a window could land too close to its edge.",
        fix: "Landing points are now clamped to a safe corridor along the window's top."
      },
      {
        date: "Oct 2026",
        title: "She kept following after being told to stop",
        what: "Cursor following continued after the setting was turned off, and interaction state could outlive the behavior that started it.",
        fix: "The setting is now checked directly, and ending a behavior resets interaction state and stops the movement interpolator."
      },
      {
        date: "Oct 2026",
        title: "Update signatures that didn't match",
        what: "Early releases needed the Sparkle signature and file length corrected in the update feed. An incorrect feed means the update gets rejected.",
        fix: "I corrected the feed for each release, and added cache headers so old website files stopped being served."
      },
      {
        date: "Oct 2026",
        title: "A crash path in the hit tester",
        what: "Creating the mask's color space and drawing context assumed they could never fail.",
        fix: "Both are now safely unwrapped."
      }
    ],
    results: [
      "Shipped on macOS and Windows, with a public website, in-app updates and installers.",
      "Macs get a universal build for Apple Silicon and Intel, on macOS 14 or later.",
      "Open source, and it never sends data anywhere."
    ],
    next: [
      "Sign and notarize the macOS build. It's ad-hoc signed today, so Gatekeeper warns on first launch.",
      "Measure and publish real idle CPU and battery figures on both platforms.",
      "Add an opt-in way to hear from users, since there's deliberately no analytics."
    ]
  },
  {
    slug: "shadow-of-the-crimson-gate",
    project: "Shadow of the Crimson Gate",
    theme: "moon",
    title: "Shadow of the Crimson Gate",
    deck: "A Japanese dark-fantasy action game that opens from a link. Third-person katana combat, yokai, a three-phase boss and saved progress, running in a browser tab on Three.js and my own TypeScript systems.",
    description: "How a Japanese dark-fantasy action game runs in a browser tab on Three.js and TypeScript: combat, boss AI, performance decisions and what broke along the way.",
    cover: "/projects/shadow-of-the-crimson-gate.webp",
    coverAlt: "The game's title beside a crimson temple gate with teal doors, lanterns and a full moon",
    year: "2026",
    role: "Game design, engine and graphics programming",
    stack: ["Three.js", "TypeScript", "WebGL", "Web Audio API", "Vite"],
    live: "https://shadow-of-the-crimson-gate.netlify.app/",
    github: "https://github.com/MdKasif0/Shadow-of-the-Crimson-Gate",
    lead: {
      kind: "image",
      src: "/case-studies/crimson/menu.jpg",
      width: 1800,
      height: 1013,
      alt: "The title screen: the game's title and menu beside a crimson temple gate with teal doors, stone lanterns and a full moon",
      caption: "The new title screen, running in the browser."
    },
    demo: {
      label: "Play it here",
      note: "This is the real game, in a frame. Click inside to control it. Starting a new game loads about 6 MB of audio.",
      touchNote: "The game needs a keyboard and mouse, so try this one on a computer.",
      needsKeyboard: true
    },
    facts: [
      { value: "237 KB", label: "Compressed JavaScript at first load", source: "Measured" },
      { value: "46", label: "Average FPS during gameplay at 1080p on an Apple M5 MacBook Air", source: "Measured" },
      { value: "19,895", label: "Lines of TypeScript across 163 files", source: "From the code" },
      { value: "3", label: "Phases in the Crimson Oni boss fight", source: "From the code" }
    ],
    factsNote: "Measured on the live game in November 2026 after the visual overhaul: five back-to-back runs of 600 frames averaged 43–49 FPS, with a median frame of 16.7 ms and a 95th percentile of 33 ms. This laptop has no fan and slows as it warms up. An earlier run on a cooler machine held 60.",
    problemHeadline: "It had to feel like a real game and still open from a link.",
    problem: [
      "Most browser games feel like browser games. I wanted weight: katana combat with dashes and combos, enemies that behave differently, and a boss that changes as the fight goes on.",
      "It also had to open from a link, with no store, install or plugin. So the whole game has to live within a browser's limits on memory, shaders and audio, on hardware I'll never see.",
      "Without a commercial engine, the loop, combat, AI, world generation, audio and saves all had to be built as my own systems on top of Three.js."
    ],
    architectureHeadline: "Everything runs through one loop.",
    machine: lanternMachine,
    machineNote: "Each system is its own TypeScript module, updated by the game loop. The rig is an illustration with every system running at once. Its speeds aren't to scale: the real loop runs about 60 times a second.",
    figures: [
      {
        kind: "video",
        src: "/case-studies/crimson/gate.mp4",
        poster: "/case-studies/crimson/gate.jpg",
        width: 1280,
        height: 720,
        alt: "The camera sweeps down over sakura trees to a red torii gate as the chapter title appears, then the ronin fights a yokai beside the gate",
        caption: "The new third-person opening and the first fight, two moments captured from the live game."
      },
      {
        kind: "image",
        src: "/case-studies/crimson/combat.jpg",
        width: 1600,
        height: 900,
        alt: "The ronin lands a glowing ink slash on a yokai beside the torii gate, with a damage number, enemy health bar and the player's health bar on screen",
        caption: "A hit in that fight: the ink slash, damage number, enemy bar and new HUD."
      }
    ],
    decisionsHeadline: "The calls that shaped it.",
    decisions: [
      {
        chose: "Three.js with my own game systems",
        over: "A full game engine",
        why: "It keeps the first load to 237 KB of compressed JavaScript, and I control the whole frame.",
        cost: "Combat, AI, cameras and saves were all mine to build and debug."
      },
      {
        chose: "Instanced and merged meshes, plus particle pools",
        over: "One object per tree, rock and petal",
        why: "Rocks and path stones are instanced, each tree merges into a few meshes that share materials, and pooled particles avoid creating and collecting objects in the middle of a fight.",
        cost: "Individual pieces are harder to animate and change."
      },
      {
        chose: "Frame-safety limits",
        over: "Trusting the browser's timing",
        why: "Delta time is capped at 100 ms so a hitch can't throw enemies through walls, pixel ratio is capped at 1.5, and the game pauses when the tab is hidden.",
        cost: "A long stall briefly slows the game instead of catching up."
      },
      {
        chose: "State machines for enemies and bosses",
        over: "Scripted sequences",
        why: "Yokai and the Crimson Oni react to the player, phases change on health, and attacks are defined as data.",
        cost: "Transitions became a real source of bugs, as you'll see below."
      }
    ],
    excerpt: {
      file: "src/game/core/GameLoop.ts",
      href: "https://github.com/MdKasif0/Shadow-of-the-Crimson-Gate/blob/main/src/game/core/GameLoop.ts",
      lang: "ts",
      code: `// Cap max delta time to prevent huge spikes when tab is backgrounded
// Also prevent negative dt if requestAnimationFrame uses a different time origin
if (dt < 0) dt = 0;
if (dt > 0.1) dt = 0.1;

this.updateCallback(dt);
this.renderCallback();`,
      note: "The middle of the game loop. Those two checks are why a slow frame slows the game down instead of breaking it."
    },
    wrongHeadline: "What broke.",
    wrong: [
      {
        date: "Aug 2026",
        title: "Too many lanterns for the shader",
        what: "Giving every lantern a real point light ran into shader light limits, so I cut the world's 20 lanterns to 2 and the arena's 8 to none.",
        fix: "That emptied the world, so I restored them 15 minutes later. The proper fix came in November: a small pool of real lights that moves to the lanterns nearest the player, while the rest glow on their own."
      },
      {
        date: "Aug 2026",
        title: "Shadows cost too much",
        what: "Having the terrain and arena floor receive shadows hurt performance.",
        fix: "I turned off shadow reception on those large surfaces."
      },
      {
        date: "Aug 2026",
        title: "Enemies with no direction",
        what: "Enemy AI steered along the raw vector to the player, height included, and had no real direction to face when an enemy stood exactly on the player.",
        fix: "The vector is now flattened to the ground, with a fixed fallback direction at zero distance."
      },
      {
        date: "Aug 2026",
        title: "A boss that got stuck between states",
        what: "The Crimson Oni had state transition bugs, plus wrong ability cooldowns and phase changes.",
        fix: "I fixed the transition logic, and later corrected the cooldown and phase handling."
      },
      {
        date: "Aug 2026",
        title: "Synthesized audio didn't last a day",
        what: "I added procedural boss audio on August 29 and replaced it on August 30.",
        fix: "The effects are sample-based now: a registry, routing buses and 81 audio files, with footsteps by terrain and ambience by zone."
      }
    ],
    results: [
      "Playable in a browser tab, with four chapters, dialogue, saved progress and a three-phase final boss.",
      "An average of 43–49 FPS in my gameplay test on a fan-less laptop, with automatic quality scaling and graphics and VFX settings for slower machines.",
      "Fully open source, with 275 commits on GitHub."
    ],
    next: [
      "Get back to a steady 60 FPS on a fan-less laptop now that post-processing is in.",
      "Test and publish frame rates on mid-range and low-end laptops.",
      "Finish save migration, which currently only updates the version number."
    ]
  }
];

export const caseStudyFor = (slug: string) => caseStudies.find((study) => study.slug === slug);
export const caseStudyForProject = (project: string) => caseStudies.find((study) => study.project === project);
