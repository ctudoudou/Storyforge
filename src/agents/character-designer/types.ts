import type { CharacterRecord, CharacterVisualConsistencySettings } from "../../lib/types.ts";
import type { CharacterDesignPrompt, ImageGenerationReference, ImageGenerationRequest } from "../asset-generator/types.ts";

export type CharacterDesignerReference = ImageGenerationReference;

export type CharacterDesignerInput = {
  projectId: string;
  characterId: string;
  style?: string;
  aspectRatio?: ImageGenerationRequest["aspectRatio"];
  storySummary?: string;
  references?: CharacterDesignerReference[];
};

export type CharacterDesignerContext = {
  projectId: string;
  projectTitle: string;
  character: CharacterRecord;
  visualConsistency: CharacterVisualConsistencySettings;
  prompt: CharacterDesignPrompt;
};

export type CharacterDesignerProviderOutput = {
  provider: string;
  model: string;
  visualBrief: string;
  consistencyChecklist: string[];
  metadata?: Record<string, unknown>;
};

export type CharacterDesignerProvider = {
  name: string;
  model: string;
  designCharacter(context: CharacterDesignerContext): CharacterDesignerProviderOutput | Promise<CharacterDesignerProviderOutput>;
};

export type CharacterDesignPlan = CharacterDesignerProviderOutput & {
  projectId: string;
  characterId: string;
  characterName: string;
  prompt: CharacterDesignPrompt;
  createdAt: string;
};
