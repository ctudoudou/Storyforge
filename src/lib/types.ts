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
  thumbnailPath: string | null;
  thumbnailStatus: "generated" | "fallback" | "unavailable" | "failed";
  thumbnailError: string | null;
  createdAt: string;
};

export type AssetVersionRecord = {
  id: string;
  assetId: string;
  versionNumber: number;
  name: string;
  relativePath: string;
  mimeType: string | null;
  sizeBytes: number;
  thumbnailPath: string | null;
  thumbnailStatus: AssetRecord["thumbnailStatus"];
  thumbnailError: string | null;
  source: "import" | "regeneration" | "manual";
  provider: string | null;
  model: string | null;
  prompt: string | null;
  parameters: Record<string, unknown> | null;
  parentVersionId: string | null;
  isActive: boolean;
  createdAt: string;
};

export type AssetLinkTargetType = "character" | "scene" | "timelineClip";

export type AssetReferenceRecord = {
  targetType: AssetLinkTargetType;
  targetId: string;
  targetLabel: string;
  projectId: string;
  projectTitle: string;
};

export type AssetDetail = {
  asset: AssetRecord;
  assetUrl: string;
  thumbnailUrl: string | null;
  fileExists: boolean;
  versions: AssetVersionRecord[];
  references: AssetReferenceRecord[];
};

export type AssetDeleteResult = {
  deleted: boolean;
  asset: AssetRecord;
  removedFiles: string[];
};

export type CharacterRecord = {
  id: string;
  projectId: string;
  name: string;
  age: number | null;
  role: string;
  traits: string[];
  isUserEdited: boolean;
  asset: AssetRecord | null;
};

export type CharacterRelationshipRecord = {
  id: string;
  projectId: string;
  sourceName: string;
  targetName: string;
  relation: string;
  evidence: string;
  isUserEdited: boolean;
};

export type PlotBeatRecord = {
  id: string;
  projectId: string;
  sceneNumber: number;
  type: "setup" | "conflict" | "reversal" | "decision";
  summary: string;
  isUserEdited: boolean;
};

export type DialogueBlockRecord = {
  id: string;
  projectId: string;
  sceneNumber: number;
  speaker: string;
  content: string;
  orderIndex: number;
  isUserEdited: boolean;
};

export type SceneRecord = {
  id: string;
  projectId: string;
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  mood: string;
  description: string;
  camera: string;
  characters: string[];
  isUserEdited: boolean;
  asset: AssetRecord | null;
};

export type TimelineClipRecord = {
  id: string;
  projectId: string;
  trackType: "video" | "audio";
  label: string;
  startMs: number;
  durationMs: number;
  isUserEdited: boolean;
  asset: AssetRecord | null;
};

export type PreservedParseRecords = {
  characters: string[];
  relationships: string[];
  plotBeats: string[];
  dialogueBlocks: string[];
  scenes: string[];
  timelineClips: string[];
};

export type ScriptParseWarning = {
  section: "characters" | "scenes" | "relationships" | "plotBeats" | "dialogueBlocks";
  message: string;
};

export type ScriptParsePreview = {
  characters: Array<Omit<CharacterRecord, "id" | "projectId" | "asset" | "isUserEdited">>;
  relationships: Array<Omit<CharacterRelationshipRecord, "id" | "projectId" | "isUserEdited">>;
  plotBeats: Array<Omit<PlotBeatRecord, "id" | "projectId" | "isUserEdited">>;
  dialogueBlocks: Array<Omit<DialogueBlockRecord, "id" | "projectId" | "isUserEdited">>;
  scenes: Array<Omit<SceneRecord, "id" | "projectId" | "asset" | "isUserEdited">>;
  timelineClips: Array<Omit<TimelineClipRecord, "id" | "projectId" | "asset" | "isUserEdited">>;
  preservedRecords: PreservedParseRecords;
  warnings: ScriptParseWarning[];
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
