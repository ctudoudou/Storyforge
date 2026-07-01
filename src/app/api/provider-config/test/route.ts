import { tmpdir } from "node:os";
import { join } from "node:path";

import { NextResponse } from "next/server.js";

import { apiError } from "../../../../lib/next-api-response.ts";
import { validateRuntimeProviderConfig } from "../../../../lib/provider-config.ts";
import {
  configuredRuntimeProviderProfile,
  createHttpCharacterDesignerProvider,
  createHttpImageGenerationProvider,
  createHttpSceneDesignerProvider,
  createHttpScriptParserProvider,
  createHttpStoryboardPlannerProvider,
  createHttpVideoAssemblyProvider,
  type RuntimeProviderConfig,
  type RuntimeProviderEndpoint,
  type RuntimeProviderProfile,
} from "../../../../agents/provider-runtime.ts";
import type { CharacterRecord, SceneRecord } from "../../../../lib/types.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProviderTestCategory = "ok" | "auth" | "http" | "network" | "invalid_response" | "unknown";

type ProviderTestResult = {
  ok: boolean;
  endpoint: RuntimeProviderEndpoint;
  providerId: string;
  providerName: string;
  category: ProviderTestCategory;
  message: string;
};

const endpointLabels: Record<RuntimeProviderEndpoint, string> = {
  scriptParsing: "scriptParsing",
  characterDesign: "characterDesign",
  sceneDesign: "sceneDesign",
  storyboardPlanning: "storyboardPlanning",
  imageGeneration: "imageGeneration",
  videoAssembly: "videoAssembly",
};

function isRuntimeProviderEndpoint(value: unknown): value is RuntimeProviderEndpoint {
  return typeof value === "string" && value in endpointLabels;
}

function assertArrayField(value: unknown, field: string) {
  if (!Array.isArray((value as Record<string, unknown>)?.[field])) {
    throw new Error(`Provider response must include ${field} array.`);
  }
}

function assertStringField(value: unknown, field: string) {
  if (typeof (value as Record<string, unknown>)?.[field] !== "string") {
    throw new Error(`Provider response must include ${field} string.`);
  }
}

function assertScriptParserOutput(value: unknown) {
  assertArrayField(value, "characters");
  assertArrayField(value, "scenes");
  assertArrayField(value, "relationships");
  assertArrayField(value, "plotBeats");
  assertArrayField(value, "dialogueBlocks");
  assertArrayField(value, "warnings");
}

function assertCharacterDesignOutput(value: unknown) {
  assertStringField(value, "provider");
  assertStringField(value, "model");
  assertStringField(value, "visualBrief");
  assertArrayField(value, "consistencyChecklist");
}

function assertSceneDesignOutput(value: unknown) {
  assertStringField(value, "provider");
  assertStringField(value, "model");
  assertStringField(value, "visualBrief");
  assertArrayField(value, "continuityChecklist");
}

function assertStoryboardOutput(value: unknown) {
  assertStringField(value, "provider");
  assertStringField(value, "model");
  assertStringField(value, "summary");
  assertArrayField(value, "shots");
}

function assertImageOutput(value: unknown) {
  const result = value as Record<string, unknown>;
  const data = result?.data;
  if (!(data instanceof Uint8Array) || data.byteLength === 0) {
    throw new Error("Provider response must include non-empty image data.");
  }
  if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(String(result.mimeType))) {
    throw new Error("Provider response must include supported image mimeType.");
  }
  if (![".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(String(result.extension))) {
    throw new Error("Provider response must include supported image extension.");
  }
}

function assertVideoOutput(value: unknown) {
  assertStringField(value, "outputRelativePath");
  assertStringField(value, "outputAbsolutePath");
  assertStringField(value, "mimeType");
  if (typeof (value as Record<string, unknown>)?.sizeBytes !== "number") {
    throw new Error("Provider response must include sizeBytes number.");
  }
}

const testCharacter: CharacterRecord = {
  id: "provider_test_character",
  projectId: "provider_test_project",
  name: "测试角色",
  age: null,
  role: "主角",
  traits: ["冷静", "敏锐"],
  isUserEdited: false,
  assetSource: null,
  visualConsistency: {
    notes: "保持短剧主角形象一致。",
    anchorAssetIds: [],
  },
  asset: null,
};

const testScene: SceneRecord = {
  id: "provider_test_scene",
  projectId: "provider_test_project",
  sceneNumber: 1,
  location: "测试客厅",
  timeOfDay: "夜",
  mood: "紧张",
  description: "角色发现关键线索。",
  camera: "近景",
  characters: ["测试角色"],
  isUserEdited: false,
  assetSource: null,
  asset: null,
};

async function runProviderTest(endpoint: RuntimeProviderEndpoint, providerId: string, profile: RuntimeProviderProfile) {
  switch (endpoint) {
    case "scriptParsing": {
      const provider = createHttpScriptParserProvider(providerId, profile);
      const output = await provider.parse({
        content: "场景1：测试客厅 - 夜\n测试角色：我找到了关键线索。",
      });
      assertScriptParserOutput(output);
      return;
    }
    case "characterDesign": {
      const provider = createHttpCharacterDesignerProvider(providerId, profile);
      const output = await provider.designCharacter({
        projectId: "provider_test_project",
        projectTitle: "Provider 测试项目",
        character: testCharacter,
        visualConsistency: testCharacter.visualConsistency,
        prompt: {
          target: "character",
          title: "测试角色形象",
          prompt: "竖屏短剧角色设定图，测试角色，现代都市风格。",
          negativePrompt: "低清晰度，畸形肢体",
          aspectRatio: "9:16",
          references: [],
          parameters: {},
        },
      });
      assertCharacterDesignOutput(output);
      return;
    }
    case "sceneDesign": {
      const provider = createHttpSceneDesignerProvider(providerId, profile);
      const output = await provider.designScene({
        projectId: "provider_test_project",
        projectTitle: "Provider 测试项目",
        scene: testScene,
        prompt: {
          target: "scene",
          title: "测试客厅夜景",
          prompt: "竖屏短剧场景图，现代客厅夜晚，紧张氛围。",
          negativePrompt: "低清晰度，过曝",
          aspectRatio: "9:16",
          references: [],
          parameters: {},
        },
      });
      assertSceneDesignOutput(output);
      return;
    }
    case "storyboardPlanning": {
      const provider = createHttpStoryboardPlannerProvider(providerId, profile);
      const output = await provider.planStoryboard({
        projectId: "provider_test_project",
        projectTitle: "Provider 测试项目",
        scenes: [testScene],
        plotBeats: [{
          id: "provider_test_beat",
          projectId: "provider_test_project",
          sceneNumber: 1,
          type: "conflict",
          summary: "角色发现关键线索。",
          isUserEdited: false,
        }],
        dialogueBlocks: [{
          id: "provider_test_dialogue",
          projectId: "provider_test_project",
          sceneNumber: 1,
          speaker: "测试角色",
          content: "我找到了关键线索。",
          orderIndex: 0,
          isUserEdited: false,
        }],
        timelineClips: [],
        style: "现代短剧",
        targetDurationMs: 15000,
      });
      assertStoryboardOutput(output);
      return;
    }
    case "imageGeneration": {
      const provider = createHttpImageGenerationProvider(providerId, profile);
      const output = await provider.generateImage({
        target: "character",
        projectId: "provider_test_project",
        name: "测试角色",
        prompt: "竖屏短剧角色设定图，测试角色，现代都市风格。",
        negativePrompt: "低清晰度，畸形肢体",
        aspectRatio: "9:16",
        style: "现代短剧",
        character: {
          name: "测试角色",
          role: "主角",
          traits: ["冷静", "敏锐"],
        },
        references: [],
        parentArtifacts: [],
        parameters: {},
      });
      assertImageOutput(output);
      return;
    }
    case "videoAssembly": {
      const provider = createHttpVideoAssemblyProvider(providerId, profile);
      const output = await provider.assemble({
        exportId: "provider_test_export",
        exportSettings: {
          outputFormat: "mp4",
          resolution: "720x1280",
          frameRate: 24,
          burnInSubtitles: true,
          audioMix: "balanced",
        },
        manifest: {
          version: 1,
          generatedAt: new Date(0).toISOString(),
          project: {
            id: "provider_test_project",
            title: "Provider 测试项目",
            durationSeconds: 0,
          },
          timeline: {
            durationMs: 0,
            videoClips: [],
            audioTracks: [],
            subtitleTracks: [],
            transitions: [],
          },
        },
        outputDir: join(tmpdir(), "storyforge-provider-test"),
      });
      assertVideoOutput(output);
      return;
    }
  }
}

function classifyProviderTestError(error: unknown): { category: ProviderTestCategory; message: string } {
  const message = error instanceof Error ? error.message : "Provider test failed.";

  if (/response must include|supported image|non-empty image/i.test(message)) {
    return { category: "invalid_response", message };
  }

  const httpStatus = message.match(/Provider request failed \((\d{3})\)/)?.[1];
  if (httpStatus === "401" || httpStatus === "403") {
    return { category: "auth", message };
  }
  if (httpStatus) {
    return { category: "http", message };
  }

  if (/fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|network/i.test(message)) {
    return { category: "network", message };
  }

  return { category: "unknown", message };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    config?: RuntimeProviderConfig;
    endpoint?: unknown;
  } | null;

  if (!body?.config || typeof body.config !== "object") {
    return apiError("BAD_REQUEST", "config must be an object", 400);
  }
  if (!isRuntimeProviderEndpoint(body.endpoint)) {
    return apiError("BAD_REQUEST", "endpoint is invalid", 400);
  }

  try {
    const config = validateRuntimeProviderConfig(body.config);
    const configured = configuredRuntimeProviderProfile(config, body.endpoint);
    if (!configured) {
      return apiError("BAD_REQUEST", `provider endpoint is not configured: ${body.endpoint}`, 400);
    }

    const providerName = `${configured.profile.kind}:${configured.id}`;
    try {
      await runProviderTest(body.endpoint, configured.id, configured.profile);
      const result: ProviderTestResult = {
        ok: true,
        endpoint: body.endpoint,
        providerId: configured.id,
        providerName,
        category: "ok",
        message: "Provider contract check passed.",
      };
      return NextResponse.json(result);
    } catch (error) {
      const classified = classifyProviderTestError(error);
      const result: ProviderTestResult = {
        ok: false,
        endpoint: body.endpoint,
        providerId: configured.id,
        providerName,
        category: classified.category,
        message: classified.message,
      };
      return NextResponse.json(result);
    }
  } catch (error) {
    return apiError(
      "BAD_REQUEST",
      error instanceof Error ? error.message : "Provider config is invalid",
      400
    );
  }
}
