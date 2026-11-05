/**
 * The architecture shown on the site. Everything here is read from the projects' real source code
 * or measured on the live product. `source` says which, and is shown next to each number:
 * keep that honest when updating a figure.
 */

export type SystemFact = { value: string; label: string; source: "Measured" | "From the code" | "GitHub" };
export type TradeOff = { chose: string; over: string; why: string; cost: string };

/** One step of a request, played on the machine. `parts` are what light up; `object` says what they are in the machine. */
export type MachineStation = { title: string; object: string; note: string; parts: string[]; seconds: number };
export type Machine = { figure: "roaster" | "referee" | "fieldcase" | "automaton" | "lantern"; object: string; stations: MachineStation[] };

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

export const roasterMachine: Machine = {
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
};

export const automatonMachine: Machine = {
  figure: "automaton",
  object: "A clockwork desk automaton",
  stations: [
    { title: "Window list", object: "the measuring arm and three blank panels", note: "Quartz's window list gives Cookie the position of every window, at most once every 0.4 seconds. The arm only ever touches corners: she gets bounds and no screenshots, so she can't see what's on your screen.", parts: ["scanner", "windows"], seconds: 3.4 },
    { title: "Behavior engine", object: "the pinned drum and its comb", note: "A state machine picks what she does next, with a scheduler, cooldowns and context rules. The dial is the minimum wait between actions on her own: 28, 14 or 7 seconds, depending on her activity setting.", parts: ["drum"], seconds: 3.2 },
    { title: "Jump planner", object: "the drafting board", note: "Each jump is a parabola from where she stands to a window's top edge. A landing too close to the edge is clamped 25 points inside, which is the dashed arc correcting itself.", parts: ["board", "windows", "dock"], seconds: 4.4 },
    { title: "SpriteKit scene", object: "the governor", note: "She renders at 60 FPS awake and 15 asleep, and the scene pauses completely when her window is fully hidden. The governor is slowed here so you can watch it.", parts: ["governor"], seconds: 3.8 },
    { title: "Alpha-mask hit test", object: "the glass mask", note: "She lives in a floating panel, but it never steals a click. Her artwork is sampled into a 96 × 101 grid. A click on a clear cell passes through to the app underneath, and one on her artwork is hers.", parts: ["mask"], seconds: 3.8 },
    { title: "Local JSON", object: "the strongbox with no wires", note: "Her profile, stats and memory are written atomically to one JSON file, and a corrupt file gets quarantined instead of crashing her. There's no account, analytics or cloud. The only network feature is the signed updater.", parts: ["store"], seconds: 3 }
  ]
};

export const lanternMachine: Machine = {
  figure: "lantern",
  object: "A magic-lantern rig",
  stations: [
    { title: "One game loop", object: "the crankshaft and the dial with a stop pin", note: "One requestAnimationFrame loop drives the whole game, updating and then rendering. A slow frame can only push delta time up to the pin at 100 ms, so a hitch slows the game instead of throwing enemies through walls.", parts: ["loop", "dt"], seconds: 3.8 },
    { title: "Combat and AI", object: "three cams and the health column", note: "Dashes, combos and hitboxes sit alongside state machines for the yokai and the Crimson Oni. The boss changes phase at 70% and 35% health, which the third cam shows by growing another lobe.", parts: ["cams", "boss"], seconds: 4.2 },
    { title: "World and VFX", object: "the tree tray, its lever and the petal ring", note: "Every tree on the tray is the same mesh, placed by one action: an InstancedMesh is one draw call. Particles come from a pool, so petals are reused rather than created and collected in the middle of a fight.", parts: ["forest"], seconds: 3.8 },
    { title: "Three.js renderer", object: "the lantern and screen", note: "WebGL with ACES filmic tone mapping turns the raw frame into the final picture. Pixel ratio is capped at 2, so a very sharp display can't quietly double the work.", parts: ["lantern", "screen"], seconds: 4 },
    { title: "Audio engine", object: "the mixing desk", note: "Web Audio buses over 81 WAV samples, with ambience by zone. These faders sit at the real levels from the code: master 0.7, music 0.5, ambience 0.6, SFX 0.8 and UI 0.5.", parts: ["audio"], seconds: 3.2 },
    { title: "Versioned save", object: "the stamped tin", note: "Progress goes to localStorage with a version number. On load, broken JSON or missing fields reset the save, so a damaged file can't stop the game from starting.", parts: ["save"], seconds: 3.2 }
  ]
};

export const systems: System[] = [
  {
    id: "gitroasted",
    name: "GitRoasted",
    kicker: "AI pipeline",
    summary: "One request crosses GitHub, a scoring engine, an LLM and a database. The number comes from code and the words come from AI, so the score stays repeatable while the roast stays personal.",
    machine: roasterMachine,
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
