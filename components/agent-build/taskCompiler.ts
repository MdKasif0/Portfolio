import { buildModeConfig } from "@/components/agent-build/buildMode.config";
import type { BuildAction, BuildDebugMetrics, BuildFrame, BuildLayer } from "@/components/agent-build/types";

const recipes: Record<BuildLayer["type"], BuildAction[]> = {
  text: ["DRAW_TEXTBOX", "TYPE", "RESIZE_TEXT", "STYLE"],
  image: ["DRAW_BOX", "DROP_IMAGE", "CROP"],
  button: ["DRAW_BOX", "FILL", "TYPE", "ADD_SYMBOL"],
  card: ["DRAW_BOX", "FILL", "TYPE", "ROUND_CORNERS", "DROP_IMAGE"],
  line: ["DRAW_LINE"],
  icon: ["OPEN_PICKER", "PICK_SYMBOL", "DROP", "SCALE", "RECOLOR"]
};

const copyRecipe: BuildAction[] = ["COPY_PASTE", "RETYPE", "SWAP_IMAGE", "STYLE"];
const hash = (value: string) => value.split("").reduce<number>((result, character) =>
  (result * 31 + character.charCodeAt(0)) >>> 0, buildModeConfig.seed);

type BuildWindow = { id: number; layers: BuildLayer[]; startsAt: number; endsAt: number };

export function compileBuildTasks(
  layers: BuildLayer[],
  workerLimit: number,
  viewportHeight = 900,
  mobile = false
): BuildFrame[] {
  if (!layers.length || workerLimit < 1) return [];
  const workerCount = Math.min(workerLimit, buildModeConfig.maxRenderedCursors, layers.length);
  const windowSize = Math.max(480, viewportHeight * buildModeConfig.windowHeightFactor);
  const grouped = new Map<number, BuildLayer[]>();
  layers.forEach((layer) => {
    const windowId = Math.floor((layer.rect.y + Math.min(layer.rect.height / 2, 1)) / windowSize);
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
  const frames: BuildFrame[] = [];
  let nextWindowStart = 0;

  windows.forEach((window) => {
    window.startsAt = nextWindowStart;
    const workerEnds = Array.from({ length: workerCount }, () => window.startsAt);
    const workerPreviousLayers: Array<BuildLayer | null> = Array.from({ length: workerCount }, () => null);
    const windowTaskCounts = new Map<BuildAction, number>();
    const plannedLayers = window.layers.map((layer, windowIndex) => {
      const seed = hash(`${window.id}:${layer.section}:${layer.id}`);
      const repeatedCard = layer.type === "card" && seenCards.has(`${layer.section}:${window.id}`);
      if (layer.type === "card") seenCards.add(`${layer.section}:${window.id}`);
      const recipe = [...recipeForLayer(layer, repeatedCard, windowIndex, windowTaskCounts)];
      recipe.forEach((action) => windowTaskCounts.set(action, (windowTaskCounts.get(action) ?? 0) + 1));
      return { layer, seed, recipe };
    });
    ensureWindowActionMix(plannedLayers);
    const sparseWindow = plannedLayers.length <= workerCount;
    if (sparseWindow) {
      plannedLayers.forEach(({ recipe }) => {
        if (!recipe.includes("STYLE")) recipe.push("STYLE");
      });
    }

    plannedLayers.forEach(({ layer, seed, recipe }) => {
      const cursorId = workerEnds
        .map((end, index) => ({ end, index }))
        .sort((a, b) => a.end - b.end || a.index - b.index)[0].index;
      const travelDuration = (buildModeConfig.actionDurations.travel[0]
        + seed % (buildModeConfig.actionDurations.travel[1] - buildModeConfig.actionDurations.travel[0] + 1));
      const actionDurations = actionDurationsFor(layer, recipe, seed, mobile);
      if (sparseWindow) {
        const minimumDuration = buildModeConfig.minimumSparseWindowTaskMs
          * (mobile ? buildModeConfig.mobileActionTimeScale : 1);
        const scheduledDuration = travelDuration + actionDurations.reduce((sum, duration) => sum + duration, 0);
        const styleIndex = recipe.lastIndexOf("STYLE");
        if (styleIndex >= 0 && scheduledDuration < minimumDuration) {
          actionDurations[styleIndex] += minimumDuration - scheduledDuration;
        }
      }
      const startsAt = Math.max(
        window.startsAt + (window.id === windows[0].id ? 0 : buildModeConfig.sceneStartDelayMs),
        workerEnds[cursorId]
      );
      const endsAt = startsAt + travelDuration + actionDurations.reduce((sum, duration) => sum + duration, 0);
      workerEnds[cursorId] = endsAt;
      const frame: BuildFrame = {
        layer,
        cursorId,
        startedAt: startsAt,
        endsAt,
        travelDuration,
        actionDurations,
        recipe,
        seed,
        windowId: window.id,
        windowStartedAt: window.startsAt,
        windowEndsAt: 0,
        previousLayer: workerPreviousLayers[cursorId]
      };
      workerPreviousLayers[cursorId] = layer;
      frames.push(frame);
      window.endsAt = Math.max(window.endsAt, endsAt);
    });

    const windowDuration = window.endsAt - window.startsAt;
    nextWindowStart = window.startsAt + windowDuration * buildModeConfig.windowHandoffProgress;
  });

  return frames.map((frame) => {
    const window = windows.find((item) => item.id === frame.windowId);
    return {
      ...frame,
      windowStartedAt: window?.startsAt ?? 0,
      windowEndsAt: window?.endsAt ?? frame.endsAt
    };
  }).sort((a, b) => a.startedAt - b.startedAt || a.cursorId - b.cursorId);
}

function ensureWindowActionMix(
  plannedLayers: Array<{ layer: BuildLayer; recipe: BuildAction[] }>
) {
  const actionTargets: Array<{ action: BuildAction; accepts: (type: BuildLayer["type"]) => boolean }> = [
    { action: "DRAW_BOX", accepts: (type) => type === "card" || type === "image" || type === "button" },
    { action: "TYPE", accepts: (type) => type === "text" || type === "button" || type === "card" },
    { action: "DROP_IMAGE", accepts: (type) => type === "image" || type === "card" },
    { action: "COPY_PASTE", accepts: (type) => type === "text" || type === "card" },
    { action: "ADD_SYMBOL", accepts: (type) => type === "button" || type === "icon" },
    { action: "RESIZE_TEXT", accepts: (type) => type === "text" }
  ];
  actionTargets.forEach(({ action, accepts }) => {
    if (plannedLayers.some((plan) => plan.recipe.includes(action))) return;
    const target = plannedLayers.find((plan) => accepts(plan.layer.type)) ?? plannedLayers[0];
    if (target) target.recipe.push(action);
  });
}

function recipeForLayer(
  layer: BuildLayer,
  repeatedCard: boolean,
  index: number,
  actionCounts: Map<BuildAction, number>
): BuildAction[] {
  if (repeatedCard) return copyRecipe;
  const recipe = [...recipes[layer.type]];
  if (layer.type === "text" && index % 6 === 5) {
    return [...copyRecipe.filter((action) => action !== "SWAP_IMAGE"), "RESIZE_TEXT"];
  }
  if (layer.type === "line" && actionCounts.has("DRAW_LINE")) return ["DRAW_LINE", "STYLE"];
  return recipe;
}

export function getActionAt(frame: BuildFrame, timelineTime: number): BuildAction {
  const actionTime = Math.max(0, timelineTime - frame.startedAt - frame.travelDuration);
  let elapsed = 0;
  for (let index = 0; index < frame.recipe.length; index += 1) {
    elapsed += frame.actionDurations[index] ?? 0;
    if (actionTime < elapsed) return frame.recipe[index];
  }
  return frame.recipe[frame.recipe.length - 1];
}

export function getActionProgress(frame: BuildFrame, timelineTime: number): number {
  const actionTime = Math.max(0, timelineTime - frame.startedAt - frame.travelDuration);
  let elapsed = 0;
  for (let index = 0; index < frame.recipe.length; index += 1) {
    const duration = Math.max(1, frame.actionDurations[index] ?? 1);
    if (actionTime < elapsed + duration) return Math.min(1, (actionTime - elapsed) / duration);
    elapsed += duration;
  }
  return 1;
}

export function getTypedText(text: string, progress: number, seed = 0): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  const firstLineLength = Math.min(normalized.length, 60);
  const elapsed = Math.max(0, Math.min(1, progress)) * typingDurationFor(normalized, seed);
  let lineElapsed = 0;
  let firstLineCharacters = 0;
  while (firstLineCharacters < firstLineLength) {
    const character = normalized[firstLineCharacters];
    const cadence = typeCadence(seed, firstLineCharacters);
    lineElapsed += cadence + (/[.,!?;:]/.test(character) ? buildModeConfig.actionDurations.punctuationPause : 0);
    if (lineElapsed > elapsed) break;
    firstLineCharacters += 1;
  }
  let visibleText = normalized.slice(0, firstLineCharacters);
  if (firstLineLength && hash(`${seed}:typo-rate`) / 0x1_0000_0000 < buildModeConfig.typoRate) {
    const typoIndex = hash(`${seed}:typo-index`) % firstLineLength;
    const typoTime = (typoIndex / firstLineLength) * typingDurationFor(normalized, seed);
    if (firstLineCharacters > typoIndex && elapsed < typoTime + 180) {
      const correct = normalized[typoIndex];
      const alphabet = "abcdefghijklmnopqrstuvwxyz";
      const replacementIndex = (alphabet.indexOf(correct.toLowerCase()) + 1 + hash(`${seed}:typo-char`) % 25) % 26;
      const replacement = alphabet[replacementIndex];
      visibleText = `${visibleText.slice(0, typoIndex)}${correct === correct.toUpperCase() ? replacement.toUpperCase() : replacement}${visibleText.slice(typoIndex + 1)}`;
    }
  }
  if (firstLineCharacters < firstLineLength) return visibleText;

  const remaining = normalized.slice(firstLineLength).trimStart();
  const lineCount = Math.ceil(remaining.length / 60);
  const revealedLines = Math.min(
    lineCount,
    Math.floor((elapsed - lineElapsed) / buildModeConfig.actionDurations.punctuationPause)
  );
  for (let line = 0; line < revealedLines; line += 1) {
    visibleText += `${visibleText ? "\n" : ""}${remaining.slice(line * 60, (line + 1) * 60).trim()}`;
  }
  return visibleText;
}

export function getBuildMetrics(script: BuildFrame[], timelineTime: number, activeWindow?: number): BuildDebugMetrics {
  const measuredScript = activeWindow === undefined
    ? script
    : script.filter((task) => task.windowId === activeWindow);
  const workerQueues = new Map<number, BuildFrame[]>();
  measuredScript.forEach((task) => {
    const queue = workerQueues.get(task.cursorId) ?? [];
    queue.push(task);
    workerQueues.set(task.cursorId, queue);
  });
  const frames = Array.from(workerQueues.values());
  const workerIds = Array.from(workerQueues.keys());
  const totalWorkerTime = frames.reduce((sum, queue) =>
    sum + (queue.length ? queue[queue.length - 1].endsAt - queue[0].startedAt : 0), 0);
  const taskTime = measuredScript.reduce((sum, task) => sum + task.endsAt - task.startedAt, 0);
  let longestGap = 0;
  const violatingAgentIds: number[] = [];
  frames.forEach((queue, queueIndex) => {
    queue.sort((a, b) => a.startedAt - b.startedAt);
    let hasViolation = false;
    for (let index = 1; index < queue.length; index += 1) {
      const gap = Math.max(0, queue[index].startedAt - queue[index - 1].endsAt);
      longestGap = Math.max(longestGap, gap);
      if (gap > 250) hasViolation = true;
    }
    if (hasViolation) violatingAgentIds.push(workerIds[queueIndex]);
  });
  const activeTasks = script.filter((task) =>
    task.startedAt <= timelineTime
    && task.endsAt > timelineTime
    && (activeWindow === undefined || task.windowId === activeWindow)
  );
  const actionCounts: Partial<Record<BuildAction, number>> = {};
  activeTasks.forEach((task) => {
    const action = getActionAt(task, timelineTime);
    actionCounts[action] = (actionCounts[action] ?? 0) + 1;
  });
  const windowIds = Array.from(new Set(script.map((task) => task.windowId)));
  const plannedDurationMs = script.reduce((duration, task) => Math.max(duration, task.endsAt), 0);
  const windowIndex = activeWindow === undefined ? 0 : windowIds.indexOf(activeWindow);
  return {
    workRatio: totalWorkerTime ? Math.min(100, (taskTime / totalWorkerTime) * 100) : 100,
    longestGap,
    violations: violatingAgentIds.length,
    activeActions: activeTasks.map((task) => ({
      agentId: task.cursorId,
      action: getActionAt(task, timelineTime),
      layerId: task.layer.id
    })),
    workerCount: workerQueues.size,
    progress: script.length ? Math.min(100, (script.filter((task) => task.endsAt <= timelineTime).length / script.length) * 100) : 0,
    plannedDurationMs,
    violatingAgentIds,
    actionCounts,
    activeWindow: windowIndex + 1,
    windowCount: windowIds.length,
    sampledFrames: 0
  };
}

function actionDurationsFor(layer: BuildLayer, recipe: BuildAction[], seed: number, mobile: boolean) {
  const text = layer.text.replace(/\s+/g, " ").trim();
  const durationScale = mobile ? buildModeConfig.mobileActionTimeScale : 1;
  return recipe.map((action) => {
    if (action === "TYPE" || action === "RETYPE") return typingDurationFor(text, seed) * durationScale;
    if (action === "DROP_IMAGE" || action === "SWAP_IMAGE") return buildModeConfig.actionDurations.image * durationScale;
    if (action === "DRAW_BOX" || action === "DRAW_TEXTBOX" || action === "DRAW_LINE") return buildModeConfig.actionDurations.draw * durationScale;
    if (action === "FILL" || action === "ROUND_CORNERS" || action === "STYLE" || action === "RECOLOR" || action === "RESIZE_TEXT") return buildModeConfig.actionDurations.style * durationScale;
    if (action === "OPEN_PICKER" || action === "PICK_SYMBOL" || action === "ADD_SYMBOL" || action === "DROP" || action === "SCALE") return buildModeConfig.actionDurations.symbol * durationScale;
    if (action === "COPY_PASTE") return 180 * durationScale;
    return 125 * durationScale;
  });
}

function typingDurationFor(text: string, seed: number) {
  const firstLine = text.slice(0, 60);
  let duration = 0;
  for (let index = 0; index < firstLine.length; index += 1) {
    duration += typeCadence(seed, index);
    if (/[.,!?;:]/.test(firstLine[index])) duration += buildModeConfig.actionDurations.punctuationPause;
  }
  return Math.max(200, duration + Math.max(0, Math.ceil(text.length / 60) - 1) * buildModeConfig.actionDurations.punctuationPause);
}

function typeCadence(seed: number, index: number) {
  const variance = hash(`${seed}:${index}`) % 5;
  return Math.round(buildModeConfig.actionDurations.typePerCharacter * (0.8 + variance * 0.1));
}
