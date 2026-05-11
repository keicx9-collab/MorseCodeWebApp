import type { MorseNode, MorseTreeFile } from "./types";

const NS = "http://www.w3.org/2000/svg";

/** morse_tree.json root id — database.md */
export const PRACTICE_ROOT_ID = "root";

const PCB_NODE_FILL = "rgb(18, 92, 56)";
const PCB_NODE_FILL_OPACITY = "0.58";
const PCB_NODE_STROKE = "#f2f2f2";

function paintPath(
  el: SVGPathElement,
  fill: string,
  fillOpacity: string,
  stroke: string,
  strokeWidth: string,
): void {
  el.setAttribute("fill", fill);
  el.setAttribute("fill-opacity", fillOpacity);
  el.setAttribute("stroke", stroke);
  el.setAttribute("stroke-width", strokeWidth);
  el.style.setProperty("fill", fill, "important");
  el.style.setProperty("fill-opacity", fillOpacity, "important");
  el.style.setProperty("stroke", stroke, "important");
  el.style.setProperty("stroke-width", strokeWidth, "important");
}

/** Full circle via path (avoids rare circle fill bugs with scaled SVG). */
function circleDiskPath(r: number): string {
  return `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`;
}

function roundedRectPath(w: number, h: number, rx: number): string {
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(rx, hw, hh);
  const x0 = -hw;
  const y0 = -hh;
  const x1 = hw;
  const y1 = hh;
  return [
    `M ${x0 + r} ${y0}`,
    `H ${x1 - r}`,
    `Q ${x1} ${y0} ${x1} ${y0 + r}`,
    `V ${y1 - r}`,
    `Q ${x1} ${y1} ${x1 - r} ${y1}`,
    `H ${x0 + r}`,
    `Q ${x0} ${y1} ${x0} ${y1 - r}`,
    `V ${y0 + r}`,
    `Q ${x0} ${y0} ${x0 + r} ${y0}`,
    `Z`,
  ].join(" ");
}

/** Fresh layout: equal split along X per level. */
function layoutSubtree(
  id: string,
  depth: number,
  lo: number,
  hi: number,
  nodeMap: Map<string, MorseNode>,
  positions: Map<string, { x: number; y: number }>,
  rowGap: number,
  topY: number,
): void {
  const xm = (lo + hi) / 2;
  positions.set(id, { x: xm, y: topY + depth * rowGap });
  const n = nodeMap.get(id);
  if (!n) return;

  if (n.dash_id && n.dot_id) {
    layoutSubtree(n.dash_id, depth + 1, lo, xm, nodeMap, positions, rowGap, topY);
    layoutSubtree(n.dot_id, depth + 1, xm, hi, nodeMap, positions, rowGap, topY);
  } else if (n.dash_id) {
    layoutSubtree(n.dash_id, depth + 1, lo, hi, nodeMap, positions, rowGap, topY);
  } else if (n.dot_id) {
    layoutSubtree(n.dot_id, depth + 1, lo, hi, nodeMap, positions, rowGap, topY);
  }
}

function collectEdges(nodeMap: Map<string, MorseNode>): Array<{ from: string; to: string }> {
  const edges: Array<{ from: string; to: string }> = [];
  for (const n of nodeMap.values()) {
    if (n.dash_id) edges.push({ from: n.id, to: n.dash_id });
    if (n.dot_id) edges.push({ from: n.id, to: n.dot_id });
  }
  return edges;
}

function boundsForPositions(
  nodeMap: Map<string, MorseNode>,
  pos: Map<string, { x: number; y: number }>,
  rootR: number,
  roundR: number,
  rectW: number,
  rectH: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [id, p] of pos) {
    const n = nodeMap.get(id);
    if (!n) continue;
    let halfW = roundR;
    let halfH = roundR;
    if (n.type === "ROOT") {
      halfW = rootR;
      halfH = rootR;
    } else if (n.type === "RECT") {
      halfW = rectW / 2;
      halfH = rectH / 2;
    }
    minX = Math.min(minX, p.x - halfW);
    maxX = Math.max(maxX, p.x + halfW);
    minY = Math.min(minY, p.y - halfH - 14);
    maxY = Math.max(maxY, p.y + halfH + 34);
  }
  return { minX, maxX, minY, maxY };
}

function stemY(n: MorseNode, y: number, rootR: number, roundR: number, rectH: number): {
  top: number;
  bottom: number;
} {
  if (n.type === "ROOT") {
    const r = rootR;
    return { top: y - r, bottom: y + r };
  }
  if (n.type === "ROUND") {
    const r = roundR;
    return { top: y - r, bottom: y + r };
  }
  const hh = rectH / 2;
  return { top: y - hh, bottom: y + hh };
}

/** Non-empty labels (A–Z, 0–9, etc.); hides blank and "Antenna" root caption. */
function labelText(label: string, nodeType: MorseNode["type"]): string {
  const t = label.trim();
  if (!t) return "";
  if (nodeType === "ROOT") return "";
  if (/^antenna$/i.test(t)) return "";
  return t;
}

function orthogonalEdgePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const yMid = (y1 + y2) / 2;
  return `M ${x1} ${y1} L ${x1} ${yMid} L ${x2} ${yMid} L ${x2} ${y2}`;
}

function makeLayerSvg(viewBox: string): SVGSVGElement {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  svg.setAttribute("xmlns", NS);
  return svg;
}

/**
 * Two stacked SVGs (same viewBox) scaled with preserveAspectRatio meet to fit
 * the available area without scrolling.
 */
export function createPracticeDiagramMount(data: MorseTreeFile): HTMLElement {
  const nodeMap = new Map<string, MorseNode>();
  for (const n of data.nodes) nodeMap.set(n.id, n);

  const span = 980;
  const rowGap = 74;
  const topY = 40;
  const positions = new Map<string, { x: number; y: number }>();
  layoutSubtree(PRACTICE_ROOT_ID, 0, 0, span, nodeMap, positions, rowGap, topY);

  const rootR = 22;
  const roundR = 14;
  const rectW = 46;
  const rectH = 18;
  const rectRx = Math.max(4, rectH * 0.32);
  const { minX, maxX, minY, maxY } = boundsForPositions(nodeMap, positions, rootR, roundR, rectW, rectH);
  const padX = 40;
  const padY = 48;
  const vbX = minX - padX;
  const vbY = minY - padY;
  const vbW = maxX - minX + padX * 2;
  const vbH = maxY - minY + padY * 2;
  const labelFs = Math.max(26, Math.round(vbW * 0.038));
  const vb = `${vbX} ${vbY} ${vbW} ${vbH}`;

  const strokeW = Math.max(1.15, vbW * 0.00145);

  const stack = document.createElement("div");
  stack.className = "diagram-stack";

  const svgEdges = makeLayerSvg(vb);
  svgEdges.classList.add("pcb-layer", "pcb-layer--edges");
  const gEdges = document.createElementNS(NS, "g");
  gEdges.classList.add("pcb-edges");

  const edges = collectEdges(nodeMap);
  for (const e of edges) {
    const a = positions.get(e.from);
    const b = positions.get(e.to);
    const na = nodeMap.get(e.from);
    const nb = nodeMap.get(e.to);
    if (!a || !b || !na || !nb) continue;
    const sa = stemY(na, a.y, rootR, roundR, rectH);
    const sb = stemY(nb, b.y, rootR, roundR, rectH);
    const y1 = sa.bottom;
    const y2 = sb.top;
    const seg = document.createElementNS(NS, "path");
    seg.setAttribute("d", orthogonalEdgePath(a.x, y1, b.x, y2));
    seg.setAttribute("fill", "none");
    seg.setAttribute("stroke-width", String(strokeW));
    seg.classList.add("pcb-edge");
    gEdges.appendChild(seg);
  }
  svgEdges.appendChild(gEdges);

  const svgNodes = makeLayerSvg(vb);
  svgNodes.classList.add("pcb-layer", "pcb-layer--nodes");
  const gNodes = document.createElementNS(NS, "g");
  gNodes.classList.add("pcb-nodes");

  for (const [id, pos] of positions) {
    const n = nodeMap.get(id);
    if (!n) continue;

    const g = document.createElementNS(NS, "g");
    g.classList.add("pcb-node");
    g.setAttribute("data-node-id", id);
    g.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);

    if (n.type === "ROOT") {
      const disk = document.createElementNS(NS, "path");
      disk.setAttribute("d", circleDiskPath(rootR));
      disk.classList.add("pcb-root");
      paintPath(
        disk,
        PCB_NODE_FILL,
        PCB_NODE_FILL_OPACITY,
        PCB_NODE_STROKE,
        "2.25",
      );
      g.appendChild(disk);

      const icon = document.createElementNS(NS, "g");
      icon.classList.add("pcb-antenna");
      icon.setAttribute(
        "transform",
        `translate(0, ${Math.round(rootR * 0.06)}) scale(${Math.max(0.85, rootR / 15)})`,
      );
      const pole = document.createElementNS(NS, "line");
      pole.setAttribute("x1", "0");
      pole.setAttribute("y1", "6");
      pole.setAttribute("x2", "0");
      pole.setAttribute("y2", "-7");
      pole.classList.add("pcb-antenna-line");
      const w1 = document.createElementNS(NS, "path");
      w1.setAttribute("d", "M 0 -7 Q -6 -10 -9 -15");
      w1.classList.add("pcb-antenna-arc");
      const w2 = document.createElementNS(NS, "path");
      w2.setAttribute("d", "M 0 -7 Q 6 -10 9 -15");
      w2.classList.add("pcb-antenna-arc");
      icon.appendChild(pole);
      icon.appendChild(w1);
      icon.appendChild(w2);
      g.appendChild(icon);
    } else if (n.type === "ROUND") {
      const disk = document.createElementNS(NS, "path");
      disk.setAttribute("d", circleDiskPath(roundR));
      disk.classList.add("pcb-dot");
      paintPath(disk, PCB_NODE_FILL, PCB_NODE_FILL_OPACITY, PCB_NODE_STROKE, "2.2");
      g.appendChild(disk);
    } else {
      const dash = document.createElementNS(NS, "path");
      dash.setAttribute("d", roundedRectPath(rectW, rectH, rectRx));
      dash.classList.add("pcb-dash");
      paintPath(dash, PCB_NODE_FILL, PCB_NODE_FILL_OPACITY, PCB_NODE_STROKE, "2.2");
      g.appendChild(dash);
    }

    const letter = labelText(n.label, n.type);
    if (letter) {
      const t = document.createElementNS(NS, "text");
      t.setAttribute("text-anchor", "middle");
      const dy =
        n.type === "ROUND"
          ? roundR + Math.round(labelFs * 0.58)
          : rectH / 2 + Math.round(labelFs * 0.62);
      t.setAttribute("dy", String(dy));
      t.setAttribute("font-size", String(labelFs));
      t.classList.add("pcb-letter");
      t.textContent = letter;
      g.appendChild(t);
    }

    gNodes.appendChild(g);
  }

  svgNodes.appendChild(gNodes);

  stack.appendChild(svgEdges);
  stack.appendChild(svgNodes);
  return stack;
}

/**
 * docs/ai_instructions.md: 押下中は preview、離すと current のみ強調。それ以外はディム。
 */
export function applyPracticeDiagramVisualState(
  diagramStack: HTMLElement,
  currentId: string,
  previewId: string | null,
): void {
  const svgNodes = diagramStack.querySelector("svg.pcb-layer--nodes");
  if (!svgNodes) return;
  const groups = svgNodes.querySelectorAll<SVGGElement>("g.pcb-node[data-node-id]");
  for (const g of groups) {
    const id = g.getAttribute("data-node-id");
    if (!id) continue;
    const lit = previewId != null ? id === previewId : id === currentId;
    g.classList.toggle("pcb-node--lit", lit);
    g.classList.toggle("pcb-node--dim", !lit);
  }
}
