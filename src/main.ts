import { MorseBeeper } from "./audio";
import {
  IDLE_RESET_MS,
  LED_ACTIVE_COLOR,
  LED_ACTIVE_STROKE,
  SHORT_PRESS_MS,
} from "./config";
import {
  applyPracticeDiagramVisualState,
  createPracticeDiagramMount,
  PRACTICE_ROOT_ID,
} from "./practice-card-render";
import type { MorseNode, MorseTreeFile } from "./types";

function applyLedCssVars(): void {
  const el = document.documentElement;
  el.style.setProperty("--led-active-fill", LED_ACTIVE_COLOR);
  el.style.setProperty("--led-active-stroke", LED_ACTIVE_STROKE);
}

function buildNodeMap(data: MorseTreeFile): Map<string, MorseNode> {
  const map = new Map<string, MorseNode>();
  for (const n of data.nodes) map.set(n.id, n);
  return map;
}

function isLeaf(n: MorseNode): boolean {
  return !n.dot_id && !n.dash_id;
}

/**
 * 短音・長音がまだ区別できない間は子を点灯しない（短音っぽく E→T に切り替わるチラつきを防ぐ）。
 * dot と dash の両方があるノード: SHORT_PRESS_MS 未満は null、以降は dash 側をプレビュー。
 */
function previewChildId(node: MorseNode, elapsedMs: number): string | null {
  const dot = node.dot_id;
  const dash = node.dash_id;
  if (dot && !dash) return dot;
  if (!dot && dash) return dash;
  if (dot && dash) return elapsedMs < SHORT_PRESS_MS ? null : dash;
  return null;
}

function navigate(node: MorseNode, durationMs: number): string | null {
  const wantDash = durationMs >= SHORT_PRESS_MS;
  return wantDash ? node.dash_id : node.dot_id;
}

async function loadTree(): Promise<MorseTreeFile> {
  const res = await fetch("/data/morse_tree.json");
  if (!res.ok) throw new Error(`morse_tree.json: ${res.status}`);
  return res.json() as Promise<MorseTreeFile>;
}

async function main(): Promise<void> {
  applyLedCssVars();

  const mount = document.getElementById("diagram-mount");
  if (!mount) return;

  let data: MorseTreeFile;
  try {
    data = await loadTree();
  } catch (e) {
    console.error(e);
    mount.textContent = "図の読み込みに失敗しました。";
    return;
  }

  const nodeMap = buildNodeMap(data);
  if (!nodeMap.get(PRACTICE_ROOT_ID)) {
    mount.textContent = "morse_tree.json に root ノードがありません。";
    return;
  }

  const diagram = createPracticeDiagramMount(data);
  mount.replaceChildren(diagram);

  const inputEl = document.getElementById("main-btn");
  if (inputEl == null || !(inputEl instanceof HTMLButtonElement)) return;
  const pushBtn: HTMLButtonElement = inputEl;

  let currentId = PRACTICE_ROOT_ID;
  const refreshViz = (previewId: string | null): void => {
    applyPracticeDiagramVisualState(diagram, currentId, previewId);
  };

  refreshViz(null);

  const beeper = new MorseBeeper();
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let pressStart = 0;
  let raf = 0;
  let pressing = false;

  function clearIdleTimer(): void {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

  /** docs/ai_instructions.md: IDLE_RESET_MS でアンテナへ */
  function scheduleIdleReset(): void {
    clearIdleTimer();
    idleTimer = setTimeout(() => {
      currentId = PRACTICE_ROOT_ID;
      refreshViz(null);
    }, IDLE_RESET_MS);
  }

  function tickPreview(): void {
    if (!pressing) return;
    const cur = nodeMap.get(currentId);
    if (!cur || isLeaf(cur)) return;
    const elapsed = performance.now() - pressStart;
    const preview = previewChildId(cur, elapsed);
    refreshViz(preview);
    raf = requestAnimationFrame(tickPreview);
  }

  function onPointerDown(ev: PointerEvent): void {
    ev.preventDefault();
    if (ev.button !== 0) return;

    const cur = nodeMap.get(currentId);
    if (!cur || isLeaf(cur)) return;

    pushBtn.setPointerCapture(ev.pointerId);
    pressing = true;
    pressStart = performance.now();
    clearIdleTimer();
    beeper.start();

    const preview = previewChildId(cur, 0);
    refreshViz(preview);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tickPreview);
  }

  function onPointerUp(ev: PointerEvent): void {
    ev.preventDefault();
    if (ev.button !== 0) return;

    if (!pressing) {
      try {
        pushBtn.releasePointerCapture(ev.pointerId);
      } catch {
        /* no capture */
      }
      return;
    }

    try {
      pushBtn.releasePointerCapture(ev.pointerId);
    } catch {
      /* no capture */
    }

    pressing = false;
    cancelAnimationFrame(raf);
    beeper.stop();

    const cur = nodeMap.get(currentId);
    if (!cur || isLeaf(cur)) {
      refreshViz(null);
      scheduleIdleReset();
      return;
    }

    const duration = performance.now() - pressStart;
    const nextId = navigate(cur, duration);

    if (!nextId) {
      refreshViz(null);
      scheduleIdleReset();
      return;
    }

    currentId = nextId;
    refreshViz(null);
    scheduleIdleReset();
  }

  pushBtn.addEventListener("pointerdown", onPointerDown);
  pushBtn.addEventListener("pointerup", onPointerUp);
  pushBtn.addEventListener("pointercancel", onPointerUp);
  pushBtn.addEventListener("lostpointercapture", onPointerUp);

  scheduleIdleReset();
}

void main();
