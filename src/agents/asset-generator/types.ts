import type { AssetRecord } from "../../lib/types.ts";

export type ImageGenerationTarget = "character" | "scene" | "keyframe";

export type ImageGenerationReference = {
  assetId: string;
  role: "character-reference" | "scene-reference" | "style-reference" | "composition-reference";
};

export type CharacterImageGenerationContext = {
  name: string;
  role?: string;
  traits?: string[];
};

export type SceneImageGenerationContext = {
  location: string;
  timeOfDay?: string;
  mood?: string;
  camera?: string;
};

export type ImageGenerationRequest = {
  target: ImageGenerationTarget;
  projectId: string;
  name: string;
  prompt: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  style?: string;
  character?: CharacterImageGenerationContext;
  scene?: SceneImageGenerationContext;
  references?: ImageGenerationReference[];
  parameters?: Record<string, string | number | boolean | null>;
};

export type ImageGenerationProviderResult = {
  data: Uint8Array;
  mimeType: "image/png" | "image/jpeg" | "image/webp" | "image/svg+xml";
  extension: ".png" | ".jpg" | ".jpeg" | ".webp" | ".svg";
  seed?: number | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type ImageGenerationProvider = {
  name: string;
  model: string;
  generateImage(input: ImageGenerationRequest): ImageGenerationProviderResult | Promise<ImageGenerationProviderResult>;
};

export type GeneratedImageAsset = {
  asset: AssetRecord;
  target: ImageGenerationTarget;
  provider: string;
  model: string;
  prompt: string;
  parameters: Record<string, string | number | boolean | null>;
  seed: number | null;
  metadata: Record<string, string | number | boolean | null>;
};

export type CharacterDesignPromptInput = {
  character: CharacterImageGenerationContext;
  projectTitle?: string;
  storySummary?: string;
  style?: string;
  aspectRatio?: ImageGenerationRequest["aspectRatio"];
  visualConsistency?: {
    notes?: string;
    anchorAssetIds?: string[];
  };
  references?: ImageGenerationReference[];
};

export type CharacterDesignPrompt = {
  target: "character";
  title: string;
  prompt: string;
  negativePrompt: string;
  aspectRatio: ImageGenerationRequest["aspectRatio"];
  references: ImageGenerationReference[];
  parameters: Record<string, string | number | boolean | null>;
};
