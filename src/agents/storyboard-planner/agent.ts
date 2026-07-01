import { getProject } from "../../lib/db.ts";
import { resolveStoryboardPlannerProvider } from "../provider-runtime.ts";
import { createFakeStoryboardPlannerProvider } from "./fake-provider.ts";
import type {
  StoryboardPlannerInput,
  StoryboardPlannerContext,
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

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return Boolean(value && typeof (value as Promise<T>).then === "function");
}

function storyboardPlannerContext(input: StoryboardPlannerInput): {
  context: StoryboardPlannerContext;
  base: Pick<StoryboardPlan, "projectId" | "projectTitle">;
} | null {
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
  return {
    context: {
      projectId: project.id,
      projectTitle: project.title,
      scenes: project.scenes,
      plotBeats: project.plotBeats,
      dialogueBlocks: project.dialogueBlocks,
      timelineClips: project.timelineClips,
      style: input.style?.trim() || "竖屏短剧分镜，节奏明确，镜头可执行",
      targetDurationMs,
    },
    base: {
      projectId: project.id,
      projectTitle: project.title,
    },
  };
}

function storyboardPlan(
  base: Pick<StoryboardPlan, "projectId" | "projectTitle">,
  output: StoryboardPlannerProviderOutput
): StoryboardPlan {
  validateProviderOutput(output);

  return {
    ...output,
    ...base,
    createdAt: new Date().toISOString(),
  };
}

export function planStoryboard(
  input: StoryboardPlannerInput,
  provider: StoryboardPlannerProvider = createFakeStoryboardPlannerProvider()
): StoryboardPlan | null {
  const prepared = storyboardPlannerContext(input);
  if (!prepared) return null;

  const output = provider.planStoryboard(prepared.context);
  if (isPromiseLike(output)) {
    throw new StoryboardPlannerError("Storyboard planner provider returned an async result; use planStoryboardWithRuntime.");
  }
  return storyboardPlan(prepared.base, output);
}

export async function planStoryboardWithRuntime(
  input: StoryboardPlannerInput,
  provider?: StoryboardPlannerProvider
): Promise<StoryboardPlan | null> {
  const prepared = storyboardPlannerContext(input);
  if (!prepared) return null;

  const activeProvider = provider ?? await resolveStoryboardPlannerProvider() ?? createFakeStoryboardPlannerProvider();
  const output = await activeProvider.planStoryboard(prepared.context);
  return storyboardPlan(prepared.base, output);
}
