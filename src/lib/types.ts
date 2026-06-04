export type ProjectStatus = "draft" | "processing" | "completed" | "failed";

export type ProjectSummary = {
  id: string;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number;
  sceneCount: number;
};

export type ScriptRecord = {
  projectId: string;
  content: string;
  updatedAt: string;
};

export type AssetRecord = {
  id: string;
  type: "image" | "audio" | "video" | "other";
  name: string;
  relativePath: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
};

export type CharacterRecord = {
  id: string;
  projectId: string;
  name: string;
  age: number | null;
  role: string;
  traits: string[];
  asset: AssetRecord | null;
};

export type CharacterRelationshipRecord = {
  id: string;
  projectId: string;
  sourceName: string;
  targetName: string;
  relation: string;
  evidence: string;
};

export type PlotBeatRecord = {
  id: string;
  projectId: string;
  sceneNumber: number;
  type: "setup" | "conflict" | "reversal" | "decision";
  summary: string;
};

export type DialogueBlockRecord = {
  id: string;
  projectId: string;
  sceneNumber: number;
  speaker: string;
  content: string;
  orderIndex: number;
};

export type SceneRecord = {
  id: string;
  projectId: string;
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  description: string;
  camera: string;
  characters: string[];
  asset: AssetRecord | null;
};

export type TimelineClipRecord = {
  id: string;
  projectId: string;
  trackType: "video" | "audio";
  label: string;
  startMs: number;
  durationMs: number;
  asset: AssetRecord | null;
};

export type ProjectDetail = ProjectSummary & {
  script: ScriptRecord;
  characters: CharacterRecord[];
  relationships: CharacterRelationshipRecord[];
  plotBeats: PlotBeatRecord[];
  dialogueBlocks: DialogueBlockRecord[];
  scenes: SceneRecord[];
  timelineClips: TimelineClipRecord[];
};
