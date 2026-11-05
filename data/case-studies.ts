import { cookieDiagram, crimsonDiagram, gitRoastedDiagram, type Diagram, type SystemFact, type TradeOff } from "@/data/systems";

/**
 * Case studies. Every fact comes from the project's source code, its commit history or a
 * measurement of the live product, with the date in `factsNote`. Keep it that way: no invented
 * users, revenue or results. When you have real usage numbers, add them to `results`.
 */

export type Incident = { date: string; title: string; what: string; fix: string };

export type CaseStudy = {
  slug: string;
  /** Must match the project's title in portfolioContent.work.projects. */
  project: string;
  title: string;
  tagline: string;
  description: string;
  cover: string;
  coverAlt: string;
  year: string;
  role: string;
  stack: string[];
  live: string;
  github: string;
  facts: SystemFact[];
  factsNote: string;
  problem: string[];
  diagram: Diagram;
  diagramNote: string;
  decisions: TradeOff[];
  wrong: Incident[];
  results: string[];
  next: string[];
};

export const caseStudies: CaseStudy[] = [
  {
    slug: "gitroasted",
    project: "GitRoasted",
    title: "GitRoasted",
    tagline: "An AI roast, on top of a score it can't fake.",
    description: "How GitRoasted scores any GitHub profile out of 1,000 in plain code, then lets an LLM write the roast: architecture, trade-offs, failures and real latency.",
    cover: "/projects/gitroasted.webp",
    coverAlt: "GitRoasted: your GitHub deserves to get roasted",
    year: "2025 — now",
    role: "Product, full-stack and AI engineering",
    stack: ["Next.js", "TypeScript", "Groq", "GitHub REST API", "Firebase", "Zod", "PWA"],
    live: "https://gitroasted.netlify.app",
    github: "https://github.com/MdKasif0/GitRoasted",
    facts: [
      { value: "~4.0s", label: "Median live roast, 5 runs, range 3.7–6.5 s", source: "Measured" },
      { value: "8", label: "Scoring dimensions, 1,000 points", source: "From the code" },
      { value: "295", label: "Commits since November 2025", source: "GitHub" },
      { value: "21", label: "GitHub stars, 2 forks", source: "GitHub" }
    ],
    factsNote: "Measured and counted in November 2026. Latency is one end-to-end run from a browser on one connection, on the live site.",
    problem: [
      "A GitHub profile says a lot about a developer, but stars and green squares don't tell you much on their own. A plain score is also easy to shrug off.",
      "So the product had two jobs that pull in opposite directions. The score had to be fair and repeatable, because people compare it on a public leaderboard. The verdict had to be personal and funny enough that people want to share it.",
      "Asking one LLM to do both would have failed the first job. Run the same profile twice and you could get two different scores."
    ],
    diagram: gitRoastedDiagram,
    diagramNote: "A single server action runs this whole path. The model only sees data that has already been fetched, capped and scored.",
    decisions: [
      {
        chose: "Score in code, words from the LLM",
        over: "One model doing both",
        why: "The score is ordinary TypeScript across impact, consistency, quality, community, diversity, experience, activity and bonuses. The model is handed the result and only writes about it, targeting the weakest and strongest categories.",
        cost: "The weights are mine to tune by hand, and any unfairness in them is my fault."
      },
      {
        chose: "A direct Groq API call",
        over: "Staying on the Genkit and Gemini flow",
        why: "In August 2026 I replaced the framework flow with one HTTP call in JSON mode, with the model name in an environment variable. There are fewer layers between the prompt and the response.",
        cost: "Keeping up with model changes is now on me, which caused the outage described below."
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
        why: "The parser extracts the JSON object even if a model wraps it in markdown or adds a preamble, and fails with a clear error otherwise.",
        cost: "A malformed reply still fails the roast. There is no automatic retry yet."
      }
    ],
    wrong: [
      {
        date: "Oct 2026",
        title: "A dead model ID broke the roast",
        what: "The configured model returned 404 from Groq, so roasts failed. The code's fallback list contained the same model ID, so it couldn't help.",
        fix: "I replaced the invalid model. The lesson: a fallback needs to be a genuinely different model."
      },
      {
        date: "Aug 2026",
        title: "Three model changes in one day",
        what: "While moving to Groq, I went from llama3-70b to llama-3.3-70b-versatile to groq/compound. Hosted model names change faster than application code.",
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
      "Live and free at gitroasted.netlify.app, with a median roast of about 4 seconds in my test.",
      "It grew from a score into a product: a leaderboard, one-on-one profile comparison, Quick Wins improvement steps, shareable result cards and an installable PWA.",
      "Open source, with 21 stars and 2 forks on GitHub."
    ],
    next: [
      "Remove a fixed one-second wait after the leaderboard write. It accounts for about a quarter of the median roast time.",
      "Add a real second model, so one retired ID can't take the product down.",
      "Retry once when a model returns malformed JSON, before showing an error."
    ]
  },
  {
    slug: "cookie",
    project: "Cookie",
    title: "Cookie",
    tagline: "A desktop cat that has to behave like a good background app.",
    description: "How Cookie, a tiny desktop companion for macOS and Windows, navigates real windows, stays out of your clicks, and keeps everything offline.",
    cover: "/projects/cookie.webp",
    coverAlt: "Cookie, a tiny cat sitting on a desktop",
    year: "2026",
    role: "Native app design and engineering",
    stack: ["Swift", "SwiftUI", "SpriteKit", "AppKit", "Sparkle", "C#"],
    live: "https://cookie-v1.netlify.app/",
    github: "https://github.com/MdKasif0/Cookie",
    facts: [
      { value: "10", label: "Days from first commit to macOS and Windows", source: "GitHub" },
      { value: "126", label: "macOS unit tests", source: "From the code" },
      { value: "24 MB", label: "macOS disk image, universal binary", source: "Measured" },
      { value: "0", label: "Accounts, analytics or cloud calls", source: "From the code" }
    ],
    factsNote: "Counted from the repository in November 2026: 330 commits, 15,741 lines of Swift and 14,542 lines of C#.",
    problem: [
      "A desktop pet sounds simple until it has to live on someone's real desktop, all day, next to the work they're doing.",
      "It has to know where windows and the Dock are without reading what's on screen. It must never steal a click. It should use almost no power when nothing is happening. And it has to feel like a creature with moods, not a looping GIF.",
      "Those are systems problems in a cute costume. Getting any one of them wrong means someone uninstalls it."
    ],
    diagram: cookieDiagram,
    diagramNote: "The macOS architecture. The Windows version is a separate C# implementation of the same behavior.",
    decisions: [
      {
        chose: "Quartz window metadata",
        over: "Screenshots or screen analysis",
        why: "CGWindowListCopyWindowInfo gives window positions without capturing any pixels. Scans are throttled to at most one every 0.4 seconds.",
        cost: "Cookie knows where windows are, never what's in them, so she can't react to content."
      },
      {
        chose: "An alpha-mask hit test",
        over: "A rectangular click area",
        why: "The app tests the cat's actual artwork, so clicks on transparent pixels pass through to the app underneath. The same mask tells nose from tail for petting.",
        cost: "The mask has to stay in sync with the artwork."
      },
      {
        chose: "Frame rate that follows behavior",
        over: "A constant 60 FPS",
        why: "She renders at 60 FPS when active, 15 while asleep, and pauses completely when the window is hidden.",
        cost: "Every behavior change also has to think about rendering state."
      },
      {
        chose: "Fully offline, with signed updates",
        over: "Accounts and a backend",
        why: "Everything is stored as local JSON. The only network feature is the Sparkle updater, which verifies EdDSA signatures.",
        cost: "No usage data, so I have to learn what people like by asking them."
      }
    ],
    wrong: [
      {
        date: "Oct 2026",
        title: "Landing on the edge of nothing",
        what: "Jump targets on top of a window could land too close to its edge.",
        fix: "Landing points are now clamped to a safe corridor along the window's top surface."
      },
      {
        date: "Oct 2026",
        title: "She kept following after being told to stop",
        what: "Cursor following continued after the setting was disabled, and interaction state could outlive the behavior that started it.",
        fix: "The setting is now checked directly, and ending a behavior resets the interaction state and stops the movement interpolator."
      },
      {
        date: "Oct 2026",
        title: "Update signatures that didn't match",
        what: "Early releases needed the Sparkle signature and file length corrected in the update feed, and an incorrect feed means the update is rejected.",
        fix: "I corrected the appcast for each release, and added cache-control headers so old website files stopped being served."
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
      "Macs get a universal build for Apple Silicon and Intel, and need macOS 14 or later.",
      "Open source, and it never sends data anywhere."
    ],
    next: [
      "Sign and notarize the macOS build with a Developer ID. It's ad-hoc signed today, so Gatekeeper warns on first launch.",
      "Measure and publish real idle CPU and battery figures for both platforms, rather than relying on the design intent.",
      "Add an opt-in way to hear from users, since there's deliberately no analytics."
    ]
  },
  {
    slug: "shadow-of-the-crimson-gate",
    project: "Shadow of the Crimson Gate",
    title: "Shadow of the Crimson Gate",
    tagline: "A cinematic action game, with no install and no game engine.",
    description: "How a Japanese dark-fantasy action game runs in a browser tab on Three.js and TypeScript: combat, boss AI, performance decisions and what broke along the way.",
    cover: "/projects/shadow-of-the-crimson-gate.webp",
    coverAlt: "A torii gate under a moonlit sky in Shadow of the Crimson Gate",
    year: "2026",
    role: "Game design, engine and graphics programming",
    stack: ["Three.js", "TypeScript", "WebGL", "Web Audio API", "Vite"],
    live: "https://shadow-of-the-crimson-gate.netlify.app/",
    github: "https://github.com/MdKasif0/Shadow-of-the-Crimson-Gate",
    facts: [
      { value: "59.9", label: "FPS during gameplay at 1080p on an Apple M5", source: "Measured" },
      { value: "191 KB", label: "Compressed JavaScript at first load", source: "Measured" },
      { value: "16,242", label: "Lines of TypeScript across 150 files", source: "From the code" },
      { value: "3", label: "Phases in the Crimson Oni boss fight", source: "From the code" }
    ],
    factsNote: "Measured on the live game in November 2026 over 600 frames (95th percentile 17.1 ms). An M5 is a fast machine, and the 60 Hz limit caps the result, so this isn't a figure for low-end hardware.",
    problem: [
      "Most browser games look like browser games. The goal here was a game with weight: real-time katana combat, dashes and combos, enemies with distinct behavior, and a multi-phase boss, wrapped in moonlit Japanese atmosphere.",
      "It also had to open from a link. No store, no install, no plugin. That means the whole experience has to survive a browser's limits on memory, shaders and audio, on hardware I'll never see.",
      "Without a commercial game engine, the loop, combat, AI, world generation, audio and saves all had to be built as my own systems on top of Three.js."
    ],
    diagram: crimsonDiagram,
    diagramNote: "Each system is its own TypeScript module, updated in order by one game loop.",
    decisions: [
      {
        chose: "Three.js with my own game systems",
        over: "A full game engine",
        why: "It keeps the first load small: 191 KB of compressed JavaScript. I also control the whole frame.",
        cost: "Combat, AI, cameras and saves were all mine to build and debug."
      },
      {
        chose: "Instanced meshes and particle pools",
        over: "One object per tree, rock and petal",
        why: "One draw call can render thousands of instances, and pooled particles avoid creating and collecting objects during combat.",
        cost: "Individual instances are harder to animate and change."
      },
      {
        chose: "Frame-safety limits",
        over: "Trusting the browser's timing",
        why: "Delta time is capped at 100 ms so a hitch can't throw enemies through walls, pixel ratio is capped at 2, and the game pauses when the tab is hidden.",
        cost: "A long stall briefly slows the game instead of catching up."
      },
      {
        chose: "State machines for enemies and bosses",
        over: "Scripted sequences",
        why: "Yokai and the Crimson Oni react to the player, phases change on health, and attacks are defined as data.",
        cost: "Transitions are a real source of bugs, as you'll see below."
      }
    ],
    wrong: [
      {
        date: "Aug 2026",
        title: "Too many lanterns for the shader",
        what: "Placing many real lights in the arena and world ran into shader light limits.",
        fix: "I reduced the lantern counts in the arena and world generators."
      },
      {
        date: "Aug 2026",
        title: "Shadows cost too much",
        what: "Having the terrain and arena floor receive shadows hurt performance.",
        fix: "I turned off shadow reception on those large surfaces."
      },
      {
        date: "Aug 2026",
        title: "NaN enemies",
        what: "When an enemy stood exactly on its target, a zero-length direction vector produced NaN movement.",
        fix: "Direction vectors are now flattened and checked for zero length before use."
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
        what: "I added procedural boss audio on August 29, then replaced it on August 30.",
        fix: "It's now a sample-based system: a registry, routing buses and 81 WAV files, with footsteps by terrain and ambience by zone."
      }
    ],
    results: [
      "Playable in a browser tab, with four chapters, dialogue, saved progress and a three-phase final boss.",
      "A steady 60 FPS in my gameplay test on a fast laptop, with graphics and VFX settings for slower machines.",
      "Fully open source: 264 commits on GitHub."
    ],
    next: [
      "Load audio progressively. Starting a new game currently fetches about 11 MB of samples.",
      "Test and publish frame rates on mid-range and low-end laptops.",
      "Finish save migration, which currently only updates the version number."
    ]
  }
];

export const caseStudyFor = (slug: string) => caseStudies.find((study) => study.slug === slug);
export const caseStudyForProject = (project: string) => caseStudies.find((study) => study.project === project);
