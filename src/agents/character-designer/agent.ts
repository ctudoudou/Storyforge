import { buildCharacterDesignPrompt } from "../asset-generator/index.ts";
import { getProject } from "../../lib/db.ts";
import { createFakeCharacterDesignerProvider } from "./fake-provider.ts";
import type {
  CharacterDesignerInput,
  CharacterDesignerProvider,
  CharacterDesignerProviderOutput,
  CharacterDesignPlan,
} from "./types.ts";

export class CharacterDesignerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacterDesignerError";
  }
}

function requireText(value: string, field: string) {
  if (!value.trim()) {
    throw new CharacterDesignerError(`Character designer ${field} is required.`);
  }
}

function validateProviderOutput(output: CharacterDesignerProviderOutput) {
  requireText(output.provider, "provider");
  requireText(output.model, "model");
  requireText(output.visualBrief, "visualBrief");
  if (!Array.isArray(output.consistencyChecklist) || output.consistencyChecklist.some((item) => !item.trim())) {
    throw new CharacterDesignerError("Character designer consistencyChecklist must contain non-empty items.");
  }
}

export function designCharacter(
  input: CharacterDesignerInput,
  provider: CharacterDesignerProvider = createFakeCharacterDesignerProvider()
): CharacterDesignPlan | null {
  const project = getProject(input.projectId);
  if (!project) return null;

  const character = project.characters.find((item) => item.id === input.characterId);
  if (!character) return null;

  const prompt = buildCharacterDesignPrompt({
    projectTitle: project.title,
    storySummary: input.storySummary ?? project.script.content.slice(0, 280),
    style: input.style,
    aspectRatio: input.aspectRatio,
    character: {
      name: character.name,
      role: character.role,
      traits: character.traits,
    },
    visualConsistency: character.visualConsistency,
    references: input.references,
  });

  const output = provider.designCharacter({
    projectId: project.id,
    projectTitle: project.title,
    character,
    visualConsistency: character.visualConsistency,
    prompt,
  });
  validateProviderOutput(output);

  return {
    ...output,
    projectId: project.id,
    characterId: character.id,
    characterName: character.name,
    prompt,
    createdAt: new Date().toISOString(),
  };
}
