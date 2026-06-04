export type ProjectStatus = "draft" | "processing" | "completed" | "failed";
export type ProjectReviewState = "draft" | "reviewed" | "needs_changes" | "approved";
export type ProjectStylePreset = "modern_drama" | "urban_romance" | "suspense" | "workplace";
export type ProjectAspectRatio = "9:16" | "16:9" | "1:1";
export type ProjectLanguage = "zh-CN" | "en-US";
export type ProjectVoicePreset = "narrator_female" | "narrator_male" | "dialogue_mixed";
export type ExportOutputFormat = "mp4" | "mov" | "storyforge_json";
export type ExportResolution = "720x1280" | "1080x1920" | "1920x1080";
export type ExportFrameRate = 24 | 25 | 30;
export type ExportAudioMix = "balanced" | "voice_focus" | "music_focus";

export type ProjectSettings = {
  stylePreset: ProjectStylePreset;
  aspectRatio: ProjectAspectRatio;
  language: ProjectLanguage;
  voicePreset: ProjectVoicePreset;
  targetDurationSeconds: number;
};

export type ProjectExportSettings = {
  outputFormat: ExportOutputFormat;
  resolution: ExportResolution;
  frameRate: ExportFrameRate;
  burnInSubtitles: boolean;
  audioMix: ExportAudioMix;
};

export type ProjectSummary = {
  id: string;
  title: string;
  status: ProjectStatus;
  reviewState: ProjectReviewState;
  settings: ProjectSettings;
  exportSettings: ProjectExportSettings;
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

export type AssetLinkTargetType = "character" | "scene" | "timelineClip" | "audioTrack";

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

export type GeneratedArtifactReference = {
  type: "character" | "scene" | "timelineClip" | "plotBeat" | "asset" | "generation";
  id: string;
};

export type CharacterVisualConsistencySettings = {
  notes: string;
  anchorAssetIds: string[];
};

export type ImageGenerationRecord = {
  id: string;
  projectId: string;
  assetId: string;
  targetType: "character" | "scene" | "keyframe";
  prompt: string;
  negativePrompt: string | null;
  provider: string;
  model: string;
  parameters: Record<string, unknown>;
  seed: number | null;
  sourceAssetIds: string[];
  parentArtifacts: GeneratedArtifactReference[];
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type LongRunningJobStatus = "queued" | "running" | "completed" | "failed" | "canceled";

export type JobProgressEventType =
  | "queued"
  | "running"
  | "progress"
  | "completed"
  | "failed"
  | "canceled";

export type JobProgressEventRecord = {
  id: string;
  jobId: string;
  eventType: JobProgressEventType;
  progressPercent: number;
  message: string | null;
  createdAt: string;
};

export type ImageGenerationJobStatus = LongRunningJobStatus;

export type ImageGenerationJobRecord = {
  id: string;
  projectId: string;
  assetId: string | null;
  generationId: string | null;
  retryOfJobId: string | null;
  regenerateOfGenerationId: string | null;
  targetType: ImageGenerationRecord["targetType"];
  status: ImageGenerationJobStatus;
  prompt: string;
  negativePrompt: string | null;
  provider: string;
  model: string;
  parameters: Record<string, unknown>;
  sourceAssetIds: string[];
  parentArtifacts: GeneratedArtifactReference[];
  progressPercent: number;
  progressMessage: string | null;
  errorMessage: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelRequestedAt: string | null;
  canceledAt: string | null;
  updatedAt: string;
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
  assetSource: "manual" | "generated" | null;
  visualConsistency: CharacterVisualConsistencySettings;
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
  assetSource: "manual" | "generated" | null;
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

export type AudioTrackRecord = {
  id: string;
  projectId: string;
  trackType: "audio";
  label: string;
  speaker: string;
  startMs: number;
  durationMs: number;
  isUserEdited: boolean;
  asset: AssetRecord | null;
};

export type SubtitleTrackRecord = {
  id: string;
  projectId: string;
  sceneNumber: number;
  dialogueBlockId: string | null;
  speaker: string;
  text: string;
  startMs: number;
  durationMs: number;
  isUserEdited: boolean;
};

export type TransitionRecord = {
  id: string;
  projectId: string;
  sourceClipId: string;
  targetClipId: string;
  type: "cut" | "fade" | "dissolve" | "wipe";
  durationMs: number;
  isUserEdited: boolean;
};

export type AssemblyManifestAssetReference = {
  assetId: string;
  type: AssetRecord["type"];
  name: string;
  relativePath: string;
  absolutePath: string;
  mimeType: string | null;
  sizeBytes: number;
};

export type AssemblyManifestVideoClip = {
  id: string;
  label: string;
  startMs: number;
  durationMs: number;
  asset: AssemblyManifestAssetReference;
};

export type AssemblyManifestAudioTrack = {
  id: string;
  label: string;
  speaker: string;
  startMs: number;
  durationMs: number;
  asset: AssemblyManifestAssetReference;
};

export type AssemblyManifestSubtitle = {
  id: string;
  sceneNumber: number;
  dialogueBlockId: string | null;
  speaker: string;
  text: string;
  startMs: number;
  durationMs: number;
};

export type AssemblyManifestTransition = {
  id: string;
  sourceClipId: string;
  targetClipId: string;
  type: TransitionRecord["type"];
  durationMs: number;
};

export type AssemblyManifest = {
  version: 1;
  generatedAt: string;
  project: {
    id: string;
    title: string;
    durationSeconds: number;
  };
  timeline: {
    durationMs: number;
    videoClips: AssemblyManifestVideoClip[];
    audioTracks: AssemblyManifestAudioTrack[];
    subtitleTracks: AssemblyManifestSubtitle[];
    transitions: AssemblyManifestTransition[];
  };
};

export type VideoExportJobStatus = LongRunningJobStatus;

export type VideoExportJobRecord = {
  id: string;
  projectId: string;
  status: VideoExportJobStatus;
  tool: string;
  exportSettings: ProjectExportSettings | null;
  outputRelativePath: string | null;
  outputAbsolutePath: string | null;
  manifestVersion: number | null;
  durationMs: number | null;
  progressPercent: number;
  progressMessage: string | null;
  errorMessage: string | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelRequestedAt: string | null;
  canceledAt: string | null;
  updatedAt: string;
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
  characters: Array<Omit<CharacterRecord, "id" | "projectId" | "asset" | "assetSource" | "visualConsistency" | "isUserEdited">>;
  relationships: Array<Omit<CharacterRelationshipRecord, "id" | "projectId" | "isUserEdited">>;
  plotBeats: Array<Omit<PlotBeatRecord, "id" | "projectId" | "isUserEdited">>;
  dialogueBlocks: Array<Omit<DialogueBlockRecord, "id" | "projectId" | "isUserEdited">>;
  scenes: Array<Omit<SceneRecord, "id" | "projectId" | "asset" | "assetSource" | "isUserEdited">>;
  timelineClips: Array<Omit<TimelineClipRecord, "id" | "projectId" | "asset" | "isUserEdited">>;
  preservedRecords: PreservedParseRecords;
  warnings: ScriptParseWarning[];
};

export type ProjectWorkflowStageId = "script" | "characters" | "storyboard" | "timeline" | "export";

export type ProjectWorkflowStageStatus =
  | "empty"
  | "blocked"
  | "ready"
  | "in_progress"
  | "completed"
  | "failed";

export type ProjectWorkflowStage = {
  id: ProjectWorkflowStageId;
  label: string;
  status: ProjectWorkflowStageStatus;
  summary: string;
  completedCount: number;
  totalCount: number;
};

export type ProjectWorkflowStatus = {
  stages: ProjectWorkflowStage[];
  currentStageId: ProjectWorkflowStageId;
  completionPercent: number;
  latestExportJob: VideoExportJobRecord | null;
};

export type ProjectDetail = ProjectSummary & {
  script: ScriptRecord;
  characters: CharacterRecord[];
  relationships: CharacterRelationshipRecord[];
  plotBeats: PlotBeatRecord[];
  dialogueBlocks: DialogueBlockRecord[];
  scenes: SceneRecord[];
  timelineClips: TimelineClipRecord[];
  audioTracks: AudioTrackRecord[];
  subtitleTracks: SubtitleTrackRecord[];
  transitions: TransitionRecord[];
  workflowStatus: ProjectWorkflowStatus;
};
