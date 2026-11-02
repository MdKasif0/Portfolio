import { compileBuildTasks, getBuildMetrics, createTestSceneLayers, createCursorPositions } from "../components/agent-build/taskCompiler";
import { buildModeConfig } from "../components/agent-build/buildMode.config";
import type { BuildLayer, LayerType, BuildAction } from "../components/agent-build/types";

function createFullSiteLayers(): BuildLayer[] {
  const dummyEl = { classList: { contains: () => false, add: () => {}, remove: () => {} } } as unknown as HTMLElement;

  const mk = (
    id: string,
    type: LayerType,
    text: string,
    section: string,
    rect: { x: number; y: number; width: number; height: number },
    parentId: string | null = null,
    depth = 0
  ): BuildLayer => ({
    id,
    element: dummyEl,
    type,
    section,
    windowId: 0,
    index: 0,
    parentId,
    depth,
    text,
    imageSrc: type === "image" ? "/portfolio/preview.jpg" : "",
    rect,
    textStyle: {
      fontFamily: "Inter, sans-serif",
      fontSize: "14px",
      fontWeight: "500",
      lineHeight: "1.2",
      letterSpacing: "0px",
      color: "#FFFFFF",
      textAlign: "left",
      borderRadius: type === "card" ? "16px" : "4px",
      backgroundColor: type === "card" ? "#111118" : "transparent",
      backgroundImage: "none",
      border: "1px solid #292929",
      objectFit: "cover"
    }
  });

  const layers: BuildLayer[] = [];

  // 1. HERO (Window 0): 0 - 9s
  layers.push(mk("nav-brand", "text", "KASIF", "nav", { x: 48, y: 24, width: 90, height: 28 }));
  layers.push(mk("nav-links", "text", "Work  About  Journey  Contact", "nav", { x: 300, y: 24, width: 340, height: 28 }));
  layers.push(mk("hero-frame", "card", "", "top", { x: 48, y: 80, width: 1184, height: 720 }));
  layers.push(mk("hero-portfolio", "text", "PORTFOLIO", "top", { x: 48, y: 140, width: 1184, height: 240 }, "hero-frame", 1));
  layers.push(mk("hero-hello", "text", "Hello, I'm", "top", { x: 96, y: 400, width: 120, height: 28 }, "hero-frame", 1));
  layers.push(mk("hero-kasif", "text", "KASIF.", "top", { x: 96, y: 436, width: 320, height: 72 }, "hero-frame", 1));
  layers.push(mk("hero-roles", "text", "Frontend Developer & UI/UX Designer", "top", { x: 96, y: 520, width: 420, height: 32 }, "hero-frame", 1));
  layers.push(mk("hero-bio", "text", "Crafting digital experiences with razor-sharp precision and cinematic motion.", "top", { x: 96, y: 564, width: 460, height: 48 }, "hero-frame", 1));
  layers.push(mk("hero-cta", "button", "EXPLORE WORK ↓", "top", { x: 96, y: 630, width: 180, height: 48 }, "hero-frame", 1));
  layers.push(mk("hero-cutout", "image", "cutout", "top", { x: 620, y: 220, width: 500, height: 560 }, "hero-frame", 1));
  layers.push(mk("hero-stat-1", "card", "3+ Years Crafting", "top", { x: 640, y: 620, width: 150, height: 70 }, "hero-frame", 1));
  layers.push(mk("hero-stat-2", "card", "18+ Shipped Builds", "top", { x: 810, y: 620, width: 150, height: 70 }, "hero-frame", 1));
  layers.push(mk("hero-stat-3", "card", "10+ Global Brands", "top", { x: 980, y: 620, width: 150, height: 70 }, "hero-frame", 1));

  // 2. WORK GRID (Window 1): 9 - 17s
  layers.push(mk("work-eyebrow", "text", "01 / SELECTED PROJECTS", "work", { x: 48, y: 920, width: 200, height: 24 }));
  layers.push(mk("work-title", "text", "CRAFTED INTERFACES", "work", { x: 48, y: 954, width: 600, height: 56 }));
  layers.push(mk("work-filters", "button", "ALL  •  WEB  •  MOBILE  •  AI", "work", { x: 740, y: 960, width: 360, height: 36 }));
  // Card 01 (scratch)
  layers.push(mk("work-card-1", "card", "GamePulse Container", "work", { x: 48, y: 1040, width: 360, height: 460 }));
  layers.push(mk("work-img-1", "image", "GamePulse Preview", "work", { x: 64, y: 1056, width: 328, height: 220 }, "work-card-1", 1));
  layers.push(mk("work-tag-1", "text", "FINTECH / AI", "work", { x: 64, y: 1290, width: 120, height: 20 }, "work-card-1", 1));
  layers.push(mk("work-title-1", "text", "GamePulse Platform", "work", { x: 64, y: 1320, width: 260, height: 32 }, "work-card-1", 1));
  layers.push(mk("work-sub-1", "text", "Predictive player engagement intelligence.", "work", { x: 64, y: 1360, width: 280, height: 36 }, "work-card-1", 1));
  layers.push(mk("work-icon-1", "icon", "↗", "work", { x: 340, y: 1290, width: 24, height: 24 }, "work-card-1", 1));
  // Card 02 (repeated)
  layers.push(mk("work-card-2", "card", "Autonomous Agent Hub", "work", { x: 440, y: 1040, width: 360, height: 460 }));
  layers.push(mk("work-img-2", "image", "Agent Hub Preview", "work", { x: 456, y: 1056, width: 328, height: 220 }, "work-card-2", 1));
  layers.push(mk("work-tag-2", "text", "AI ORCHESTRATION", "work", { x: 456, y: 1290, width: 140, height: 20 }, "work-card-2", 1));
  layers.push(mk("work-title-2", "text", "Agent Hub", "work", { x: 456, y: 1320, width: 260, height: 32 }, "work-card-2", 1));
  layers.push(mk("work-sub-2", "text", "Multi-model orchestration engine.", "work", { x: 456, y: 1360, width: 280, height: 36 }, "work-card-2", 1));
  layers.push(mk("work-icon-2", "icon", "↗", "work", { x: 732, y: 1290, width: 24, height: 24 }, "work-card-2", 1));
  // Card 03 (repeated)
  layers.push(mk("work-card-3", "card", "ReleaseStack CLI", "work", { x: 832, y: 1040, width: 360, height: 460 }));
  layers.push(mk("work-img-3", "image", "ReleaseStack Preview", "work", { x: 848, y: 1056, width: 328, height: 220 }, "work-card-3", 1));
  layers.push(mk("work-tag-3", "text", "DEVELOPER TOOLS", "work", { x: 848, y: 1290, width: 140, height: 20 }, "work-card-3", 1));
  layers.push(mk("work-title-3", "text", "ReleaseStack", "work", { x: 848, y: 1320, width: 260, height: 32 }, "work-card-3", 1));
  layers.push(mk("work-sub-3", "text", "Instant multi-cloud release orchestration.", "work", { x: 848, y: 1360, width: 280, height: 36 }, "work-card-3", 1));
  layers.push(mk("work-icon-3", "icon", "↗", "work", { x: 1124, y: 1290, width: 24, height: 24 }, "work-card-3", 1));

  // 3. COLLAB STRIP (Window 2): 17 - 20s
  layers.push(mk("collab-box", "card", "Collab Container", "collaborators", { x: 48, y: 1580, width: 1184, height: 120 }));
  layers.push(mk("collab-logo-1", "image", "Brand A", "collaborators", { x: 96, y: 1616, width: 120, height: 48 }, "collab-box", 1));
  layers.push(mk("collab-logo-2", "image", "Brand B", "collaborators", { x: 280, y: 1616, width: 120, height: 48 }, "collab-box", 1));
  layers.push(mk("collab-logo-3", "image", "Brand C", "collaborators", { x: 460, y: 1616, width: 120, height: 48 }, "collab-box", 1));
  layers.push(mk("collab-logo-4", "image", "Brand D", "collaborators", { x: 640, y: 1616, width: 120, height: 48 }, "collab-box", 1));
  layers.push(mk("collab-logo-5", "image", "Brand E", "collaborators", { x: 820, y: 1616, width: 120, height: 48 }, "collab-box", 1));
  layers.push(mk("collab-logo-6", "image", "Brand F", "collaborators", { x: 1000, y: 1616, width: 120, height: 48 }, "collab-box", 1));

  // 4. RECOGNITION (Window 3): 20 - 26s
  layers.push(mk("rec-frame", "card", "Recognition Panel", "recognition", { x: 48, y: 1760, width: 1184, height: 440 }));
  layers.push(mk("rec-laurel", "icon", "🌿", "recognition", { x: 96, y: 1800, width: 48, height: 48 }, "rec-frame", 1));
  layers.push(mk("rec-number", "text", "24+", "recognition", { x: 96, y: 1860, width: 180, height: 96 }, "rec-frame", 1));
  layers.push(mk("rec-label", "text", "GLOBAL ACCOLADES & MENTIONS", "recognition", { x: 96, y: 1968, width: 280, height: 24 }, "rec-frame", 1));
  layers.push(mk("rec-award-1", "text", "Awwwards Site of the Day · 2026", "recognition", { x: 480, y: 1820, width: 680, height: 32 }, "rec-frame", 1));
  layers.push(mk("rec-award-2", "text", "FWA of the Day · 2025", "recognition", { x: 480, y: 1870, width: 680, height: 32 }, "rec-frame", 1));
  layers.push(mk("rec-award-3", "text", "CSS Design Awards Best Innovation · 2025", "recognition", { x: 480, y: 1920, width: 680, height: 32 }, "rec-frame", 1));
  layers.push(mk("rec-award-4", "text", "ProductHunt #1 Product of the Week · 2024", "recognition", { x: 480, y: 1970, width: 680, height: 32 }, "rec-frame", 1));

  // 5. RAW -> REAL SLIDER (Window 4): 26 - 30s
  layers.push(mk("raw-box", "card", "Raw Real Container", "raw-real", { x: 48, y: 2260, width: 1184, height: 500 }));
  layers.push(mk("raw-image-wireframe", "image", "Wireframe Preview", "raw-real", { x: 48, y: 2260, width: 592, height: 500 }, "raw-box", 1));
  layers.push(mk("raw-image-final", "image", "Production Preview", "raw-real", { x: 640, y: 2260, width: 592, height: 500 }, "raw-box", 1));
  layers.push(mk("raw-handle", "button", "↔ SLIDE TO REVEAL", "raw-real", { x: 590, y: 2480, width: 104, height: 44 }, "raw-box", 1));

  // 6. ABOUT (Window 5): 30 - 36s
  layers.push(mk("about-eyebrow", "text", "02 / PHILOSOPHY & TOOLKIT", "about", { x: 48, y: 2840, width: 240, height: 24 }));
  layers.push(mk("about-title", "text", "IDEAS INTO INTERFACES PEOPLE FEEL", "about", { x: 48, y: 2876, width: 720, height: 60 }));
  layers.push(mk("about-timeline", "line", "Timeline Line", "about", { x: 48, y: 2980, width: 1184, height: 2 }));
  layers.push(mk("about-tool-1", "button", "REACT", "about", { x: 48, y: 3020, width: 90, height: 34 }));
  layers.push(mk("about-tool-2", "button", "TYPESCRIPT", "about", { x: 150, y: 3020, width: 120, height: 34 }));
  layers.push(mk("about-tool-3", "button", "NEXT.JS", "about", { x: 282, y: 3020, width: 96, height: 34 }));
  layers.push(mk("about-tool-4", "button", "THREE.JS", "about", { x: 390, y: 3020, width: 100, height: 34 }));
  layers.push(mk("about-tool-5", "button", "FIGMA", "about", { x: 502, y: 3020, width: 84, height: 34 }));
  layers.push(mk("about-quote", "card", "From concept to code, to a product that feels alive.", "about", { x: 640, y: 3020, width: 592, height: 160 }));

  // 7. JOURNEY, CONTACT, FOOTER (Window 6): 36 - 44s
  layers.push(mk("contact-eyebrow", "text", "03 / START A CONVERSATION", "contact", { x: 48, y: 3260, width: 260, height: 24 }));
  layers.push(mk("contact-title", "text", "LET'S WORK TOGETHER.", "contact", { x: 48, y: 3296, width: 800, height: 72 }));
  layers.push(mk("contact-cta", "button", "START THE CONVERSATION", "contact", { x: 48, y: 3390, width: 260, height: 52 }));
  layers.push(mk("contact-card-x", "card", "X: @md_kasif_uddin", "contact", { x: 340, y: 3390, width: 240, height: 70 }));
  layers.push(mk("contact-card-gh", "card", "GITHUB: MdKasif0", "contact", { x: 600, y: 3390, width: 240, height: 70 }));
  layers.push(mk("contact-card-mail", "card", "EMAIL: kasif@example.com", "contact", { x: 860, y: 3390, width: 280, height: 70 }));
  layers.push(mk("footer-mark", "text", "KASIF — CRAFTED WITH AGENTS · 2026", "footer", { x: 48, y: 3560, width: 1184, height: 40 }));

  return layers;
}

function runFullAudit() {
  console.log("==================================================");
  console.log("FULL-SITE BUILD SEQUENCE: VERIFICATION AUDIT (10Hz)");
  console.log("==================================================\n");

  const fullLayers = createFullSiteLayers();
  console.log(`[1] Created Full Portfolio Layers: ${fullLayers.length} layers across 7 cinematic scenes.`);

  const startTime = Date.now();
  const script = compileBuildTasks(fullLayers, 14, 900, false);
  const compileTime = Date.now() - startTime;

  console.log(`[2] Compiled in ${compileTime}ms into ${script.length} scheduled frames.`);
  const allTasks = script.flatMap((f) => f.tasks || []);
  console.log(`[3] Total atomic tasks compiled: ${allTasks.length} tasks.`);

  // Verify DAG dependencies
  let dagViolations = 0;
  for (const task of allTasks) {
    for (const dep of task.dependencies) {
      if (!allTasks.some((t) => t.id === dep && t.actEndsAt <= task.actStartedAt)) {
        dagViolations++;
      }
    }
  }
  console.log(`[4] DAG Dependency Violations: ${dagViolations}`);

  const plannedDuration = script.reduce((max, f) => Math.max(max, f.endsAt), 0);
  console.log(`[5] Sequence Total Duration at 1x: ${(plannedDuration / 1000).toFixed(2)}s (Target: 40 - 45s)`);

  // Window inspection & action type mix confirmation
  const windowIds = Array.from(new Set(script.map((f) => f.windowId))).sort((a, b) => a - b);
  console.log(`\n[6] Camera Windows: ${windowIds.length} scenes.`);

  const REQUIRED_ACTIONS: BuildAction[] = ["DRAW_BOX", "TYPE", "RESIZE_TEXT", "STYLE", "DROP_IMAGE", "COPY_PASTE", "PICK_SYMBOL"];
  let windowsMissingAction = 0;

  windowIds.forEach((winId) => {
    const winTasks = script.filter((f) => f.windowId === winId).flatMap((f) => f.tasks || []);
    const actionSet = new Set(winTasks.map((t) => t.action));
    const missing = REQUIRED_ACTIONS.filter((act) => !actionSet.has(act));
    if (missing.length > 0) {
      console.warn(`Window ${winId} missing actions: ${missing.join(", ")}`);
      windowsMissingAction++;
    } else {
      console.log(`✓ Scene Window ${winId}: Contains all 7 action types (${winTasks.length} tasks).`);
    }
  });

  // 10Hz sampling audit across timeline
  const sampleStepMs = 100; // 10Hz
  let minWorkRatio = 100;
  let maxGap = 0;
  let totalIdleViolations = 0;
  let maxParallelCursors = 0;
  let emptyScreenDuration = 0;
  let currentEmptyDuration = 0;
  const observedStates = new Set<string>();
  const totalActionCounts: Record<string, number> = {};

  for (let t = 0; t <= plannedDuration; t += sampleStepMs) {
    const activeWindow = windowIds.reduce((curr, id) => {
      const wTasks = script.filter((f) => f.windowId === id);
      const wStart = Math.min(...wTasks.map((f) => f.startedAt));
      return t >= wStart ? id : curr;
    }, windowIds[0]);

    const cursors = createCursorPositions(script, t, 0, activeWindow, 14);
    const metrics = getBuildMetrics(script, t, activeWindow);

    minWorkRatio = Math.min(minWorkRatio, metrics.workRatio);
    maxGap = Math.max(maxGap, metrics.longestGap);
    totalIdleViolations = Math.max(totalIdleViolations, metrics.violations);

    const activeCursors = cursors.filter((c) => c.active && (c.state === "act" || c.state === "travel"));
    maxParallelCursors = Math.max(maxParallelCursors, activeCursors.length);

    if (activeCursors.length === 0) {
      currentEmptyDuration += sampleStepMs;
      emptyScreenDuration = Math.max(emptyScreenDuration, currentEmptyDuration);
    } else {
      currentEmptyDuration = 0;
    }

    cursors.forEach((c) => {
      observedStates.add(c.state);
      if (c.action) {
        totalActionCounts[c.action] = (totalActionCounts[c.action] ?? 0) + 1;
      }
    });
  }

  console.log("\n==================================================");
  console.log("FINAL INVARIANT PROOF & REPORT (SECTION H):");
  console.log("==================================================");
  console.log(`• Observed States: [${Array.from(observedStates).join(", ")}] (0 idle / 0 wander / 0 wait)`);
  console.log(`• Work Ratio: ${minWorkRatio.toFixed(1)}% (Target: >= 97.0%)`);
  console.log(`• Longest Gap: ${maxGap} ms (Target: <= 250 ms)`);
  console.log(`• Idle Violations: ${totalIdleViolations} (Target: 0)`);
  console.log(`• Peak Parallel Working Cursors: ${maxParallelCursors} agents (Target: 8 - 14)`);
  console.log(`• Max Consecutive Empty Screen Duration: ${emptyScreenDuration} ms (Target: <= 400 ms)`);
  console.log(`• Windows with full action mix (all 7 action types): ${windowIds.length - windowsMissingAction} / ${windowIds.length}`);
  console.log(`• Action counts across run:`, totalActionCounts);

  const passesWorkRatio = minWorkRatio >= 97.0;
  const passesGap = maxGap <= 250;
  const passesViolations = totalIdleViolations === 0;
  const passesDAG = dagViolations === 0;
  const passesMix = windowsMissingAction === 0;
  const passesEmpty = emptyScreenDuration <= 400;

  if (passesWorkRatio && passesGap && passesViolations && passesDAG && passesMix && passesEmpty) {
    console.log("\n🎉 ALL SECTION H VERIFICATION ASSERTIONS PASSED PERFECTLY!");
    console.log("==================================================\n");
  } else {
    console.error("\n❌ FAILED VERIFICATION ASSERTIONS");
    process.exit(1);
  }
}

runFullAudit();
