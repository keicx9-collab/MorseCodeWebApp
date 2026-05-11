export type NodeType = "ROOT" | "ROUND" | "RECT";

export interface MorseNode {
  id: string;
  label: string;
  type: NodeType;
  dot_id: string | null;
  dash_id: string | null;
}

export interface MorseTreeFile {
  version: string;
  nodes: MorseNode[];
}
