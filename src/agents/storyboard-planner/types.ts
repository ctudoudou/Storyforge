import type {
  DialogueBlockRecord,
  PlotBeatRecord,
  SceneRecord,
  TimelineClipRecord,
} from "../../lib/types.ts";

export type StoryboardPlannerInput = {
  projectId: string;
  style?: string;
  targetDurationMs?: number;
};

export type StoryboardPlannerContext = {
  projectId: string;
  projectTitle: string;
  scenes: SceneRecord[];
  plotBeats: PlotBeatRecord[];
  dialogueBlocks: DialogueBlockRecord[];
  timelineClips: TimelineClipRecord[];
  style: string;
  targetDurationMs: number;
};

export type StoryboardShot = {
  id: string;
  sceneId: string;
  sceneNumber: number;
  title: string;
  description: string;
  camera: string;
  characters: string[];
  beatSummary: string;
  dialogueSummary: string;
  startMs: number;
  durationMs: number;
};

export type StoryboardPlannerProviderOutput = {
  provider: string;
  model: string;
  summary: string;
  shots: StoryboardShot[];
  metadata?: Record<string, unknown>;
};

export type StoryboardPlannerProvider = {
  name: string;
  model: string;
  planStoryboard(context: StoryboardPlannerContext): StoryboardPlannerProviderOutput;
};

export type StoryboardPlan = StoryboardPlannerProviderOutput & {
  projectId: string;
  projectTitle: string;
  createdAt: string;
};
