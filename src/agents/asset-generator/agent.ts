import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import {
  assetDir,
  createImageGenerationJob,
  getImageGenerationJob,
  recordImageGenerationJobProgress,
  registerAsset,
  registerImageGeneration,
  updateImageGenerationJobStatus,
} from "../../lib/db.ts";
import { createFakeImageGenerationProvider } from "./fake-provider.ts";
import type {
  GeneratedImageAsset,
  ImageGenerationProvider,
  ImageGenerationProviderResult,
  ImageGenerationRequest,
} from "./types.ts";

export type ImageGenerationAgentOptions = {
  provider?: ImageGenerationProvider;
  onJobCreated?: (job: NonNullable<ReturnType<typeof createImageGenerationJob>>) => void | Promise<void>;
};

export class ImageGenerationJobCanceledError extends Error {
  constructor(message = "Image generation job was canceled.") {
    super(message);
    this.name = "ImageGenerationJobCanceledError";
  }
}

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

function assertImageGenerationJobActive(jobId: string) {
  const currentJob = getImageGenerationJob(jobId);
  if (currentJob?.status === "canceled" || currentJob?.cancelRequestedAt) {
    throw new ImageGenerationJobCanceledError();
  }
}

export async function generateImageAsset(
  input: ImageGenerationRequest,
  options: ImageGenerationAgentOptions = {}
): Promise<GeneratedImageAsset> {
  validateRequest(input);

  const provider = options.provider ?? createFakeImageGenerationProvider();
  const sourceAssetIds = Array.from(new Set(input.references?.map((reference) => reference.assetId).filter(Boolean) ?? []));
  const job = createImageGenerationJob({
    projectId: input.projectId,
    targetType: input.target,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt ?? null,
    provider: provider.name,
    model: provider.model,
    parameters: input.parameters ?? {},
    sourceAssetIds,
    parentArtifacts: input.parentArtifacts ?? [],
  });
  if (!job) {
    throw new Error("Image generation job could not be registered.");
  }

  try {
    await options.onJobCreated?.(job);

    updateImageGenerationJobStatus({
      jobId: job.id,
      status: "running",
      progressPercent: 5,
      progressMessage: "Image generation started.",
    });
    assertImageGenerationJobActive(job.id);

    const output = await provider.generateImage(input);
    assertImageGenerationJobActive(job.id);
    recordImageGenerationJobProgress({
      jobId: job.id,
      progressPercent: 60,
      message: "Image provider output received.",
    });
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

    assertImageGenerationJobActive(job.id);
    const completedJob = updateImageGenerationJobStatus({
      jobId: job.id,
      status: "completed",
      assetId: asset.id,
      generationId: generation.id,
      progressMessage: "Image generation completed.",
    });
    if (!completedJob) {
      throw new Error("Image generation job could not be completed.");
    }

    return {
      asset,
      generation,
      job: completedJob,
      target: input.target,
      provider: provider.name,
      model: provider.model,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt ?? null,
      parameters: input.parameters ?? {},
      seed: output.seed ?? null,
      metadata: output.metadata ?? {},
    };
  } catch (error) {
    if (!(error instanceof ImageGenerationJobCanceledError)) {
      updateImageGenerationJobStatus({
        jobId: job.id,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Image generation failed.",
      });
    }
    throw error;
  }
}
