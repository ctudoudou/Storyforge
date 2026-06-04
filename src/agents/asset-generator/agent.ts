import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { assetDir, registerAsset, registerImageGeneration } from "../../lib/db.ts";
import { createFakeImageGenerationProvider } from "./fake-provider.ts";
import type {
  GeneratedImageAsset,
  ImageGenerationProvider,
  ImageGenerationProviderResult,
  ImageGenerationRequest,
} from "./types.ts";

export type ImageGenerationAgentOptions = {
  provider?: ImageGenerationProvider;
};

const supportedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const supportedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg"]);

function assertNonEmpty(value: string, field: string) {
  if (!value.trim()) {
    throw new Error(`Image generation ${field} is required.`);
  }
}

function safeFileName(value: string) {
  const cleaned = value.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/^-+|-+$/g, "");
  return cleaned || "generated-image";
}

function validateRequest(input: ImageGenerationRequest) {
  assertNonEmpty(input.projectId, "projectId");
  assertNonEmpty(input.name, "name");
  assertNonEmpty(input.prompt, "prompt");

  if (input.target === "character" && !input.character?.name.trim()) {
    throw new Error("Character image generation requires character.name.");
  }

  if ((input.target === "scene" || input.target === "keyframe") && !input.scene?.location.trim()) {
    throw new Error(`${input.target} image generation requires scene.location.`);
  }
}

function validateProviderResult(output: ImageGenerationProviderResult) {
  if (!(output.data instanceof Uint8Array) || output.data.byteLength <= 0) {
    throw new Error("Image generation provider returned empty image data.");
  }

  if (!supportedMimeTypes.has(output.mimeType)) {
    throw new Error(`Image generation provider returned unsupported mime type: ${output.mimeType}.`);
  }

  if (!supportedExtensions.has(output.extension) || extname(`asset${output.extension}`) !== output.extension) {
    throw new Error(`Image generation provider returned unsupported extension: ${output.extension}.`);
  }
}

export async function generateImageAsset(
  input: ImageGenerationRequest,
  options: ImageGenerationAgentOptions = {}
): Promise<GeneratedImageAsset> {
  validateRequest(input);

  const provider = options.provider ?? createFakeImageGenerationProvider();
  const output = await provider.generateImage(input);
  validateProviderResult(output);

  const generatedDir = join(assetDir, "generated");
  await mkdir(generatedDir, { recursive: true });

  const fileName = `${Date.now()}-${randomUUID().replaceAll("-", "")}-${safeFileName(input.name)}${output.extension}`;
  const relativePath = `generated/${fileName}`;
  await writeFile(join(generatedDir, fileName), output.data);

  const asset = registerAsset({
    type: "image",
    name: `${safeFileName(input.name)}${output.extension}`,
    relativePath,
    mimeType: output.mimeType,
    sizeBytes: output.data.byteLength,
  });
  if (!asset) {
    throw new Error("Generated image could not be registered as a local asset.");
  }

  const sourceAssetIds = Array.from(new Set(input.references?.map((reference) => reference.assetId).filter(Boolean) ?? []));
  const generation = registerImageGeneration({
    projectId: input.projectId,
    assetId: asset.id,
    targetType: input.target,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt ?? null,
    provider: provider.name,
    model: provider.model,
    parameters: input.parameters ?? {},
    seed: output.seed ?? null,
    sourceAssetIds,
    parentArtifacts: input.parentArtifacts ?? [],
    metadata: output.metadata ?? {},
  });
  if (!generation) {
    throw new Error("Generated image metadata could not be registered.");
  }

  return {
    asset,
    generation,
    target: input.target,
    provider: provider.name,
    model: provider.model,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt ?? null,
    parameters: input.parameters ?? {},
    seed: output.seed ?? null,
    metadata: output.metadata ?? {},
  };
}
