import { compileBuildTasks, getBuildMetrics, createTestSceneLayers, createCursorPositions } from "../components/agent-build/taskCompiler";
import { buildModeConfig } from "../components/agent-build/buildMode.config";

function runTestSceneAudit() {
  console.log("==================================================");
  console.log("AGENT BUILD ENGINE: INVARIANT VERIFICATION SUITE");
  console.log("==================================================\n");

  const layers = createTestSceneLayers();
  console.log(`[1] Created Test Scene: ${layers.length} layers (1 scratch card + 2 copy-pasted cards)`);

  const startTime = Date.now();
  const script = compileBuildTasks(layers, 14, 900, false);
  const compileTime = Date.now() - startTime;

  console.log(`[2] Compiled in ${compileTime}ms into ${script.length} scheduled frames.`);

  // Collect all tasks across all frames
  const allTasks = script.flatMap((f) => f.tasks || []);
  console.log(`[3] Total atomic sub-tasks generated: ${allTasks.length}`);

  // Invariant 1 & 5 Verification: Dependency checking & no gaps
  let dependencyViolations = 0;

  for (const task of allTasks) {
    for (const dep of task.dependencies) {
      if (!allTasks.some((t) => t.id === dep && t.actEndsAt <= task.actStartedAt)) {
        console.error(`❌ Dependency violation: Task ${task.id} started before dependency ${dep} completed!`);
        dependencyViolations++;
      }
    }
  }

  if (dependencyViolations === 0) {
    console.log("✓ Dependency DAG Verified: 0 dependency violations.");
  }

  // Audit agent work ratio and gaps over full timeline
  const plannedDuration = script.reduce((max, f) => Math.max(max, f.endsAt), 0);
  console.log(`[4] Total planned sequence duration: ${(plannedDuration / 1000).toFixed(2)}s`);

  let maxParallelAgents = 0;
  let minWorkRatio = 100;
  let maxGap = 0;
  let totalViolations = 0;
  const observedStates = new Set<string>();

  // Sample simulation at 60fps (every 16ms)
  const stepMs = 16;
  let activeWorkTicks = 0;
  let totalSampleTicks = 0;

  for (let t = 0; t <= plannedDuration; t += stepMs) {
    totalSampleTicks++;
    const cursors = createCursorPositions(script, t, 0, 0, 14);
    const metrics = getBuildMetrics(script, t);

    minWorkRatio = Math.min(minWorkRatio, metrics.workRatio);
    maxGap = Math.max(maxGap, metrics.longestGap);
    totalViolations = Math.max(totalViolations, metrics.violations);

    const activeCursors = cursors.filter((c) => c.active && (c.state === "act" || c.state === "travel"));
    maxParallelAgents = Math.max(maxParallelAgents, activeCursors.length);
    if (activeCursors.length > 0) activeWorkTicks++;

    cursors.forEach((c) => {
      observedStates.add(c.state);
      // Ensure only allowed states exist
      if (c.state !== "spawn" && c.state !== "travel" && c.state !== "act" && c.state !== "exit") {
        throw new Error(`Forbidden state detected: ${c.state}`);
      }
    });
  }

  console.log("\n==================================================");
  console.log("AUDIT RESULTS & INVARIANT PROOF:");
  console.log("==================================================");
  console.log(`• Observed Agent States: [${Array.from(observedStates).join(", ")}] (Zero idle/wander/wait states)`);
  console.log(`• Peak Parallel Working Agents: ${maxParallelAgents} agents`);
  console.log(`• Minimum Measured Work Ratio: ${minWorkRatio.toFixed(1)}% (Target: >= 97.0%)`);
  console.log(`• Longest Idle Gap between tasks: ${maxGap} ms (Target: <= 250 ms, Dev Watchdog)`);
  console.log(`• Idle Gap Violations (>250ms): ${totalViolations} (Target: 0)`);
  console.log(`• Dependency DAG Violations: ${dependencyViolations} (Target: 0)`);

  // Final assertions
  const passesWorkRatio = minWorkRatio >= 97.0;
  const passesGap = maxGap <= 250;
  const passesViolations = totalViolations === 0;
  const passesDAG = dependencyViolations === 0;
  const passesNoIdleState = !observedStates.has("idle") && !observedStates.has("wait") && !observedStates.has("wander");

  console.log("\n--------------------------------------------------");
  if (passesWorkRatio && passesGap && passesViolations && passesDAG && passesNoIdleState) {
    console.log("🎉 ALL INVARIANTS PASSED! ENGINE IS 100% PRODUCTION READY.");
  } else {
    console.error("❌ FAILED INVARIANT ASSERTIONS");
    process.exit(1);
  }
  console.log("==================================================\n");
}

runTestSceneAudit();
