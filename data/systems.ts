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

/** One step of a request, played on the machine. `parts` are what light up; `object` says what they are in the machine. */
export type MachineStation = { title: string; object: string; note: string; parts: string[]; seconds: number };
export type Machine = { figure: "roaster" | "referee" | "fieldcase"; object: string; stations: MachineStation[] };

export type System = {
  id: string;
  name: string;
  kicker: string;
  summary: string;
  machine: Machine;
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
    machine: {
      figure: "roaster",
      object: "A bench coffee roaster",
      stations: [
        { title: "Server action", object: "the gate", note: "One username comes in and is validated with Zod. The whole roast then runs inside this single request.", parts: ["gate"], seconds: 1.8 },
        { title: "GitHub REST API", object: "the hopper", note: "Profile, up to 1,000 repos and the last 100 events, with responses cached for 5 minutes.", parts: ["hopper"], seconds: 2.2 },
        { title: "Scoring engine", object: "eight sieve drawers and a gauge", note: "Plain code across eight dimensions, out of 1,000. There's no flame near this step: no AI touches the number. The gauge shows my own 531.", parts: ["scale", "probe"], seconds: 4 },
        { title: "Prompt limit", object: "the belt", note: "Only the first lines of at most 20 commit messages go forward, which keeps the prompt small and predictable.", parts: ["belt", "gate"], seconds: 3.4 },
        { title: "Groq LLM", object: "the burner and drum", note: "The model gets the score and the commits, and returns JSON. Two gas bottles, because there are two candidate models: if one fails, the other takes over.", parts: ["drum", "burner", "gas", "bottle-a", "bottle-b"], seconds: 3.8 },
        { title: "Parse the reply", object: "the chute and cooling tray", note: "The JSON object is pulled out even if the model wraps it in markdown, and anything else fails with a clear error.", parts: ["chute", "tray"], seconds: 2 },
        { title: "Firestore", object: "the card rack", note: "One leaderboard entry per username, upserted from the server. Clients can read it but can't write to it.", parts: ["rack"], seconds: 2.2 }
      ]
    },
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
    machine: {
      figure: "referee",
      object: "A tournament referee rig",
      stations: [
        { title: "Replay the log", object: "the punched tape", note: "Each turn, the stored moves are replayed from Postgres to rebuild the board, so there's one source of truth.", parts: ["log"], seconds: 2.6 },
        { title: "Rules engine", object: "the board", note: "International Checkers in TypeScript works out the legal moves first. With only one legal move, the model is skipped entirely.", parts: ["board", "rules"], seconds: 1.8 },
        { title: "Ask the model", object: "the sealed booth", note: "An OpenRouter model picks from the legal list, under a 60 s timeout per call. In this run its first answer is illegal, so the comb rejects it.", parts: ["model", "rules"], seconds: 3.2 },
        { title: "Retry", object: "the attempt lamps", note: "Up to 3 attempts, with temperature rising each time. If all three fail, a random legal move keeps the match alive, and the failure is recorded.", parts: ["model", "rules"], seconds: 3 },
        { title: "Apply the move", object: "the gantry", note: "The server applies the move. The model never touches the board directly.", parts: ["gantry", "board"], seconds: 3.4 },
        { title: "Save it", object: "a new row on the tape", note: "Every move is stored with its reasoning, latency and tokens, so any match can be audited move by move.", parts: ["log"], seconds: 2 }
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
    machine: {
      figure: "fieldcase",
      object: "A sealed field case",
      stations: [
        { title: "No signal", object: "the radio and battery pack", note: "Couriers often work with no signal. A service worker keeps the app shell running offline.", parts: ["radio", "shell"], seconds: 2.4 },
        { title: "Deterministic core", object: "the calculator", note: "Vehicle costs and net pay per hour are calculated on the device. Money figures are exact, repeatable and don't need a network.", parts: ["calc"], seconds: 3.4 },
        { title: "IndexedDB", object: "three steel trays", note: "Deliveries, incidents and evidence files go into three local stores. The trays have no way out.", parts: ["trays"], seconds: 2.8 },
        { title: "AI, text only", object: "the slot and radio", note: "When there's signal, only text goes out: at most 20 evidence descriptions per request. The files themselves never leave the device.", parts: ["slot", "radio"], seconds: 4 },
        { title: "Check the reply", object: "the reply tray", note: "The model returns structured JSON, and it's parsed and validated before it reaches the screen. AI only interprets; it never calculates.", parts: ["reply", "radio"], seconds: 2.8 }
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
