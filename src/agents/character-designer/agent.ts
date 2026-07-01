import { buildCharacterDesignPrompt } from "../asset-generator/index.ts";
import { getProject } from "../../lib/db.ts";
import { resolveCharacterDesignerProvider } from "../provider-runtime.ts";
import { createFakeCharacterDesignerProvider } from "./fake-provider.ts";
import type {
  CharacterDesignerInput,
  CharacterDesignerContext,
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

function isPromiseLike<T>(value: T | Promise<T>): value is Promise<T> {
  return Boolean(value && typeof (value as Promise<T>).then === "function");
}

function characterDesignContext(input: CharacterDesignerInput): {
  context: CharacterDesignerContext;
  base: Pick<CharacterDesignPlan, "projectId" | "characterId" | "characterName" | "prompt">;
} | null {
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

  const context = {
    projectId: project.id,
    projectTitle: project.title,
    character,
    visualConsistency: character.visualConsistency,
    prompt,
  };

  return {
    context,
    base: {
      projectId: project.id,
      characterId: character.id,
      characterName: character.name,
      prompt,
    },
  };
}

function characterDesignPlan(
  base: Pick<CharacterDesignPlan, "projectId" | "characterId" | "characterName" | "prompt">,
  output: CharacterDesignerProviderOutput
): CharacterDesignPlan {
  validateProviderOutput(output);

  return {
    ...output,
    ...base,
    createdAt: new Date().toISOString(),
  };
}

export function designCharacter(
  input: CharacterDesignerInput,
  provider: CharacterDesignerProvider = createFakeCharacterDesignerProvider()
): CharacterDesignPlan | null {
  const prepared = characterDesignContext(input);
  if (!prepared) return null;

  const output = provider.designCharacter(prepared.context);
  if (isPromiseLike(output)) {
    throw new CharacterDesignerError("Character designer provider returned an async result; use designCharacterWithRuntime.");
  }
  return characterDesignPlan(prepared.base, output);
}

export async function designCharacterWithRuntime(
  input: CharacterDesignerInput,
  provider?: CharacterDesignerProvider
): Promise<CharacterDesignPlan | null> {
  const prepared = characterDesignContext(input);
  if (!prepared) return null;

  const activeProvider = provider ?? await resolveCharacterDesignerProvider() ?? createFakeCharacterDesignerProvider();
  const output = await activeProvider.designCharacter(prepared.context);
  return characterDesignPlan(prepared.base, output);
}
