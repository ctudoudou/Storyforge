export type ScriptParserInput = {
  content: string;
};

export type AgentParsedCharacter = {
  name: string;
  age: number | null;
  role: string;
  traits: string[];
};

export type AgentParsedScene = {
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  mood: string;
  description: string;
  camera: string;
  characters: string[];
};

export type AgentCharacterRelationship = {
  source: string;
  target: string;
  relation: string;
  evidence: string;
};

export type AgentPlotBeat = {
  sceneNumber: number;
  type: "setup" | "conflict" | "reversal" | "decision";
  summary: string;
};

export type AgentDialogueBlock = {
  sceneNumber: number;
  speaker: string;
  content: string;
  orderIndex: number;
};

export type ScriptParserSection = "characters" | "scenes" | "relationships" | "plotBeats" | "dialogueBlocks";

export type ScriptParserWarning = {
  section: ScriptParserSection;
  message: string;
};

export type ScriptParserAgentOutput = {
  characters: AgentParsedCharacter[];
  scenes: AgentParsedScene[];
  relationships: AgentCharacterRelationship[];
  plotBeats: AgentPlotBeat[];
  dialogueBlocks: AgentDialogueBlock[];
  warnings: ScriptParserWarning[];
};

export type ScriptParserProvider = {
  name: string;
  parse(input: ScriptParserInput): unknown;
};
