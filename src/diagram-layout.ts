import {
  layoutBinaryTree,
  type LayoutEdge,
  type LayoutSpacing,
  type Point,
} from "./tree-layout";
import type { MorseNode } from "./types";

export interface TreeLayoutMetrics {
  levelGap: number;
  minGap: number;
}

export interface DiagramSpec {
  vbX: number;
  vbY: number;
  vbW: number;
  vbH: number;
  positions: Map<string, Point>;
  edges: LayoutEdge[];
  rootR: number;
  roundR: number;
  rectW: number;
  rectH: number;
  labelFs: number;
  labelDy: number;
  iconFs: number;
  stemDown: number;
  stemUp: number;
}

function estimateSpacing(metrics: TreeLayoutMetrics, widthGuess: number): LayoutSpacing {
  const { levelGap, minGap } = metrics;
  const roundREst = Math.max(22, Math.round(levelGap * 0.28));
  const rectWEst = Math.round(roundREst * 2.35);
  const fsEst = Math.min(64, Math.max(26, widthGuess * 0.026));
  return {
    leafUnit: Math.max(minGap * 3.2, rectWEst + fsEst + 40),
    siblingGap: Math.max(minGap * 2.35, fsEst + 34),
  };
}

/** Geometry + viewBox for the Morse tree SVG (collision-aware horizontal spacing). */
export function computeDiagramSpec(
  rootId: string,
  nodeMap: Map<string, MorseNode>,
  metrics: TreeLayoutMetrics,
): DiagramSpec {
  const { levelGap, minGap } = metrics;

  let spacing = estimateSpacing(metrics, 4600);
  let positions!: Map<string, Point>;
  let edges!: LayoutEdge[];
  let layoutLogicalWidth = 0;

  for (let pass = 0; pass < 2; pass++) {
    const laid = layoutBinaryTree(rootId, nodeMap, levelGap, spacing);
    positions = laid.positions;
    edges = laid.edges;
    layoutLogicalWidth = laid.width;

    const roundR = Math.max(22, Math.round(levelGap * 0.28));
    const rectW = Math.round(roundR * 2.35);
    const fs = Math.min(68, Math.max(24, layoutLogicalWidth * 0.026));
    spacing = {
      leafUnit: Math.max(minGap * 3.25, rectW + fs + 42),
      siblingGap: Math.max(minGap * 2.4, fs + 34),
    };
  }

  const rootR = Math.max(26, Math.round(levelGap * 0.34));
  const roundR = Math.max(22, Math.round(levelGap * 0.28));
  const rectW = Math.round(roundR * 2.35);
  const rectH = Math.round(roundR * 1.22);
  const labelFs = Math.min(68, Math.max(24, layoutLogicalWidth * 0.026));
  const labelDy = Math.round(roundR + labelFs * 1.06);
  const iconFs = Math.round(rootR * 1.05);

  let maxBottom = 0;
  for (const p of positions.values()) {
    maxBottom = Math.max(maxBottom, p.y + labelDy + labelFs * 0.48);
  }
  const padBottom = Math.ceil(minGap * 1.12 + 14);
  const padTop = Math.ceil(rootR + iconFs * 0.55 + 18);

  const labelPadX = labelFs * 0.62;

  let minPx = Infinity;
  let maxPx = -Infinity;
  for (const [id, pos] of positions) {
    const n = nodeMap.get(id);
    if (!n) continue;
    let left = pos.x;
    let right = pos.x;
    if (n.type === "ROOT") {
      left -= rootR + 6;
      right += rootR + 6;
    } else if (n.type === "ROUND") {
      left -= roundR + 6;
      right += roundR + 6;
    } else {
      left -= rectW / 2 + 6;
      right += rectW / 2 + 6;
    }
    const lab = (n.label || "").length;
    const lx = lab <= 1 ? labelPadX : labelPadX * Math.min(lab, 4);
    left -= lx;
    right += lx;
    minPx = Math.min(minPx, left);
    maxPx = Math.max(maxPx, right);
  }

  const marginX = 22;
  const vbX = minPx - marginX;
  const vbW = maxPx - minPx + 2 * marginX;
  const vbY = -padTop;
  const vbH = padTop + maxBottom + padBottom;

  const stemDown = Math.round(levelGap * 0.34);
  const stemUp = Math.round(levelGap * 0.28);

  return {
    vbX,
    vbY,
    vbW,
    vbH,
    positions,
    edges,
    rootR,
    roundR,
    rectW,
    rectH,
    labelFs,
    labelDy,
    iconFs,
    stemDown,
    stemUp,
  };
}

/**
 * Maximizes visible scale under preserveAspectRatio=meet:
 * scale = min(containerW/vbW, containerH/vbH).
 * Also searches taller levelGap so portrait screens are less "width-bound" (less dead vertical space).
 */
export function pickMetricsForViewport(
  rootId: string,
  nodeMap: Map<string, MorseNode>,
  containerWidth: number,
  containerHeight: number,
): TreeLayoutMetrics {
  const cw = Math.max(containerWidth, 260);
  const ch = Math.max(containerHeight, 220);

  let best: TreeLayoutMetrics = { minGap: 36, levelGap: 120 };
  let bestScale = -1;

  for (let minGap = 28; minGap <= 72; minGap += 4) {
    for (
      let levelGap = Math.round(minGap * 2.45);
      levelGap <= Math.round(minGap * 3.95);
      levelGap += 10
    ) {
      const cappedGap = Math.min(levelGap, 185);
      const m = { minGap, levelGap: cappedGap };
      const spec = computeDiagramSpec(rootId, nodeMap, m);
      const scale = Math.min(cw / spec.vbW, ch / spec.vbH);
      if (scale > bestScale) {
        bestScale = scale;
        best = m;
      }
    }
  }

  return best;
}
