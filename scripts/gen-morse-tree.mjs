import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MORSE = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  "0": "-----",
  "1": ".----",
  "2": "..---",
  "3": "...--",
  "4": "....-",
  "5": ".....",
  "6": "-....",
  "7": "--...",
  "8": "---..",
  "9": "----.",
};

function pathToId(seq) {
  if (seq.length === 0) return "root";
  return [...seq].map((c) => (c === "." ? "d" : "h")).join("");
}

const nodes = new Map();

function getNode(seq) {
  const id = pathToId(seq);
  if (!nodes.has(id)) {
    const last = seq[seq.length - 1];
    const type = id === "root" ? "ROOT" : last === "." ? "ROUND" : "RECT";
    nodes.set(id, { id, label: "", type, dot_id: null, dash_id: null, _seq: seq });
  }
  return nodes.get(id);
}

getNode("");
for (const [ch, pat] of Object.entries(MORSE)) {
  let seq = "";
  for (let i = 0; i < pat.length; i++) {
    const sym = pat[i];
    const nextSeq = seq + sym;
    const curr = getNode(seq);
    const next = getNode(nextSeq);
    if (sym === ".") curr.dot_id = next.id;
    else curr.dash_id = next.id;
    seq = nextSeq;
  }
  getNode(seq).label = ch;
}

getNode("").label = "Antenna";

const out = {
  version: "1.0",
  nodes: Array.from(nodes.values()).map(({ _seq, ...n }) => n),
};

const outPath = path.join(__dirname, "..", "public", "data", "morse_tree.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
console.log("Wrote", outPath, "nodes:", out.nodes.length);
