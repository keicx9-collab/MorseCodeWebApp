import type { MorseNode } from "./types";

export interface Point {
  x: number;
  y: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
}

/** Horizontal spacing derived from real node / label size (reduces overlap vs abstract minGap). */
export interface LayoutSpacing {
  leafUnit: number;
  siblingGap: number;
}

/** Recursive divide-and-center placement (binary tree). */
export function layoutBinaryTree(
  rootId: string,
  nodeMap: Map<string, MorseNode>,
  levelGap: number,
  spacing: LayoutSpacing,
): { positions: Map<string, Point>; edges: LayoutEdge[]; width: number; height: number } {
  const { leafUnit, siblingGap } = spacing;
  const positions = new Map<string, Point>();
  const edges: LayoutEdge[] = [];

  function subtreeWidth(id: string | null): number {
    if (!id) return 0;
    const n = nodeMap.get(id);
    if (!n) return 0;
    const wDot = subtreeWidth(n.dot_id);
    const wDash = subtreeWidth(n.dash_id);
    if (!n.dot_id && !n.dash_id) return leafUnit;
    if (n.dot_id && !n.dash_id) return Math.max(leafUnit, wDot);
    if (!n.dot_id && n.dash_id) return Math.max(leafUnit, wDash);
    return Math.max(leafUnit, wDot + siblingGap + wDash);
  }

  function place(id: string | null, depth: number, left: number, right: number): void {
    if (!id) return;
    const n = nodeMap.get(id);
    if (!n) return;
    const cx = (left + right) / 2;
    positions.set(id, { x: cx, y: depth * levelGap });

    const hasDot = !!n.dot_id;
    const hasDash = !!n.dash_id;
    if (hasDot) edges.push({ from: id, to: n.dot_id! });
    if (hasDash) edges.push({ from: id, to: n.dash_id! });

    if (hasDot && hasDash) {
      const wDot = subtreeWidth(n.dot_id);
      const wDash = subtreeWidth(n.dash_id);
      const span = right - left;
      /** Practice card layout: left = dash (長点/矩形), right = dot (短点/丸) */
      const split = left + (span * wDash) / (wDash + wDot);
      place(n.dash_id, depth + 1, left, split);
      place(n.dot_id, depth + 1, split, right);
      return;
    }
    if (hasDot) place(n.dot_id, depth + 1, left, right);
    if (hasDash) place(n.dash_id, depth + 1, left, right);
  }

  const totalW = subtreeWidth(rootId);
  place(rootId, 0, 0, totalW);

  let maxY = 0;
  let maxX = 0;
  let minX = Infinity;
  for (const p of positions.values()) {
    maxY = Math.max(maxY, p.y);
    maxX = Math.max(maxX, p.x);
    minX = Math.min(minX, p.x);
  }

  const pad = siblingGap;
  const shiftX = pad - minX;
  for (const [id, p] of positions) {
    positions.set(id, { x: p.x + shiftX, y: p.y });
  }

  const width = maxX - minX + pad * 2;
  const height = maxY + levelGap + pad;

  return { positions, edges, width, height };
}
