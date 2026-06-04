import type { SceneRecord } from "../../lib/types.ts";
import type { ImageGenerationReference, ImageGenerationRequest, SceneKeyframePrompt } from "../asset-generator/types.ts";

export type SceneDesignerReference = ImageGenerationReference;

export type SceneDesignerInput = {
  projectId: string;
  sceneId: string;
  target?: "scene" | "keyframe";
  style?: string;
  aspectRatio?: ImageGenerationRequest["aspectRatio"];
  storySummary?: string;
  beatSummary?: string;
  references?: SceneDesignerReference[];
};

export type SceneDesignerContext = {
  projectId: string;
  projectTitle: string;
  scene: SceneRecord;
  prompt: SceneKeyframePrompt;
};

export type SceneDesignerProviderOutput = {
  provider: string;
  model: string;
  visualBrief: string;
  continuityChecklist: string[];
  metadata?: Record<string, unknown>;
};

export type SceneDesignerProvider = {
  name: string;
  model: string;
  designScene(context: SceneDesignerContext): SceneDesignerProviderOutput;
};

export type SceneDesignPlan = SceneDesignerProviderOutput & {
  projectId: string;
  sceneId: string;
  sceneLabel: string;
  prompt: SceneKeyframePrompt;
  createdAt: string;
};
