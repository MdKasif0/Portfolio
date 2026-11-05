/**
 * Engineering notes: the "What broke" stories from the case studies, told properly. Every date, line of
 * code and number comes from the project's git history. Code excerpts are verbatim. Keep it that way.
 */

export type NoteBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "code"; file: string; href: string; lang: string; code: string };

export type Note = {
  slug: string;
  title: string;
  deck: string;
  description: string;
  /** ISO date of the fix. */
  date: string;
  dateLabel: string;
  project: string;
  projectHref: string;
  keyNumber: { value: string; label: string };
  blocks: NoteBlock[];
};

export const notes: Note[] = [
  {
    slug: "fallback-list-with-one-model",
    title: "My fallback list only held one model",
    deck: "After an outage I added a loop that retries with another LLM. It looked right, it had error handling, and for a month it had nothing to fall back to.",
    description: "How a JavaScript Set quietly turned GitRoasted's LLM fallback list into a list of one, and why a fallback you've never seen fire isn't one yet.",
    date: "2026-11-05",
    dateLabel: "Nov 2026",
    project: "GitRoasted",
    projectHref: "/work/gitroasted",
    keyNumber: { value: "1", label: "Model in my two-model fallback list" },
    blocks: [
      { kind: "p", text: "GitRoasted scores a GitHub profile in plain code, then asks an LLM on Groq to write the roast. For a while that was a single call to a single hosted model, with the model's name in the source." },
      { kind: "p", text: "On 2 October 2026, Groq started returning 404 for that model, and every roast failed. There was one path, and it was gone." },
      { kind: "h", text: "The fix that wasn't" },
      { kind: "p", text: "I replaced the model and, so the next dead model wouldn't take the site down, wrapped the call in a loop over candidate models. The loop tries each one, logs the failure and moves on. This is the list it looped over:" },
      { kind: "code", file: "src/ai/flows/generate-github-roast.ts, October", href: "https://github.com/MdKasif0/GitRoasted/commit/f7b05fe", lang: "ts", code: `const preferredModel = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';
const candidateModels = Array.from(
  new Set([preferredModel, 'qwen/qwen3.8-27b'])
);` },
      { kind: "p", text: "When GROQ_MODEL isn't set, the default and the second entry are the same string, and a Set removes duplicates. So the list has exactly one model in it. The retry logic worked. It just had nothing to retry with, and nothing about that fails until the day you need it." },
      { kind: "h", text: "The actual fix" },
      { kind: "p", text: "I found it a month later, on 5 November, while reviewing the whole roast path. The change is one more string, from a different family of model:" },
      { kind: "code", file: "src/ai/flows/generate-github-roast.ts, now", href: "https://github.com/MdKasif0/GitRoasted/commit/6eb3052", lang: "ts", code: `const candidateModels = Array.from(
  new Set([preferredModel, 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'])
);` },
      { kind: "h", text: "What I took from it" },
      { kind: "p", text: "A fallback you've never watched fire is a comment that happens to compile. Reading this code, I saw a list, a loop and error handling, and my brain filed it as handled. What I should have done is make the first model fail on purpose and watch the second one answer. That test would have taken five minutes and failed the same day. It's next on the list." }
    ]
  },
  {
    slug: "should-be-secured-in-production",
    title: "“Should be secured in production” was in production",
    deck: "A Firestore rule written for a demo stayed live for almost a year, with a comment on the same line saying exactly what was wrong with it.",
    description: "How a demo Firestore rule left GitRoasted's leaderboard writable by anyone for almost a year, and how writes moved to the server with the Firebase Admin SDK.",
    date: "2026-11-05",
    dateLabel: "Nov 2026",
    project: "GitRoasted",
    projectHref: "/work/gitroasted",
    keyNumber: { value: "347", label: "Days a demo rule stayed live" },
    blocks: [
      { kind: "p", text: "GitRoasted has a public leaderboard, stored in Firestore. On 23 November 2025 I added the security rules, and the write rule looked like this:" },
      { kind: "code", file: "firestore.rules, November 2025", href: "https://github.com/MdKasif0/GitRoasted/commit/cedb6ea", lang: "txt", code: `allow write: if true; // Open for demo purposes, should be secured in production` },
      { kind: "p", text: "The comment is correct and it did nothing. The demo became the product, the rule stayed, and I stopped reading that file. It was still there on 5 November 2026, 347 days later." },
      { kind: "h", text: "Why it mattered" },
      { kind: "p", text: "A Firebase web config isn't a secret. It ships to every browser, by design, and security rules are what stand between that config and your data. With this rule, anyone with the config could have edited or deleted any leaderboard entry from a browser console." },
      { kind: "h", text: "The fix" },
      { kind: "p", text: "Writes moved to the server. The server action now saves entries through the Firebase Admin SDK, with a service account held in a server-only environment variable. The Admin SDK bypasses security rules, so the rules can refuse every client write and still leave reads public:" },
      { kind: "code", file: "firestore.rules, now", href: "https://github.com/MdKasif0/GitRoasted/commit/6eb3052", lang: "txt", code: `// Entries are written only by the server, through the Admin SDK, which bypasses these rules.
allow write: if false;` },
      { kind: "p", text: "I also added firebase.json and .firebaserc, so the rules deploy from the repository instead of living only in a console, and checked from outside that an anonymous write now gets a 403." },
      { kind: "h", text: "What I took from it" },
      { kind: "p", text: "“Should be fixed later” comments aren't a plan, because nothing ever brings you back to them. If a shortcut only makes sense for a demo, the launch checklist has to name it, or it ships with the product." }
    ]
  },
  {
    slug: "clamp-needs-a-range",
    title: "A clamp only works if its range exists",
    deck: "Cookie jumps onto your windows and must never land near a corner. The line that kept her safe had two quiet bugs, and one of them only appeared on narrow windows.",
    description: "Two bugs in one line of Swift: how Cookie's jump planner kept landing near window corners, and the hidden precondition in every clamp.",
    date: "2026-10-11",
    dateLabel: "Oct 2026",
    project: "Cookie",
    projectHref: "/work/cookie",
    keyNumber: { value: "25 pt", label: "Safe distance from a window's corners" },
    blocks: [
      { kind: "p", text: "Cookie is a tiny cat that walks along the top of your windows. Before she jumps to a new one, the planner picks a landing point, and that point has to stay at least 25 points from either corner, or she appears to stand on nothing. Here's the line that was meant to guarantee it:" },
      { kind: "code", file: "Cookie/Window/JumpPlanner.swift, before", href: "https://github.com/MdKasif0/Cookie/commit/32aa7e7", lang: "swift", code: `let clampedX = max(surface.bounds.minX + inset, min(surface.bounds.maxX - inset, startPoint.x))` },
      { kind: "h", text: "Two bugs in one line" },
      { kind: "p", text: "The first is what it clamps. startPoint.x is where she's standing now. If the target window is off to one side, her position is outside its range, so the clamp pins her to the nearest allowed spot: exactly 25 points from the corner, every time. The rule meant to keep her away from the edge was sending her as close to it as it allowed." },
      { kind: "p", text: "The second is hiding in the bounds. A clamp assumes the lower bound is below the upper one. On a window narrower than 50 points, minX + inset is past maxX - inset, the range doesn't exist, and the expression still returns a number. It just isn't a safe one." },
      { kind: "h", text: "The fix" },
      { kind: "p", text: "Clamp the landing point the surface already chose, which is the middle of the window's top edge, and only when the corridor really exists. On a window too narrow to have one, the middle is the best answer anyway:" },
      { kind: "code", file: "Cookie/Window/JumpPlanner.swift, now", href: "https://github.com/MdKasif0/Cookie/blob/main/Cookie/Window/JumpPlanner.swift", lang: "swift", code: `let minX = surface.bounds.minX + inset
let maxX = surface.bounds.maxX - inset
if minX <= maxX {
    landingPt.x = max(minX, min(maxX, surface.landingPoint.x))
}` },
      { kind: "h", text: "What I took from it" },
      { kind: "p", text: "Every clamp has a precondition nobody writes down: low must not exceed high. When the bounds are computed from something the user controls, like the size of their windows, it's worth checking. And when a value keeps landing exactly on a limit, the limit is probably working and the input is probably wrong." }
    ]
  },
  {
    slug: "fifteen-minute-lantern-fix",
    title: "I fixed the lighting by deleting the lanterns. It lasted 15 minutes.",
    deck: "Every lantern in Shadow of the Crimson Gate carries a real light, and real lights have a price in WebGL. The obvious fix made the world worse, so I undid it.",
    description: "Why every point light costs something in Three.js even when it's far away, and an honest account of a performance fix in a browser game that lasted 15 minutes.",
    date: "2026-08-22",
    dateLabel: "Aug 2026",
    project: "Shadow of the Crimson Gate",
    projectHref: "/work/shadow-of-the-crimson-gate",
    keyNumber: { value: "15 min", label: "How long the fix lasted" },
    blocks: [
      { kind: "p", text: "Lanterns line the paths in Shadow of the Crimson Gate, and each one is a prefab with a real point light inside it. It's what makes the world glow at night:" },
      { kind: "code", file: "src/game/world/LanternGenerator.ts", href: "https://github.com/MdKasif0/Shadow-of-the-Crimson-Gate/blob/main/src/game/world/LanternGenerator.ts", lang: "ts", code: `const pointLight = new THREE.PointLight(0xffaa44, 1, 8);
pointLight.position.set(0, 2.5, 0);
prefab.add(pointLight);` },
      { kind: "h", text: "Why that gets expensive" },
      { kind: "p", text: "That 8 is how far the light reaches, not how far its cost reaches. Three.js doesn't cull lights per object in its standard renderer, so lit materials are compiled to account for every point light in the scene, including the ones a kilometre away. Each light takes up uniforms, and a GPU only has so many. Add enough lanterns and you run into the limit." },
      { kind: "h", text: "The fix, at 01:01" },
      { kind: "p", text: "So at one in the morning on 22 August, I took the direct route: two lanterns in the whole world, and none in the arena." },
      { kind: "code", file: "Commit 4b027f6, 01:01", href: "https://github.com/MdKasif0/Shadow-of-the-Crimson-Gate/commit/4b027f6", lang: "ts", code: `const numLanterns = 0; // Disabled to avoid max point light shader limits
const lanternCount = 2; // Reduced drastically to avoid shader light limits` },
      { kind: "h", text: "The undo, at 01:16" },
      { kind: "p", text: "It solved the problem and removed the reason to walk those paths at night. Fifteen minutes later they were back, in a commit whose message simply says it's for environment density." },
      { kind: "code", file: "Commit 60a9ae5, 01:16", href: "https://github.com/MdKasif0/Shadow-of-the-Crimson-Gate/commit/60a9ae5", lang: "ts", code: `const numLanterns = 8;
const lanternCount = 20; // Increased for expanded world` },
      { kind: "h", text: "Where that leaves it" },
      { kind: "p", text: "I chose the look, and I still owe the fix. The game holds 59.9 FPS in my test at 1080p on an Apple M5, which is a fast machine and says little about the integrated GPU in a cheap laptop. The real answer is a small pool of lights that follow the player to the nearest lanterns, while the rest glow through the emissive material they already have. Until that exists, I'd rather say so here than let a commit message that says “fix” stand for it." }
    ]
  }
];

export const noteFor = (slug: string) => notes.find((note) => note.slug === slug);
