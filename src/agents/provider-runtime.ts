import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { ImageGenerationProvider, ImageGenerationProviderResult } from "./asset-generator/types.ts";
import type { CharacterDesignerProvider } from "./character-designer/types.ts";
import type { SceneDesignerProvider } from "./scene-designer/types.ts";
import type { ScriptParserProvider } from "./script-parser/types.ts";
import type { StoryboardPlannerProvider } from "./storyboard-planner/types.ts";
import type { VideoAssemblyProvider, VideoAssemblyResult } from "./video-assembler/types.ts";

export type RuntimeProviderKind = "local-http" | "volcengine" | "kling";
export type RuntimeProviderEndpoint =
  | "scriptParsing"
  | "characterDesign"
  | "sceneDesign"
  | "storyboardPlanning"
  | "imageGeneration"
  | "videoAssembly";

export type RuntimeProviderProfile = {
  kind: RuntimeProviderKind;
  baseUrl: string;
  model?: string;
  headers?: Record<string, string>;
  endpoints: Partial<Record<RuntimeProviderEndpoint, string>>;
};

export type RuntimeProviderConfig = {
  version: 1;
  active?: Partial<Record<RuntimeProviderEndpoint, string>>;
  providers: Record<string, RuntimeProviderProfile>;
};

export type RuntimeProviders = {
  scriptParserProvider?: ScriptParserProvider;
  characterDesignerProvider?: CharacterDesignerProvider;
  sceneDesignerProvider?: SceneDesignerProvider;
  storyboardPlannerProvider?: StoryboardPlannerProvider;
  imageGenerationProvider?: ImageGenerationProvider;
  videoAssemblyProvider?: VideoAssemblyProvider;
};

type RuntimeProviderModule = RuntimeProviders & {
  runtimeProviders?: RuntimeProviders;
  liveProviders?: RuntimeProviders;
};

let loadedModuleProviders: RuntimeProviders | null | undefined;

function interpolateEnv(value: string) {
  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, name: string) => process.env[name] ?? "");
}

function requestUrl(profile: RuntimeProviderProfile, endpoint: RuntimeProviderEndpoint) {
  const path = profile.endpoints[endpoint];
  if (!path) {
    throw new Error(`Provider endpoint is not configured: ${endpoint}`);
  }
  return new URL(path, profile.baseUrl.endsWith("/") ? profile.baseUrl : `${profile.baseUrl}/`).toString();
}

function requestHeaders(profile: RuntimeProviderProfile) {
  return {
    "Content-Type": "application/json",
    ...Object.fromEntries(
      Object.entries(profile.headers ?? {}).map(([key, value]) => [key, interpolateEnv(value)])
    ),
  };
}

function providerName(profileId: string, profile: RuntimeProviderProfile) {
  return `${profile.kind}:${profileId}`;
}

function providerModel(profileId: string, profile: RuntimeProviderProfile) {
  return profile.model?.trim() || profileId;
}

function bytesFromBase64(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

async function postJson(profile: RuntimeProviderProfile, endpoint: RuntimeProviderEndpoint, body: unknown) {
  const response = await fetch(requestUrl(profile, endpoint), {
    method: "POST",
    headers: requestHeaders(profile),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Provider request failed (${response.status}): ${text || response.statusText}`);
  }

  return response;
}

async function postProviderJson(
  profileId: string,
  profile: RuntimeProviderProfile,
  endpoint: RuntimeProviderEndpoint,
  request: unknown
) {
  const response = await postJson(profile, endpoint, {
    provider: {
      id: profileId,
      kind: profile.kind,
      model: providerModel(profileId, profile),
    },
    request,
  });
  return response.json() as Promise<unknown>;
}

export function createHttpScriptParserProvider(
  profileId: string,
  profile: RuntimeProviderProfile
): ScriptParserProvider {
  return {
    name: providerName(profileId, profile),
    async parse(input) {
      return postProviderJson(profileId, profile, "scriptParsing", input);
    },
  };
}

export function createHttpCharacterDesignerProvider(
  profileId: string,
  profile: RuntimeProviderProfile
): CharacterDesignerProvider {
  return {
    name: providerName(profileId, profile),
    model: providerModel(profileId, profile),
    async designCharacter(context) {
      return postProviderJson(profileId, profile, "characterDesign", context) as ReturnType<CharacterDesignerProvider["designCharacter"]>;
    },
  };
}

export function createHttpSceneDesignerProvider(
  profileId: string,
  profile: RuntimeProviderProfile
): SceneDesignerProvider {
  return {
    name: providerName(profileId, profile),
    model: providerModel(profileId, profile),
    async designScene(context) {
      return postProviderJson(profileId, profile, "sceneDesign", context) as ReturnType<SceneDesignerProvider["designScene"]>;
    },
  };
}

export function createHttpStoryboardPlannerProvider(
  profileId: string,
  profile: RuntimeProviderProfile
): StoryboardPlannerProvider {
  return {
    name: providerName(profileId, profile),
    model: providerModel(profileId, profile),
    async planStoryboard(context) {
      return postProviderJson(profileId, profile, "storyboardPlanning", context) as ReturnType<StoryboardPlannerProvider["planStoryboard"]>;
    },
  };
}

function imageResultFromJson(json: Record<string, unknown>): ImageGenerationProviderResult {
  const dataBase64 = typeof json.dataBase64 === "string"
    ? json.dataBase64
    : typeof json.imageBase64 === "string"
      ? json.imageBase64
      : "";
  if (!dataBase64) {
    throw new Error("HTTP image provider response must include dataBase64 or imageBase64.");
  }

  return {
    data: bytesFromBase64(dataBase64),
    mimeType: json.mimeType as ImageGenerationProviderResult["mimeType"],
    extension: json.extension as ImageGenerationProviderResult["extension"],
    seed: typeof json.seed === "number" ? json.seed : null,
    metadata: json.metadata && typeof json.metadata === "object" && !Array.isArray(json.metadata)
      ? json.metadata as ImageGenerationProviderResult["metadata"]
      : {},
  };
}

export function createHttpImageGenerationProvider(
  profileId: string,
  profile: RuntimeProviderProfile
): ImageGenerationProvider {
  return {
    name: providerName(profileId, profile),
    model: providerModel(profileId, profile),
    async generateImage(input) {
      const response = await postJson(profile, "imageGeneration", {
        provider: {
          id: profileId,
          kind: profile.kind,
          model: providerModel(profileId, profile),
        },
        request: input,
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.startsWith("image/")) {
        const data = new Uint8Array(await response.arrayBuffer());
        const mimeType = contentType.split(";")[0] as ImageGenerationProviderResult["mimeType"];
        const extension = mimeType === "image/jpeg"
          ? ".jpg"
          : mimeType === "image/png"
            ? ".png"
            : mimeType === "image/webp"
              ? ".webp"
              : ".svg";
        return { data, mimeType, extension, metadata: { provider: profile.kind } };
      }

      return imageResultFromJson(await response.json() as Record<string, unknown>);
    },
  };
}

function videoResultFromJson(json: Record<string, unknown>): VideoAssemblyResult {
  if (
    typeof json.outputRelativePath !== "string" ||
    typeof json.outputAbsolutePath !== "string" ||
    typeof json.sizeBytes !== "number" ||
    typeof json.mimeType !== "string"
  ) {
    throw new Error("HTTP video provider response must include outputRelativePath, outputAbsolutePath, sizeBytes, and mimeType.");
  }

  return {
    outputRelativePath: json.outputRelativePath,
    outputAbsolutePath: json.outputAbsolutePath,
    sizeBytes: json.sizeBytes,
    mimeType: json.mimeType,
  };
}

export function createHttpVideoAssemblyProvider(
  profileId: string,
  profile: RuntimeProviderProfile
): VideoAssemblyProvider {
  return {
    name: providerName(profileId, profile),
    async assemble(request) {
      const response = await postJson(profile, "videoAssembly", {
        provider: {
          id: profileId,
          kind: profile.kind,
          model: providerModel(profileId, profile),
        },
        request,
      });
      return videoResultFromJson(await response.json() as Record<string, unknown>);
    },
  };
}

export function parseRuntimeProviderConfig(value: string): RuntimeProviderConfig {
  const parsed = JSON.parse(value) as RuntimeProviderConfig;
  if (!parsed || parsed.version !== 1 || !parsed.providers || typeof parsed.providers !== "object") {
    throw new Error("Storyforge provider config must include version: 1 and providers.");
  }
  return parsed;
}

export function loadRuntimeProviderConfig(): RuntimeProviderConfig | null {
  if (process.env.STORYFORGE_PROVIDER_CONFIG?.trim()) {
    return parseRuntimeProviderConfig(process.env.STORYFORGE_PROVIDER_CONFIG);
  }

  const configPath = process.env.STORYFORGE_PROVIDER_CONFIG_FILE?.trim() || ".storyforge/providers.json";
  const absolutePath = resolve(configPath);
  if (!existsSync(absolutePath)) return null;
  return parseRuntimeProviderConfig(readFileSync(absolutePath, "utf8"));
}

function configuredProfile(
  config: RuntimeProviderConfig | null,
  endpoint: RuntimeProviderEndpoint
): { id: string; profile: RuntimeProviderProfile } | null {
  if (!config) return null;

  const activeId = config.active?.[endpoint];
  if (activeId) {
    const profile = config.providers[activeId];
    if (!profile) {
      throw new Error(`Active provider is missing from config: ${activeId}`);
    }
    return { id: activeId, profile };
  }

  const fallback = Object.entries(config.providers).find(([, profile]) => Boolean(profile.endpoints[endpoint]));
  return fallback ? { id: fallback[0], profile: fallback[1] } : null;
}

async function loadModuleProviders(): Promise<RuntimeProviders | null> {
  if (loadedModuleProviders !== undefined) return loadedModuleProviders;

  const modulePath = process.env.STORYFORGE_PROVIDER_MODULE || process.env.STORYFORGE_LIVE_PROVIDER_MODULE;
  if (!modulePath?.trim()) {
    loadedModuleProviders = null;
    return loadedModuleProviders;
  }

  const imported = await import(
    /* webpackIgnore: true */
    pathToFileURL(resolve(modulePath)).href
  ) as RuntimeProviderModule;
  loadedModuleProviders = imported.runtimeProviders ?? imported.liveProviders ?? {
    scriptParserProvider: imported.scriptParserProvider,
    characterDesignerProvider: imported.characterDesignerProvider,
    sceneDesignerProvider: imported.sceneDesignerProvider,
    storyboardPlannerProvider: imported.storyboardPlannerProvider,
    imageGenerationProvider: imported.imageGenerationProvider,
    videoAssemblyProvider: imported.videoAssemblyProvider,
  };
  return loadedModuleProviders;
}

export async function resolveScriptParserProvider(): Promise<ScriptParserProvider | null> {
  const moduleProviders = await loadModuleProviders();
  if (moduleProviders?.scriptParserProvider) return moduleProviders.scriptParserProvider;

  const configured = configuredProfile(loadRuntimeProviderConfig(), "scriptParsing");
  return configured ? createHttpScriptParserProvider(configured.id, configured.profile) : null;
}

export async function resolveCharacterDesignerProvider(): Promise<CharacterDesignerProvider | null> {
  const moduleProviders = await loadModuleProviders();
  if (moduleProviders?.characterDesignerProvider) return moduleProviders.characterDesignerProvider;

  const configured = configuredProfile(loadRuntimeProviderConfig(), "characterDesign");
  return configured ? createHttpCharacterDesignerProvider(configured.id, configured.profile) : null;
}

export async function resolveSceneDesignerProvider(): Promise<SceneDesignerProvider | null> {
  const moduleProviders = await loadModuleProviders();
  if (moduleProviders?.sceneDesignerProvider) return moduleProviders.sceneDesignerProvider;

  const configured = configuredProfile(loadRuntimeProviderConfig(), "sceneDesign");
  return configured ? createHttpSceneDesignerProvider(configured.id, configured.profile) : null;
}

export async function resolveStoryboardPlannerProvider(): Promise<StoryboardPlannerProvider | null> {
  const moduleProviders = await loadModuleProviders();
  if (moduleProviders?.storyboardPlannerProvider) return moduleProviders.storyboardPlannerProvider;

  const configured = configuredProfile(loadRuntimeProviderConfig(), "storyboardPlanning");
  return configured ? createHttpStoryboardPlannerProvider(configured.id, configured.profile) : null;
}

export async function resolveImageGenerationProvider(): Promise<ImageGenerationProvider | null> {
  const moduleProviders = await loadModuleProviders();
  if (moduleProviders?.imageGenerationProvider) return moduleProviders.imageGenerationProvider;

  const configured = configuredProfile(loadRuntimeProviderConfig(), "imageGeneration");
  return configured ? createHttpImageGenerationProvider(configured.id, configured.profile) : null;
}

export async function resolveVideoAssemblyProvider(): Promise<VideoAssemblyProvider | null> {
  const moduleProviders = await loadModuleProviders();
  if (moduleProviders?.videoAssemblyProvider) return moduleProviders.videoAssemblyProvider;

  const configured = configuredProfile(loadRuntimeProviderConfig(), "videoAssembly");
  return configured ? createHttpVideoAssemblyProvider(configured.id, configured.profile) : null;
}

export function resetRuntimeProviderCacheForTests() {
  loadedModuleProviders = undefined;
}
