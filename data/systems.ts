/**
 * The architecture shown on the site. Everything here is read from the projects' real source code
 * or measured on the live product. `source` says which, and is shown next to each number:
 * keep that honest when updating a figure.
 */

export type SystemFact = { value: string; label: string; source: "Measured" | "From the code" | "GitHub" };
export type TradeOff = { chose: string; over: string; why: string; cost: string };

/** One step of a request, played on the machine. `parts` are what light up; `object` says what they are in the machine. */
export type MachineStation = { title: string; object: string; note: string; parts: string[]; seconds: number };
export type Machine = { figure: "roaster" | "automaton" | "lantern"; object: string; stations: MachineStation[] };

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
    { title: "Scoring engine", object: "eight sieve drawers and a gauge", note: "Plain code across eight dimensions, out of 1,000. The burner sits well away from these drawers: no AI touches the number. The gauge shows my own 531.", parts: ["scale", "probe"], seconds: 4 },
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
    { title: "SpriteKit scene", object: "the governor", note: "She renders at 60 FPS awake and 15 asleep, and the scene pauses completely when her window is fully hidden. The governor shows that here, following her as she naps and wakes.", parts: ["governor"], seconds: 3.8 },
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
    id: "cookie",
    name: "Cookie",
    kicker: "Native desktop app",
    summary: "She runs all day beside your real work, so one stolen click or spinning fan gets her uninstalled. She knows where windows are but never what's in them, lets clicks fall through, and keeps everything on your machine.",
    machine: automatonMachine,
    facts: [
      { value: "0.4s", label: "Fastest window scan, with no screenshots", source: "From the code" },
      { value: "15 FPS", label: "While she sleeps, down from 60, and paused when hidden", source: "From the code" },
      { value: "126", label: "macOS unit tests", source: "From the code" },
      { value: "0", label: "Accounts, analytics or cloud calls", source: "From the code" }
    ],
    tradeOffs: [
      {
        chose: "Quartz window metadata",
        over: "Screenshots or screen analysis",
        why: "It gives window positions without capturing a single pixel, and scans are throttled to one every 0.4 seconds at most.",
        cost: "She knows where windows are, never what's in them, so she can't react to content."
      },
      {
        chose: "An alpha-mask hit test",
        over: "A rectangular click area",
        why: "A click on a transparent pixel goes through to the app underneath, and the same mask tells nose from tail for petting.",
        cost: "The mask has to stay in sync with the artwork."
      },
      {
        chose: "Frame rate that follows behavior",
        over: "A constant 60 FPS",
        why: "She renders at 60 FPS when active and 15 when asleep, and pauses completely when her window is hidden.",
        cost: "Every behavior change also has to think about rendering."
      }
    ],
    caseStudy: "cookie",
    href: "https://github.com/MdKasif0/Cookie"
  },
  {
    id: "crimson",
    name: "Shadow of the Crimson Gate",
    kicker: "Game engine in a browser",
    summary: "A full action game that opens from a link, so it has to live within a browser's limits on hardware I'll never see. There's no commercial engine: one loop drives my own combat, AI, world, audio and save systems on top of Three.js.",
    machine: lanternMachine,
    facts: [
      { value: "100ms", label: "Cap on delta time, so a slow frame can't break the game", source: "From the code" },
      { value: "59.9", label: "FPS during gameplay at 1080p on an Apple M5", source: "Measured" },
      { value: "191 KB", label: "Compressed JavaScript at first load", source: "Measured" },
      { value: "3", label: "Boss phases, changing at 70% and 35% health", source: "From the code" }
    ],
    tradeOffs: [
      {
        chose: "Three.js with my own game systems",
        over: "A full game engine",
        why: "It keeps the first load to 191 KB of compressed JavaScript, and I control the whole frame.",
        cost: "Combat, AI, cameras and saves were all mine to build and debug."
      },
      {
        chose: "Instanced meshes and particle pools",
        over: "One object per tree, rock and petal",
        why: "One draw call can render thousands of instances, and pooled particles avoid creating and collecting objects in the middle of a fight.",
        cost: "Individual instances are harder to animate and change."
      },
      {
        chose: "Frame-safety limits",
        over: "Trusting the browser's timing",
        why: "Delta time is capped at 100 ms, pixel ratio is capped at 2, and the game pauses when the tab is hidden.",
        cost: "A long stall briefly slows the game instead of catching up."
      }
    ],
    caseStudy: "shadow-of-the-crimson-gate",
    href: "https://github.com/MdKasif0/Shadow-of-the-Crimson-Gate"
  }
];
