/**
 * The architecture shown on the site. Everything here is read from the projects' real source code
 * or measured on the live product. `source` says which, and is shown next to each number:
 * keep that honest when updating a figure.
 */

export type NodeKind = "client" | "code" | "ai" | "external" | "store";
export type DiagramNode = { kind: NodeKind; title: string; note: string };
/** Left to right on wide screens, top to bottom on phones. A column with two nodes runs in parallel. */
export type Diagram = { columns: DiagramNode[][] };
export type SystemFact = { value: string; label: string; source: "Measured" | "From the code" | "GitHub" };
export type TradeOff = { chose: string; over: string; why: string; cost: string };

export type System = {
  id: string;
  name: string;
  kicker: string;
  summary: string;
  diagram: Diagram;
  facts: SystemFact[];
  tradeOffs: TradeOff[];
  /** The case study page, when there is one. */
  caseStudy?: string;
  href: string;
};

export const nodeKindLabels: Record<NodeKind, string> = {
  client: "Client",
  code: "My code",
  ai: "AI model",
  external: "External API",
  store: "Storage"
};

export const gitRoastedDiagram: Diagram = {
  columns: [
    [{ kind: "client", title: "Next.js client", note: "Posts one username to a server action." }],
    [{ kind: "code", title: "Server action", note: "Validates with Zod, then runs the whole roast as one request." }],
    [
      { kind: "external", title: "GitHub REST API", note: "Profile, up to 1,000 repos and 100 events, cached for 5 minutes." },
      { kind: "code", title: "Scoring engine", note: "Plain code. Eight dimensions, 1,000 points, no AI involved." }
    ],
    [{ kind: "ai", title: "Groq LLM", note: "Gets the score and 20 recent commit messages, returns JSON." }],
    [{ kind: "store", title: "Firestore", note: "One leaderboard document per username, upserted." }]
  ]
};

export const cookieDiagram: Diagram = {
  columns: [
    [{ kind: "external", title: "macOS window server", note: "Quartz window list, scanned at most every 0.4 s. No screenshots." }],
    [
      { kind: "code", title: "Behavior engine", note: "A state machine with a scheduler, cooldowns and context rules." },
      { kind: "code", title: "Jump planner", note: "Parabolic arcs onto window edges and the Dock, clamped to safe landings." }
    ],
    [{ kind: "code", title: "SpriteKit scene", note: "60 FPS awake, 15 FPS asleep, paused when fully hidden." }],
    [{ kind: "client", title: "Floating NSPanel", note: "An alpha-mask hit test lets clicks pass through transparent pixels." }],
    [{ kind: "store", title: "Local JSON", note: "Profile, stats and memory on disk. Nothing leaves the machine." }]
  ]
};

export const crimsonDiagram: Diagram = {
  columns: [
    [{ kind: "client", title: "Input + game loop", note: "One rAF loop. Delta time capped at 100 ms, paused when the tab is hidden." }],
    [
      { kind: "code", title: "Combat + AI", note: "Dashes, combos, yokai state machines and a three-phase boss." },
      { kind: "code", title: "World + VFX", note: "Instanced trees, rocks and particle pools to limit draw calls." }
    ],
    [{ kind: "code", title: "Three.js renderer", note: "WebGL, filmic tone mapping, pixel ratio capped at 2." }],
    [{ kind: "code", title: "Audio engine", note: "Web Audio buses over 81 samples, with zone-based ambience." }],
    [{ kind: "store", title: "Versioned save", note: "localStorage with a version check, and recovery from a bad save." }]
  ]
};

export const systems: System[] = [
  {
    id: "gitroasted",
    name: "GitRoasted",
    kicker: "AI pipeline",
    summary: "One request crosses GitHub, a scoring engine, an LLM and a database. The number comes from code and the words come from AI, so the score stays repeatable while the roast stays personal.",
    diagram: gitRoastedDiagram,
    facts: [
      { value: "~2.1s", label: "Median live roast, 5 runs, range 1.8–5.6 s", source: "Measured" },
      { value: "1,000", label: "Point score from code, not the model", source: "From the code" },
      { value: "20", label: "Commit messages sent to the model, at most", source: "From the code" },
      { value: "5 min", label: "GitHub response cache", source: "From the code" }
    ],
    tradeOffs: [
      {
        chose: "Score in code, words from AI",
        over: "Asking the model for the score",
        why: "The same data always gets the same score, which a leaderboard depends on.",
        cost: "Eight scoring dimensions to tune by hand."
      },
      {
        chose: "A direct Groq API call",
        over: "The Genkit framework I started with",
        why: "One HTTP call with JSON mode, and the model name lives in an environment variable.",
        cost: "Model changes are my problem. A retired ID once returned 404s."
      },
      {
        chose: "Hard caps on input",
        over: "Reading a whole account",
        why: "10 pages of 100 repos and 20 commits keep API calls and prompt size bounded.",
        cost: "Accounts past 1,000 repos are scored on partial data."
      }
    ],
    caseStudy: "gitroasted",
    href: "https://github.com/MdKasif0/GitRoasted"
  },
  {
    id: "checkers",
    name: "AI Checkers Arena",
    kicker: "Server-authoritative",
    summary: "LLMs hallucinate moves, so the model never decides what is legal. The server owns the rules, offers the model only legal moves, and checks the answer before anything is saved.",
    diagram: {
      columns: [
        [{ kind: "client", title: "Spectator UI", note: "Requests one turn at a time and renders the result." }],
        [{ kind: "code", title: "Turn API", note: "Replays the stored moves to rebuild the board on every turn." }],
        [{ kind: "code", title: "Rules engine", note: "International Checkers in TypeScript, with its own test suite." }],
        [{ kind: "ai", title: "OpenRouter model", note: "Picks from the legal moves. 60 s timeout, up to 3 attempts." }],
        [{ kind: "store", title: "Supabase Postgres", note: "Every move, with its reasoning, latency and tokens." }]
      ]
    },
    facts: [
      { value: "3", label: "Attempts per move before the fallback", source: "From the code" },
      { value: "60s", label: "Timeout on each model call", source: "From the code" },
      { value: "0", label: "Tokens spent on forced moves", source: "From the code" },
      { value: "100%", label: "Of moves checked by the rules engine", source: "From the code" }
    ],
    tradeOffs: [
      {
        chose: "Rebuilding state from the move log",
        over: "Saving a board snapshot",
        why: "There is one source of truth, and any match can be audited move by move.",
        cost: "Every turn replays the whole game so far."
      },
      {
        chose: "Retry, then a random legal move",
        over: "Letting a bad model break the match",
        why: "A match always finishes. Temperature rises on each retry, and the failure is recorded.",
        cost: "A fallback move is not really the model's play."
      },
      {
        chose: "Skipping the LLM on forced moves",
        over: "Calling the model every turn",
        why: "With one legal move there is nothing to decide, so it costs no tokens and no wait.",
        cost: "Latency stats need to account for those instant turns."
      }
    ],
    href: "https://github.com/MdKasif0/AI-Checkers-Arena"
  },
  {
    id: "gigsense",
    name: "GigSense",
    kicker: "Local-first",
    summary: "Couriers often work with no signal, and their evidence is sensitive. So the profit maths and all stored data live on the device, and AI only ever interprets, never calculates.",
    diagram: {
      columns: [
        [{ kind: "client", title: "Installable PWA", note: "A service worker keeps the app shell working offline." }],
        [{ kind: "code", title: "Deterministic core", note: "Vehicle costs and net pay per hour, calculated on the device." }],
        [{ kind: "store", title: "IndexedDB", note: "Deliveries, incidents and evidence files, stored on the device." }],
        [{ kind: "code", title: "AI API routes", note: "Receive text only and reject anything that fails validation." }],
        [{ kind: "ai", title: "LLM", note: "Returns structured JSON that is parsed before it reaches the UI." }]
      ]
    },
    facts: [
      { value: "0", label: "Network calls needed for the profit maths", source: "From the code" },
      { value: "3", label: "IndexedDB stores on the device", source: "From the code" },
      { value: "20", label: "Evidence descriptions per AI request, at most", source: "From the code" },
      { value: "0", label: "Evidence files sent to the AI", source: "From the code" }
    ],
    tradeOffs: [
      {
        chose: "Storing everything on the device",
        over: "A hosted database",
        why: "It works in a basement with no signal, and sensitive evidence stays with the worker.",
        cost: "No sync between devices, and clearing browser storage loses data."
      },
      {
        chose: "Maths in code, AI for context",
        over: "Letting a model estimate pay",
        why: "Money figures have to be exact and repeatable, and work without a network.",
        cost: "AI features still need a connection."
      },
      {
        chose: "Sending descriptions, not files",
        over: "Uploading evidence to the model",
        why: "Photos and receipts never leave the device.",
        cost: "The AI only knows what the worker describes."
      }
    ],
    href: "https://github.com/MdKasif0/GigSense"
  }
];
