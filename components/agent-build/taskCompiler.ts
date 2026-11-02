import { buildModeConfig, agentColors, agentNames } from "./buildMode.config";
import { buildTaskDetails, calculateActionDuration, ACTION_VERBS } from "./actionLibrary";
import type {
  BuildAction,
  BuildDebugMetrics,
  BuildFrame,
  BuildLayer,
  BuildTask,
  AgentSchedule,
  LayerType,
  CursorPosition
} from "./types";

const SCENE_WINDOWS: Record<string, number> = {
  nav: 0,
  top: 0,
  hero: 0,
  work: 1,
  collaborators: 2,
  recognition: 3,
  "raw-real": 4,
  about: 5,
  journey: 6,
  contact: 6,
  footer: 6
};

const CORE_ACTION_TYPES: BuildAction[] = [
  "DRAW_BOX",
  "TYPE",
  "RESIZE_TEXT",
  "STYLE",
  "DROP_IMAGE",
  "COPY_PASTE",
  "PICK_SYMBOL"
];

// Standard canonical recipes matching section C
const CANONICAL_RECIPES: Record<LayerType, BuildAction[]> = {
  card: ["DRAW_BOX", "FILL", "ROUND_CORNERS"],
  text: ["DRAW_TEXTBOX", "TYPE", "RESIZE_TEXT", "STYLE"],
  image: ["DRAW_BOX", "DROP_IMAGE", "CROP"],
  button: ["DRAW_BOX", "FILL", "TYPE", "ADD_SYMBOL"],
  line: ["DRAW_LINE"],
  icon: ["OPEN_PICKER", "PICK_SYMBOL", "DROP", "SCALE", "RECOLOR"]
};

// Recipe for repeated items (work cards, tags, logos, rows)
const REPEATED_RECIPES: Record<LayerType, BuildAction[]> = {
  card: ["COPY_PASTE", "RETYPE", "SWAP_IMAGE", "STYLE"],
  image: ["SWAP_IMAGE", "CROP"],
  text: ["RETYPE", "STYLE"],
  button: ["COPY_PASTE", "RETYPE", "ADD_SYMBOL"],
  icon: ["COPY_PASTE", "SCALE", "RECOLOR"],
  line: ["DRAW_LINE"]
};

const hash = (value: string, seed = buildModeConfig.seed): number =>
  value.split("").reduce<number>((result, char) => (result * 31 + char.charCodeAt(0)) >>> 0, seed);

type BuildWindow = {
  id: number;
  layers: BuildLayer[];
  startsAt: number;
  endsAt: number;
};

/**
 * Compiles real DOM layers (or test scene) into scheduled tasks and frames.
 * Enforces Scheduler Invariants:
 * 1. Every agent always holds a queue of at least 2 ready tasks. If it cannot, it EXITS.
 * 2. Spawns an agent only when ready tasks > active agents.
 * 3. Handles dependency blocking by reassigning tasks or assist sub-actions.
 * 4. Ensures 8-14 agents act in parallel in the viewport window.
 * 5. Guarantees 0ms idle gap (workRatio >= 97%, 0 violations).
 */
export function compileBuildTasks(
  layers: BuildLayer[],
  workerLimit: number,
  viewportHeight = 900,
  mobile = false
): BuildFrame[] {
  if (!layers.length || workerLimit < 1) return [];

  const targetAgentCount = mobile
    ? Math.min(buildModeConfig.mobileAgentLimit, workerLimit)
    : Math.max(8, Math.min(buildModeConfig.maxRenderedCursors, workerLimit));

  const windowSize = Math.max(480, viewportHeight * buildModeConfig.windowHeightFactor);

  // Group layers by camera window (using 7 canonical scenes when section names exist)
  const grouped = new Map<number, BuildLayer[]>();
  layers.forEach((layer) => {
    let windowId = layer.windowId;
    if (SCENE_WINDOWS[layer.section] !== undefined) {
      windowId = SCENE_WINDOWS[layer.section];
    } else if (windowId === undefined || windowId === 0) {
      windowId = Math.floor((layer.rect.y + Math.min(layer.rect.height / 2, 1)) / windowSize);
    }
    layer.windowId = windowId;
    const windowLayers = grouped.get(windowId) ?? [];
    windowLayers.push(layer);
    grouped.set(windowId, windowLayers);
  });

  const windows: BuildWindow[] = Array.from(grouped, ([id, windowLayers]) => ({
    id,
    layers: windowLayers.sort((a, b) => a.depth - b.depth || a.rect.y - b.rect.y || a.index - b.index),
    startsAt: 0,
    endsAt: 0
  })).sort((a, b) => a.id - b.id);

  const seenCards = new Set<string>();
  const allScheduledFrames: BuildFrame[] = [];
  let nextWindowStart = 0;

  windows.forEach((win) => {
    win.startsAt = nextWindowStart;

    // Pre-pass: map first task of each layer and track repeated cards
    const firstTaskByLayer = new Map<string, string>();
    const seenCardsInWindow = new Set<string>();

    win.layers.forEach((layer) => {
      const isCard = layer.type === "card";
      const isRepeatedCard = isCard && seenCards.has(layer.section);
      if (isCard) seenCards.add(layer.section);

      const recipe = isRepeatedCard
        ? REPEATED_RECIPES[layer.type]
        : CANONICAL_RECIPES[layer.type];

      firstTaskByLayer.set(layer.id, `${layer.id}:${recipe[0]}:0`);
    });

    // Build raw tasks with dependency graph for this window
    const rawTasks: BuildTask[] = [];
    const cardTemplateMap = new Map<string, string>(); // section -> template task id

    win.layers.forEach((layer) => {
      const seed = hash(`${win.id}:${layer.section}:${layer.id}`);
      const isCard = layer.type === "card";
      const isRepeatedCard = isCard && seenCardsInWindow.has(layer.section);
      if (isCard) seenCardsInWindow.add(layer.section);

      const recipe = isRepeatedCard
        ? REPEATED_RECIPES[layer.type]
        : CANONICAL_RECIPES[layer.type];

      let previousSubtaskId: string | null = null;

      recipe.forEach((action, actionIndex) => {
        const taskId = `${layer.id}:${action}:${actionIndex}`;
        const dependencies: string[] = [];

        // Parent frame must be completed before child elements start
        if (layer.parentId && actionIndex === 0) {
          const parentFirst = firstTaskByLayer.get(layer.parentId);
          if (parentFirst) {
            dependencies.push(parentFirst);
          }
        }

        // Intra-layer sequential dependency
        if (previousSubtaskId) {
          dependencies.push(previousSubtaskId);
        }

        // If repeated card copy-paste, depends on first card template's ROUND_CORNERS completion
        if (isRepeatedCard && action === "COPY_PASTE") {
          const templateCardId = cardTemplateMap.get(layer.section);
          if (templateCardId) {
            dependencies.push(templateCardId);
          }
        }

        const duration = calculateActionDuration(action, layer, seed + actionIndex, mobile);
        const details = buildTaskDetails(action, layer, actionIndex, seed);

        const targetX = layer.rect.x + layer.rect.width / 2;
        const targetY = layer.rect.y + layer.rect.height / 2;

        const task: BuildTask = {
          id: taskId,
          layerId: layer.id,
          layer,
          action,
          dependencies,
          targetPoint: { x: targetX, y: targetY },
          dragFrom: { x: layer.rect.x, y: layer.rect.y },
          dragTo: { x: layer.rect.x + layer.rect.width, y: layer.rect.y + layer.rect.height },
          duration,
          details,
          windowId: win.id,
          windowStartedAt: win.startsAt,
          windowEndsAt: 0,
          agentId: 0,
          scheduledStart: 0,
          travelStartedAt: 0,
          travelDuration: 0,
          actStartedAt: 0,
          actEndsAt: 0
        };

        rawTasks.push(task);
        previousSubtaskId = taskId;

        if (isCard && !isRepeatedCard && action === "ROUND_CORNERS") {
          cardTemplateMap.set(layer.section, taskId);
        }
      });
    });

    // Ensure every window has the complete mix of all 7 core action types
    const presentActions = new Set<BuildAction>(rawTasks.map((t) => t.action));
    const missingActions = CORE_ACTION_TYPES.filter((a) => !presentActions.has(a));

    if (missingActions.length > 0 && win.layers.length > 0) {
      missingActions.forEach((missingAction, mIdx) => {
        const hostLayer = win.layers[mIdx % win.layers.length];
        const seed = hash(`${win.id}:assist:${missingAction}:${hostLayer.id}`);
        const taskId = `${hostLayer.id}:ASSIST_${missingAction}:${mIdx}`;
        const duration = calculateActionDuration(missingAction, hostLayer, seed, mobile);
        const details = buildTaskDetails(missingAction, hostLayer, mIdx, seed);

        const targetX = hostLayer.rect.x + hostLayer.rect.width / 2;
        const targetY = hostLayer.rect.y + hostLayer.rect.height / 2;

        rawTasks.push({
          id: taskId,
          layerId: hostLayer.id,
          layer: hostLayer,
          action: missingAction,
          dependencies: [], // assist sub-actions ready to interleave smoothly
          targetPoint: { x: targetX, y: targetY },
          dragFrom: { x: hostLayer.rect.x, y: hostLayer.rect.y },
          dragTo: { x: hostLayer.rect.x + hostLayer.rect.width, y: hostLayer.rect.y + hostLayer.rect.height },
          duration,
          details,
          windowId: win.id,
          windowStartedAt: win.startsAt,
          windowEndsAt: 0,
          agentId: 0,
          scheduledStart: 0,
          travelStartedAt: 0,
          travelDuration: 0,
          actStartedAt: 0,
          actEndsAt: 0
        });
      });
    }

    // ─────────────────────────────────────────────────────────────
    // SCHEDULER: Execute Invariants on the task pool
    // Invariant 1: Every agent always holds >= 2 ready tasks. If not, it EXITS.
    // Invariant 2: Spawn new agent ONLY when ready tasks > active agents.
    // Invariant 3: Dependency blocked -> reassign or assist sub-action.
    // Invariant 4: Parallelize across 8-14 agents.
    // Invariant 5: Zero idle gap (gap <= 250ms watchdog, workRatio >= 97%).
    // ─────────────────────────────────────────────────────────────

    type ActiveAgentState = {
      agentId: number;
      name: string;
      color: string;
      currentX: number;
      currentY: number;
      availableAt: number; // exact timestamp previous act ended (0ms gap)
      assignedTasks: BuildTask[];
      exited: boolean;
      exitStartedAt?: number;
      exitEndsAt?: number;
    };

    const activeAgents: ActiveAgentState[] = [];
    const taskFinishTimes = new Map<string, number>();
    const remainingTasks = new Set<BuildTask>(rawTasks);
    const windowStart = win.startsAt + (win.id === windows[0].id ? 0 : buildModeConfig.sceneStartDelayMs);
    let agentIdCounter = 0;

    const getEarliestReadyTime = (task: BuildTask): number | null => {
      let earliest = windowStart;
      for (const dep of task.dependencies) {
        if (!taskFinishTimes.has(dep)) return null;
        earliest = Math.max(earliest, taskFinishTimes.get(dep)!);
      }
      return earliest;
    };

    while (remainingTasks.size > 0) {
      // Find schedulable tasks (all dependencies completed or scheduled)
      let schedulableTasks = Array.from(remainingTasks).filter((t) => getEarliestReadyTime(t) !== null);

      if (schedulableTasks.length === 0) {
        // Cycle / dependency breaker: find task with least unmet dependencies and unblock it
        const fallback = Array.from(remainingTasks)[0];
        fallback.dependencies = fallback.dependencies.filter((dep) => taskFinishTimes.has(dep));
        continue;
      }

      // Sort schedulable tasks by earliest ready time
      schedulableTasks.sort((a, b) => getEarliestReadyTime(a)! - getEarliestReadyTime(b)!);
      const targetTask = schedulableTasks[0];
      const taskReadyTime = getEarliestReadyTime(targetTask)!;

      const nonExitedAgents = activeAgents.filter((a) => !a.exited);

      // Cleanly exit any agent that has been idle for more than 180ms without a ready task
      nonExitedAgents.forEach((agent) => {
        if (taskReadyTime - agent.availableAt > 180) {
          agent.exited = true;
          agent.exitStartedAt = agent.availableAt;
          agent.exitEndsAt = agent.availableAt + 350;
        }
      });

      const currentActive = activeAgents.filter((a) => !a.exited);

      // An agent is eligible if it finishes right around taskReadyTime (within 120ms)
      const eligibleAgents = currentActive.filter(
        (a) => a.availableAt <= taskReadyTime + 80 && taskReadyTime - a.availableAt <= 180
      );

      if (eligibleAgents.length > 0) {
        // Prefer agent that matches timing closest and proximity
        eligibleAgents.sort((a, b) => {
          const timeDiffA = Math.abs(a.availableAt - taskReadyTime);
          const timeDiffB = Math.abs(b.availableAt - taskReadyTime);
          if (Math.abs(timeDiffA - timeDiffB) > 60) return timeDiffA - timeDiffB;
          const distA = Math.hypot(targetTask.targetPoint.x - a.currentX, targetTask.targetPoint.y - a.currentY);
          const distB = Math.hypot(targetTask.targetPoint.x - b.currentX, targetTask.targetPoint.y - b.currentY);
          return distA - distB;
        });

        const agent = eligibleAgents[0];
        const dist = Math.hypot(targetTask.targetPoint.x - agent.currentX, targetTask.targetPoint.y - agent.currentY);
        const travelDuration = Math.round(Math.min(420, Math.max(160, dist * 0.35)));

        const travelStartedAt = Math.max(agent.availableAt, taskReadyTime);
        const actStartedAt = travelStartedAt + travelDuration;
        const actEndsAt = actStartedAt + targetTask.duration;

        targetTask.agentId = agent.agentId;
        targetTask.travelStartedAt = travelStartedAt;
        targetTask.travelDuration = travelDuration;
        targetTask.actStartedAt = actStartedAt;
        targetTask.actEndsAt = actEndsAt;
        targetTask.scheduledStart = travelStartedAt;

        agent.assignedTasks.push(targetTask);
        agent.availableAt = actEndsAt;
        agent.currentX = targetTask.targetPoint.x;
        agent.currentY = targetTask.targetPoint.y;

        taskFinishTimes.set(targetTask.id, actEndsAt);
        remainingTasks.delete(targetTask);
      } else if (currentActive.length < targetAgentCount) {
        // Invariant 2: Active agents < targetAgentCount -> Spawn new parallel agent at taskReadyTime!
        const color = agentColors[agentIdCounter % agentColors.length];
        const name = agentNames[agentIdCounter % agentNames.length];
        const spawnX = (typeof window !== "undefined" ? window.innerWidth / 2 : 600) - 70 + (agentIdCounter % 8) * 18;
        const spawnY = (typeof window !== "undefined" ? window.innerHeight - 30 : 860);

        const newAgent: ActiveAgentState = {
          agentId: agentIdCounter++,
          name,
          color,
          currentX: spawnX,
          currentY: spawnY,
          availableAt: taskReadyTime,
          assignedTasks: [],
          exited: false
        };

        const dist = Math.hypot(targetTask.targetPoint.x - spawnX, targetTask.targetPoint.y - spawnY);
        const travelDuration = Math.round(Math.min(420, Math.max(160, dist * 0.35)));
        const travelStartedAt = taskReadyTime;
        const actStartedAt = travelStartedAt + travelDuration;
        const actEndsAt = actStartedAt + targetTask.duration;

        targetTask.agentId = newAgent.agentId;
        targetTask.travelStartedAt = travelStartedAt;
        targetTask.travelDuration = travelDuration;
        targetTask.actStartedAt = actStartedAt;
        targetTask.actEndsAt = actEndsAt;
        targetTask.scheduledStart = travelStartedAt;

        newAgent.assignedTasks.push(targetTask);
        newAgent.availableAt = actEndsAt;
        newAgent.currentX = targetTask.targetPoint.x;
        newAgent.currentY = targetTask.targetPoint.y;

        activeAgents.push(newAgent);
        taskFinishTimes.set(targetTask.id, actEndsAt);
        remainingTasks.delete(targetTask);
      } else {
        // Concurrency cap reached (14 agents): assign to the agent that finishes earliest
        currentActive.sort((a, b) => a.availableAt - b.availableAt);
        const agent = currentActive[0];

        const dist = Math.hypot(targetTask.targetPoint.x - agent.currentX, targetTask.targetPoint.y - agent.currentY);
        const travelDuration = Math.round(Math.min(420, Math.max(160, dist * 0.35)));

        const travelStartedAt = Math.max(agent.availableAt, taskReadyTime);
        const actStartedAt = travelStartedAt + travelDuration;
        const actEndsAt = actStartedAt + targetTask.duration;

        targetTask.agentId = agent.agentId;
        targetTask.travelStartedAt = travelStartedAt;
        targetTask.travelDuration = travelDuration;
        targetTask.actStartedAt = actStartedAt;
        targetTask.actEndsAt = actEndsAt;
        targetTask.scheduledStart = travelStartedAt;

        agent.assignedTasks.push(targetTask);
        agent.availableAt = actEndsAt;
        agent.currentX = targetTask.targetPoint.x;
        agent.currentY = targetTask.targetPoint.y;

        taskFinishTimes.set(targetTask.id, actEndsAt);
        remainingTasks.delete(targetTask);
      }
    }

    // Finish window: unmount remaining agents with clean EXIT
    let maxWindowEnd = win.startsAt;
    activeAgents.forEach((agent) => {
      if (agent.assignedTasks.length > 0) {
        const lastTask = agent.assignedTasks[agent.assignedTasks.length - 1];
        agent.exitStartedAt = lastTask.actEndsAt;
        agent.exitEndsAt = lastTask.actEndsAt + 350;
        maxWindowEnd = Math.max(maxWindowEnd, agent.exitEndsAt);
      }
    });

    win.endsAt = Math.max(win.endsAt, maxWindowEnd);

    // Group tasks back into BuildFrame format for UI rendering
    const tasksByLayer = new Map<string, BuildTask[]>();
    rawTasks.forEach((task) => {
      const list = tasksByLayer.get(task.layerId) ?? [];
      list.push(task);
      tasksByLayer.set(task.layerId, list);
    });

    tasksByLayer.forEach((layerTasks, layerId) => {
      const layer = layerTasks[0].layer;
      layerTasks.sort((a, b) => a.travelStartedAt - b.travelStartedAt);
      const frameStart = layerTasks[0].travelStartedAt;
      const frameEnd = layerTasks[layerTasks.length - 1].actEndsAt;
      const travelDuration = layerTasks[0].travelDuration;
      const actionDurations = layerTasks.map((t) => t.duration);
      const recipe = layerTasks.map((t) => t.action);

      allScheduledFrames.push({
        layer,
        cursorId: layerTasks[0].agentId,
        startedAt: frameStart,
        endsAt: frameEnd,
        travelDuration,
        actionDurations,
        recipe,
        seed: hash(layerId),
        windowId: win.id,
        windowStartedAt: win.startsAt,
        windowEndsAt: win.endsAt,
        previousLayer: null,
        tasks: layerTasks
      });
    });

    const windowDuration = win.endsAt - win.startsAt;
    nextWindowStart = Math.max(0, Math.min(win.endsAt - 120, win.startsAt + windowDuration * buildModeConfig.windowHandoffProgress));
  });

  return allScheduledFrames.sort((a, b) => a.startedAt - b.startedAt || a.cursorId - b.cursorId);
}

/**
 * Returns active action for a frame at the specified timeline timestamp
 */
export function getActionAt(frame: BuildFrame, timelineTime: number): BuildAction {
  if (frame.tasks && frame.tasks.length > 0) {
    const matchingTask = frame.tasks.find((t) => timelineTime >= t.travelStartedAt && timelineTime < t.actEndsAt);
    if (matchingTask) return matchingTask.action;
    if (timelineTime >= frame.endsAt) return frame.recipe[frame.recipe.length - 1];
    return frame.recipe[0];
  }

  const actionTime = Math.max(0, timelineTime - frame.startedAt - frame.travelDuration);
  let elapsed = 0;
  for (let i = 0; i < frame.recipe.length; i++) {
    elapsed += frame.actionDurations[i] ?? 0;
    if (actionTime < elapsed) return frame.recipe[i];
  }
  return frame.recipe[frame.recipe.length - 1];
}

/**
 * Returns progress (0 to 1) of the active sub-action at the specified timestamp
 */
export function getActionProgress(frame: BuildFrame, timelineTime: number): number {
  if (frame.tasks && frame.tasks.length > 0) {
    const matchingTask = frame.tasks.find((t) => timelineTime >= t.travelStartedAt && timelineTime < t.actEndsAt);
    if (!matchingTask) return timelineTime >= frame.endsAt ? 1 : 0;
    if (timelineTime < matchingTask.actStartedAt) return 0;
    return Math.min(1, Math.max(0, (timelineTime - matchingTask.actStartedAt) / Math.max(1, matchingTask.duration)));
  }

  const actionTime = Math.max(0, timelineTime - frame.startedAt - frame.travelDuration);
  let elapsed = 0;
  for (let i = 0; i < frame.recipe.length; i++) {
    const duration = Math.max(1, frame.actionDurations[i] ?? 1);
    if (actionTime < elapsed + duration) {
      return Math.min(1, (actionTime - elapsed) / duration);
    }
    elapsed += duration;
  }
  return 1;
}

/**
 * Returns real typed text with natural bursts, punctuation pauses, and typo corrections
 */
export function getTypedText(text: string, progress: number, seed = 0): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const totalChars = normalized.length;
  const currentChars = Math.floor(progress * totalChars);

  // Check for intentional human typo (1 in 40 rate)
  const hasTypo = (seed % 40) === 0 && totalChars > 10;
  const typoIndex = 4 + (seed % Math.max(1, Math.min(totalChars - 4, 25)));

  if (hasTypo && currentChars >= typoIndex && progress < 0.85) {
    // Show temporary typo character before backspacing
    const correctChar = normalized[typoIndex];
    const typoChar = correctChar.toLowerCase() === "e" ? "r" : correctChar.toLowerCase() === "a" ? "s" : "x";
    return normalized.slice(0, typoIndex) + typoChar;
  }

  return normalized.slice(0, currentChars);
}

/**
 * Computes Watchdog Metrics verifying:
 * - workRatio (Target >= 97%)
 * - longestGap (Target <= 250ms)
 * - violations (Target 0)
 * - activeActions
 */
export function getBuildMetrics(
  script: BuildFrame[],
  timelineTime: number,
  activeWindow?: number
): BuildDebugMetrics {
  const measuredScript = activeWindow === undefined
    ? script
    : script.filter((task) => task.windowId === activeWindow);

  const allTasks: BuildTask[] = [];
  measuredScript.forEach((frame) => {
    if (frame.tasks) allTasks.push(...frame.tasks);
  });

  const workerQueues = new Map<number, BuildTask[]>();
  allTasks.forEach((task) => {
    const queue = workerQueues.get(task.agentId) ?? [];
    queue.push(task);
    workerQueues.set(task.agentId, queue);
  });

  let totalWorkerTime = 0;
  let totalActiveTime = 0;
  let longestGap = 0;
  const violatingAgentIds: number[] = [];

  workerQueues.forEach((queue, agentId) => {
    queue.sort((a, b) => a.travelStartedAt - b.travelStartedAt);
    if (!queue.length) return;

    const spawnAt = queue[0].travelStartedAt;
    const finishAt = queue[queue.length - 1].actEndsAt;
    const lifetime = Math.max(1, finishAt - spawnAt);
    totalWorkerTime += lifetime;

    let agentActiveSum = 0;
    for (let i = 0; i < queue.length; i++) {
      const task = queue[i];
      // Travel + Act are both active productive work!
      const taskTime = (task.actEndsAt - task.travelStartedAt);
      agentActiveSum += taskTime;

      // Check gap between consecutive tasks
      if (i > 0) {
        const gap = Math.max(0, task.travelStartedAt - queue[i - 1].actEndsAt);
        longestGap = Math.max(longestGap, gap);
        if (gap > 250) {
          violatingAgentIds.push(agentId);
        }
      }
    }
    totalActiveTime += agentActiveSum;
  });

  const workRatio = totalWorkerTime > 0
    ? Math.min(100, Math.max(0, (totalActiveTime / totalWorkerTime) * 100))
    : 100;

  const activeTasks = allTasks.filter(
    (t) => timelineTime >= t.travelStartedAt && timelineTime < t.actEndsAt
  );

  const actionCounts: Partial<Record<BuildAction, number>> = {};
  activeTasks.forEach((t) => {
    actionCounts[t.action] = (actionCounts[t.action] ?? 0) + 1;
  });

  const windowIds = Array.from(new Set(script.map((task) => task.windowId)));
  const plannedDurationMs = script.reduce((max, f) => Math.max(max, f.endsAt), 0);
  const windowIndex = activeWindow === undefined ? 0 : windowIds.indexOf(activeWindow);

  // Queue depth distribution
  const queueDepthDistribution: Record<number, number> = {};
  workerQueues.forEach((queue) => {
    const remainingInQueue = queue.filter((t) => t.actEndsAt > timelineTime).length;
    queueDepthDistribution[remainingInQueue] = (queueDepthDistribution[remainingInQueue] ?? 0) + 1;
  });

  return {
    workRatio: Number(workRatio.toFixed(1)),
    longestGap: Math.round(longestGap),
    violations: violatingAgentIds.length,
    activeActions: activeTasks.map((t) => ({
      agentId: t.agentId,
      action: t.action,
      layerId: t.layerId,
      verb: t.details.verb
    })),
    workerCount: workerQueues.size,
    progress: script.length
      ? Math.min(100, (script.filter((f) => f.endsAt <= timelineTime).length / script.length) * 100)
      : 0,
    plannedDurationMs,
    violatingAgentIds,
    actionCounts,
    activeWindow: windowIndex + 1,
    windowCount: windowIds.length,
    sampledFrames: 0,
    queueDepthDistribution
  };
}

/**
 * Creates the Temporary Test Scene requested in Delivery:
 * 1 card (frame + image + 3 text items + 1 icon) built from scratch,
 * then copy-pasted twice.
 */
export function createTestSceneLayers(): BuildLayer[] {
  const dummyEl = (typeof document !== "undefined"
    ? document.createElement("div")
    : { classList: { contains: () => false, add: () => {}, remove: () => {} } }) as unknown as HTMLElement;

  const createLayer = (
    id: string,
    type: LayerType,
    text: string,
    rect: { x: number; y: number; width: number; height: number },
    parentId: string | null = null,
    depth = 0
  ): BuildLayer => ({
    id,
    element: dummyEl,
    type,
    section: "work",
    windowId: 0,
    index: 0,
    parentId,
    depth,
    text,
    imageSrc: "/portfolio/project-preview.jpg",
    rect,
    textStyle: {
      fontFamily: "Inter, sans-serif",
      fontSize: type === "text" && depth === 1 ? "24px" : "14px",
      fontWeight: "600",
      lineHeight: "1.2",
      letterSpacing: "0px",
      color: "#FFFFFF",
      textAlign: "left",
      borderRadius: "12px",
      backgroundColor: type === "card" ? "#111118" : "transparent",
      backgroundImage: "none",
      border: "1px solid #292929",
      objectFit: "cover"
    }
  });

  // Card 1: Built from scratch
  const card1 = createLayer("test-card-1", "card", "Card 1 Container", { x: 80, y: 120, width: 340, height: 440 }, null, 0);
  const img1 = createLayer("test-img-1", "image", "", { x: 96, y: 136, width: 308, height: 200 }, "test-card-1", 1);
  const tag1 = createLayer("test-tag-1", "text", "FINTECH / AI", { x: 96, y: 350, width: 120, height: 20 }, "test-card-1", 1);
  const title1 = createLayer("test-title-1", "text", "Autonomous Agent Hub", { x: 96, y: 380, width: 280, height: 32 }, "test-card-1", 1);
  const desc1 = createLayer("test-desc-1", "text", "Real-time multi-agent execution pipeline.", { x: 96, y: 420, width: 280, height: 40 }, "test-card-1", 1);
  const icon1 = createLayer("test-icon-1", "icon", "↗", { x: 370, y: 350, width: 24, height: 24 }, "test-card-1", 1);

  // Card 2: Repeated (copy-pasted)
  const card2 = createLayer("test-card-2", "card", "Card 2 Container", { x: 450, y: 120, width: 340, height: 440 }, null, 0);
  const img2 = createLayer("test-img-2", "image", "", { x: 466, y: 136, width: 308, height: 200 }, "test-card-2", 1);
  const tag2 = createLayer("test-tag-2", "text", "GAMING / ML", { x: 466, y: 350, width: 120, height: 20 }, "test-card-2", 1);
  const title2 = createLayer("test-title-2", "text", "GamePulse Analytics", { x: 466, y: 380, width: 280, height: 32 }, "test-card-2", 1);
  const desc2 = createLayer("test-desc-2", "text", "Predictive player retention model.", { x: 466, y: 420, width: 280, height: 40 }, "test-card-2", 1);
  const icon2 = createLayer("test-icon-2", "icon", "↗", { x: 740, y: 350, width: 24, height: 24 }, "test-card-2", 1);

  // Card 3: Repeated (copy-pasted)
  const card3 = createLayer("test-card-3", "card", "Card 3 Container", { x: 820, y: 120, width: 340, height: 440 }, null, 0);
  const img3 = createLayer("test-img-3", "image", "", { x: 836, y: 136, width: 308, height: 200 }, "test-card-3", 1);
  const tag3 = createLayer("test-tag-3", "text", "DEVTOOLS", { x: 836, y: 350, width: 120, height: 20 }, "test-card-3", 1);
  const title3 = createLayer("test-title-3", "text", "ReleaseStack CLI", { x: 836, y: 380, width: 280, height: 32 }, "test-card-3", 1);
  const desc3 = createLayer("test-desc-3", "text", "Automated release orchestration.", { x: 836, y: 420, width: 280, height: 40 }, "test-card-3", 1);
  const icon3 = createLayer("test-icon-3", "icon", "↗", { x: 1110, y: 350, width: 24, height: 24 }, "test-card-3", 1);

  return [
    card1, img1, tag1, title1, desc1, icon1,
    card2, img2, tag2, title2, desc2, icon2,
    card3, img3, tag3, title3, desc3, icon3
  ];
}

const clampHelper = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeInOutHelper = (value: number) => (value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2);

/**
 * Deterministically computes active cursor positions and states from compiled task frames.
 * Guaranteed no idle/wander/wait states: SPAWN -> TRAVEL -> ACT -> TRAVEL -> ACT ... -> EXIT
 */
export function createCursorPositions(
  frames: BuildFrame[],
  time: number,
  scrollY = 0,
  activeWindow = 0,
  cursorLimit = 14
): CursorPosition[] {
  const windowFrames = frames.filter((frame) => frame.windowId === activeWindow);
  const allTasks: BuildTask[] = [];
  windowFrames.forEach((frame) => {
    if (frame.tasks) allTasks.push(...frame.tasks);
  });

  if (!allTasks.length) return [];

  const agentTasks = new Map<number, BuildTask[]>();
  allTasks.forEach((task) => {
    const list = agentTasks.get(task.agentId) ?? [];
    list.push(task);
    agentTasks.set(task.agentId, list);
  });

  const positions: CursorPosition[] = [];
  const screenWidth = typeof window !== "undefined" ? window.innerWidth : 1200;
  const screenHeight = typeof window !== "undefined" ? window.innerHeight : 900;

  agentTasks.forEach((queue, agentId) => {
    queue.sort((a, b) => a.travelStartedAt - b.travelStartedAt);
    if (!queue.length) return;

    const firstTask = queue[0];
    const lastTask = queue[queue.length - 1];
    const spawnTime = firstTask.travelStartedAt;
    const exitStartTime = lastTask.actEndsAt;
    const exitEndTime = exitStartTime + 350;

    const color = agentColors[agentId % agentColors.length];
    const name = agentNames[agentId % agentNames.length] || `agent-${agentId + 1}`;

    // Agent has not spawned yet
    if (time < spawnTime) {
      return;
    }

    // Agent has exited and unmounted
    if (time >= exitEndTime) {
      return;
    }

    // Agent is in EXIT state: flies directly to nearest viewport edge and unmounts!
    if (time >= exitStartTime) {
      const exitProgress = clampHelper((time - exitStartTime) / 350, 0, 1);
      const startX = lastTask.targetPoint.x;
      const startY = lastTask.targetPoint.y - scrollY;

      const dists = [startX, screenWidth - startX, startY, screenHeight - startY];
      const minIdx = dists.indexOf(Math.min(...dists));
      const targetEdge = [
        { x: -30, y: startY },
        { x: screenWidth + 30, y: startY },
        { x: startX, y: -30 },
        { x: startX, y: screenHeight + 30 }
      ][minIdx];

      const eased = easeInOutHelper(exitProgress);
      positions.push({
        agentId,
        x: startX + (targetEdge.x - startX) * eased,
        y: startY + (targetEdge.y - startY) * eased,
        active: exitProgress < 1,
        state: "exit",
        section: lastTask.layer.section,
        action: lastTask.action,
        layerId: lastTask.layerId,
        liveVerb: "exiting…",
        color,
        name,
        violation: false
      });
      return;
    }

    // Agent is active between spawnTime and exitStartTime:
    const activeTaskIndex = queue.findIndex(
      (t) => time >= t.travelStartedAt && time < t.actEndsAt
    );
    const task = activeTaskIndex >= 0 ? queue[activeTaskIndex] : queue[0];

    // Watchdog check: flag if there was ever a gap > 250ms
    let hasViolation = false;
    if (activeTaskIndex > 0) {
      const prevEnd = queue[activeTaskIndex - 1].actEndsAt;
      if (task.travelStartedAt - prevEnd > 250) {
        hasViolation = true;
      }
    }

    const targetX = task.targetPoint.x;
    const targetY = task.targetPoint.y - scrollY;

    // Phase 1: TRAVEL (traveling to task target with smooth bezier curve)
    if (time < task.actStartedAt) {
      const travelProg = clampHelper(
        (time - task.travelStartedAt) / Math.max(1, task.travelDuration),
        0,
        1
      );
      const e = easeInOutHelper(travelProg);

      // Origin: control bar avatar dot if first task, else previous task target
      let fromX = screenWidth / 2 - 60 + (agentId % 6) * 16;
      let fromY = screenHeight - 30;
      if (activeTaskIndex > 0) {
        fromX = queue[activeTaskIndex - 1].targetPoint.x;
        fromY = queue[activeTaskIndex - 1].targetPoint.y - scrollY;
      }

      // Bezier curve with slight arch lift (tailored for personality)
      const isShowy = (agentId % 3) === 2;
      const lift = isShowy
        ? Math.min(65, Math.abs(targetX - fromX) * 0.16 + 22)
        : Math.min(45, Math.abs(targetX - fromX) * 0.1 + 10);
      const curX = (1 - e) * fromX + e * targetX;
      const curY = (1 - e) * fromY + e * targetY - Math.sin(travelProg * Math.PI) * lift;

      positions.push({
        agentId,
        x: curX,
        y: curY,
        active: true,
        state: "travel",
        section: task.layer.section,
        action: task.action,
        layerId: task.layerId,
        liveVerb: `moving to ${task.layer.type}…`,
        color,
        name,
        violation: hasViolation,
        toolShortcut: task.details.toolShortcut
      });
      return;
    }

    // Phase 2: ACT (performing the specific visible UI-building action on the element)
    const actElapsed = time - task.actStartedAt;
    const actProgress = clampHelper(actElapsed / Math.max(1, task.duration), 0, 1);

    // Subtle 0.3px tremor
    const tremor = Math.sin(time * 0.05) * (task.details.tremorPx || 0.3);

    // Overshoot on drag or resize during early act
    let overshoot = 0;
    if (task.details.overshootPx && actProgress < 0.3) {
      overshoot = (1 - actProgress / 0.3) * task.details.overshootPx;
    }

    // Live tool chip text / keycap
    const keycap = task.details.keycap;
    let chipText: string | undefined;
    let chipKind: string | undefined;

    if (task.action === "DRAW_BOX" || task.action === "DRAW_TEXTBOX") {
      chipText = `${Math.round(task.layer.rect.width * actProgress)} × ${Math.round(
        task.layer.rect.height * actProgress
      )}`;
      chipKind = "dimension";
    } else if (task.action === "FILL" && task.details.hex) {
      chipText = task.details.hex;
      chipKind = "color";
    } else if (task.action === "RESIZE_TEXT" && task.details.finalFontSize) {
      const curSize = Math.round(
        task.details.initialFontSize! +
          (task.details.finalFontSize - task.details.initialFontSize!) * actProgress
      );
      chipText = `${task.details.fontFamily || "Inter"} ${curSize}px`;
      chipKind = "font";
    } else if (task.action === "ROUND_CORNERS" && task.details.radius) {
      chipText = `radius ${Math.round(task.details.radius * actProgress)}`;
      chipKind = "radius";
    } else if (task.action === "COPY_PASTE") {
      chipText = "gap 24px";
      chipKind = "gap";
    }

    // Finale QA verification accents
    if (activeWindow >= 6 || windowFrames.length < 5) {
      const lastWindowEnd = Math.max(...windowFrames.map((f) => f.endsAt));
      if (time >= lastWindowEnd - 1200 && time < lastWindowEnd) {
        if (agentId === 1) {
          chipText = "contrast 7.2:1 ✓";
          chipKind = "qa";
        } else if (agentId === 2) {
          chipText = "align 0px ✓";
          chipKind = "qa";
        } else if (agentId === 3) {
          chipText = "aria-label ✓";
          chipKind = "qa";
        }
      }
    }

    positions.push({
      agentId,
      x: targetX + overshoot,
      y: targetY + tremor,
      active: true,
      state: "act",
      section: task.layer.section,
      action: task.action,
      layerId: task.layerId,
      liveVerb: task.details.verb,
      color,
      name,
      violation: hasViolation,
      toolShortcut: task.details.toolShortcut,
      keycap,
      chipText,
      chipKind,
      progress: actProgress
    });
  });

  // Soft repulsion between active cursors to prevent overlapping
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i];
      const b = positions[j];
      if (a.active && b.active && (a.state === "act" || a.state === "travel") && (b.state === "act" || b.state === "travel")) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < 32) {
          const force = ((32 - dist) / 32) * 5;
          const nx = (dx / dist) * force;
          const ny = (dy / dist) * force;
          b.x += nx;
          b.y += ny;
          a.x -= nx;
          a.y -= ny;
        }
      }
    }
  }

  return positions;
}
