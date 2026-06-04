import { buildSceneKeyframePrompt } from "../asset-generator/index.ts";
import { getProject } from "../../lib/db.ts";
import { createFakeSceneDesignerProvider } from "./fake-provider.ts";
import type {
  SceneDesignerInput,
  SceneDesignerProvider,
  SceneDesignerProviderOutput,
  SceneDesignerReference,
  SceneDesignPlan,
} from "./types.ts";

export class SceneDesignerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SceneDesignerError";
  }
}

function requireText(value: string, field: string) {
  if (!value.trim()) {
    throw new SceneDesignerError(`Scene designer ${field} is required.`);
  }
}

function validateProviderOutput(output: SceneDesignerProviderOutput) {
  requireText(output.provider, "provider");
  requireText(output.model, "model");
  requireText(output.visualBrief, "visualBrief");
  if (!Array.isArray(output.continuityChecklist) || output.continuityChecklist.some((item) => !item.trim())) {
    throw new SceneDesignerError("Scene designer continuityChecklist must contain non-empty items.");
  }
}

function sceneLabel(sceneNumber: number, location: string) {
  return `S${String(sceneNumber).padStart(2, "0")} - ${location}`;
}

function sceneReferences(input: SceneDesignerInput, sceneAssetId: string | null): SceneDesignerReference[] {
  const references = [...(input.references ?? [])];
  if (sceneAssetId && !references.some((reference) => reference.assetId === sceneAssetId)) {
    references.push({
      assetId: sceneAssetId,
      role: "scene-reference",
    });
  }
  return references;
}

export function designScene(
  input: SceneDesignerInput,
  provider: SceneDesignerProvider = createFakeSceneDesignerProvider()
): SceneDesignPlan | null {
  const project = getProject(input.projectId);
  if (!project) return null;

  const scene = project.scenes.find((item) => item.id === input.sceneId);
  if (!scene) return null;

  const prompt = buildSceneKeyframePrompt({
    target: input.target ?? "scene",
    projectTitle: project.title,
    storySummary: input.storySummary ?? project.script.content.slice(0, 360),
    beatSummary: input.beatSummary,
    style: input.style,
    aspectRatio: input.aspectRatio,
    scene: {
      location: scene.location,
      timeOfDay: scene.timeOfDay,
      mood: scene.mood,
      camera: scene.camera,
    },
    characters: project.characters
      .filter((character) => scene.characters.includes(character.name))
      .map((character) => ({
        name: character.name,
        role: character.role,
        traits: character.traits,
      })),
    references: sceneReferences(input, scene.asset?.id ?? null),
  });

  const output = provider.designScene({
    projectId: project.id,
    projectTitle: project.title,
    scene,
    prompt,
  });
  validateProviderOutput(output);

  return {
    ...output,
    projectId: project.id,
    sceneId: scene.id,
    sceneLabel: sceneLabel(scene.sceneNumber, scene.location),
    prompt,
    createdAt: new Date().toISOString(),
  };
}
