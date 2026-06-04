import { getProject } from "../../lib/db.ts";
import { createFakeStoryboardPlannerProvider } from "./fake-provider.ts";
import type {
  StoryboardPlannerInput,
  StoryboardPlannerProvider,
  StoryboardPlannerProviderOutput,
  StoryboardPlan,
} from "./types.ts";

export class StoryboardPlannerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StoryboardPlannerError";
  }
}

function requireText(value: string, field: string) {
  if (!value.trim()) {
    throw new StoryboardPlannerError(`Storyboard planner ${field} is required.`);
  }
}

function validateProviderOutput(output: StoryboardPlannerProviderOutput) {
  requireText(output.provider, "provider");
  requireText(output.model, "model");
  requireText(output.summary, "summary");
  if (!Array.isArray(output.shots) || output.shots.length === 0) {
    throw new StoryboardPlannerError("Storyboard planner shots must contain at least one shot.");
  }
  for (const shot of output.shots) {
    requireText(shot.id, "shot.id");
    requireText(shot.sceneId, "shot.sceneId");
    requireText(shot.title, "shot.title");
    requireText(shot.description, "shot.description");
    if (!Number.isInteger(shot.startMs) || shot.startMs < 0) {
      throw new StoryboardPlannerError("Storyboard planner shot.startMs must be a non-negative integer.");
    }
    if (!Number.isInteger(shot.durationMs) || shot.durationMs <= 0) {
      throw new StoryboardPlannerError("Storyboard planner shot.durationMs must be a positive integer.");
    }
  }
}

export function planStoryboard(
  input: StoryboardPlannerInput,
  provider: StoryboardPlannerProvider = createFakeStoryboardPlannerProvider()
): StoryboardPlan | null {
  const project = getProject(input.projectId);
  if (!project) return null;
  if (project.scenes.length === 0) {
    throw new StoryboardPlannerError("Storyboard planner requires at least one scene.");
  }

  const targetDurationMs = input.targetDurationMs ?? Math.max(
    ...project.timelineClips.map((clip) => clip.startMs + clip.durationMs),
    project.durationSeconds * 1000,
    0
  );
  const output = provider.planStoryboard({
    projectId: project.id,
    projectTitle: project.title,
    scenes: project.scenes,
    plotBeats: project.plotBeats,
    dialogueBlocks: project.dialogueBlocks,
    timelineClips: project.timelineClips,
    style: input.style?.trim() || "竖屏短剧分镜，节奏明确，镜头可执行",
    targetDurationMs,
  });
  validateProviderOutput(output);

  return {
    ...output,
    projectId: project.id,
    projectTitle: project.title,
    createdAt: new Date().toISOString(),
  };
}
