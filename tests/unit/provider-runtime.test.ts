import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createHttpCharacterDesignerProvider,
  createHttpImageGenerationProvider,
  createHttpSceneDesignerProvider,
  createHttpScriptParserProvider,
  createHttpStoryboardPlannerProvider,
  createHttpVideoAssemblyProvider,
  parseRuntimeProviderConfig,
  resetRuntimeProviderCacheForTests,
  resolveScriptParserProvider,
  type RuntimeProviderProfile,
} from "../../src/agents/provider-runtime.ts";

async function withMockFetch<T>(
  handler: (input: string | URL | Request, init?: RequestInit) => Response | Promise<Response>,
  callback: () => Promise<T>
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = handler as typeof fetch;
  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

test("HTTP image provider posts provider metadata and decodes base64 image output", async () => {
  const received: { value?: Record<string, unknown> } = {};

  await withMockFetch(async (input, init) => {
    assert.equal(input.toString(), "http://127.0.0.1:3011/images");
    received.value = JSON.parse(init?.body as string) as Record<string, unknown>;
    return Response.json({
      dataBase64: Buffer.from("<svg />").toString("base64"),
      mimeType: "image/svg+xml",
      extension: ".svg",
      seed: 42,
      metadata: { vendor: "local-http" },
    });
  }, async () => {
    const profile: RuntimeProviderProfile = {
      kind: "local-http",
      baseUrl: "http://127.0.0.1:3011",
      model: "local-image-v1",
      endpoints: { imageGeneration: "/images" },
    };
    const provider = createHttpImageGenerationProvider("local-image", profile);
    const result = await provider.generateImage({
      target: "character",
      projectId: "project_1",
      name: "角色图",
      prompt: "生成角色图",
      character: { name: "林夏" },
    });

    assert.equal(provider.name, "local-http:local-image");
    assert.equal(provider.model, "local-image-v1");
    assert.equal(result.mimeType, "image/svg+xml");
    assert.equal(result.extension, ".svg");
    assert.equal(result.seed, 42);
    assert.equal(new TextDecoder().decode(result.data), "<svg />");
    assert.equal((received.value?.provider as Record<string, unknown>).kind, "local-http");
    assert.equal((received.value?.request as Record<string, unknown>).prompt, "生成角色图");
  });
});

test("HTTP video provider posts manifest and returns local output contract", async () => {
  const received: { value?: Record<string, unknown> } = {};
  const outputAbsolutePath = join(tmpdir(), "storyforge-http-video-output.json");

  await withMockFetch(async (input, init) => {
    assert.equal(input.toString(), "http://127.0.0.1:3012/assemble");
    received.value = JSON.parse(init?.body as string) as Record<string, unknown>;
    return Response.json({
      outputRelativePath: "exports/storyforge-http-video-output.json",
      outputAbsolutePath,
      sizeBytes: 128,
      mimeType: "application/json",
    });
  }, async () => {
    const provider = createHttpVideoAssemblyProvider("local-video", {
      kind: "local-http",
      baseUrl: "http://127.0.0.1:3012",
      endpoints: { videoAssembly: "/assemble" },
    });
    const result = await provider.assemble({
      exportId: "video_export_1",
      exportSettings: {
        outputFormat: "mp4",
        resolution: "1080x1920",
        frameRate: 30,
        burnInSubtitles: true,
        audioMix: "balanced",
      },
      outputDir: join(tmpdir(), "storyforge-exports"),
      manifest: {
        version: 1,
        generatedAt: "2026-06-06T00:00:00.000Z",
        project: {
          id: "project_1",
          title: "HTTP 视频项目",
          durationSeconds: 5,
        },
        timeline: {
          durationMs: 5000,
          videoClips: [],
          audioTracks: [],
          subtitleTracks: [],
          transitions: [],
        },
      },
    });

    assert.equal(result.outputAbsolutePath, outputAbsolutePath);
    assert.equal(result.sizeBytes, 128);
    assert.equal((received.value?.provider as Record<string, unknown>).id, "local-video");
    assert.equal(
      ((received.value?.request as Record<string, unknown>).exportSettings as Record<string, unknown>).resolution,
      "1080x1920"
    );
  });
});

test("HTTP text providers post provider metadata and return structured contracts", async () => {
  const received: Array<{ url: string; body: Record<string, unknown> }> = [];

  await withMockFetch(async (input, init) => {
    const url = input.toString();
    received.push({
      url,
      body: JSON.parse(init?.body as string) as Record<string, unknown>,
    });

    if (url.endsWith("/script")) {
      return Response.json({
        characters: [{ name: "林夏", age: null, role: "主角", traits: ["果断"] }],
        scenes: [],
        relationships: [],
        plotBeats: [],
        dialogueBlocks: [],
        warnings: [],
      });
    }
    if (url.endsWith("/character")) {
      return Response.json({
        provider: "gateway-character",
        model: "text-v1",
        visualBrief: "角色视觉设定",
        consistencyChecklist: ["保持发型"],
      });
    }
    if (url.endsWith("/scene")) {
      return Response.json({
        provider: "gateway-scene",
        model: "text-v1",
        visualBrief: "场景视觉设定",
        continuityChecklist: ["保持天气"],
      });
    }
    return Response.json({
      provider: "gateway-storyboard",
      model: "text-v1",
      summary: "分镜规划",
      shots: [{
        id: "shot_1",
        sceneId: "scene_1",
        sceneNumber: 1,
        title: "开场",
        description: "角色入场",
        camera: "近景",
        characters: ["林夏"],
        beatSummary: "冲突铺垫",
        dialogueSummary: "一句对白",
        startMs: 0,
        durationMs: 3000,
      }],
    });
  }, async () => {
    const profile: RuntimeProviderProfile = {
      kind: "local-http",
      baseUrl: "http://127.0.0.1:3013",
      model: "text-v1",
      endpoints: {
        scriptParsing: "/script",
        characterDesign: "/character",
        sceneDesign: "/scene",
        storyboardPlanning: "/storyboard",
      },
    };

    const script = await createHttpScriptParserProvider("local-script", profile).parse({ content: "场景1：客厅 - 夜" }) as Record<string, unknown>;
    const character = await createHttpCharacterDesignerProvider("local-character", profile).designCharacter({} as never);
    const scene = await createHttpSceneDesignerProvider("local-scene", profile).designScene({} as never);
    const storyboard = await createHttpStoryboardPlannerProvider("local-storyboard", profile).planStoryboard({} as never);

    assert.equal((script.characters as Array<Record<string, unknown>>)[0].name, "林夏");
    assert.equal(character.visualBrief, "角色视觉设定");
    assert.equal(scene.visualBrief, "场景视觉设定");
    assert.equal(storyboard.shots[0].title, "开场");
    assert.deepEqual(received.map((entry) => entry.url), [
      "http://127.0.0.1:3013/script",
      "http://127.0.0.1:3013/character",
      "http://127.0.0.1:3013/scene",
      "http://127.0.0.1:3013/storyboard",
    ]);
    assert.equal((received[0].body.provider as Record<string, unknown>).id, "local-script");
    assert.equal((received[3].body.provider as Record<string, unknown>).model, "text-v1");
  });
});

test("runtime resolver can build configured script parser provider", async () => {
  const originalConfig = process.env.STORYFORGE_PROVIDER_CONFIG;
  const originalModule = process.env.STORYFORGE_PROVIDER_MODULE;
  const originalLiveModule = process.env.STORYFORGE_LIVE_PROVIDER_MODULE;
  try {
    delete process.env.STORYFORGE_PROVIDER_MODULE;
    delete process.env.STORYFORGE_LIVE_PROVIDER_MODULE;
    process.env.STORYFORGE_PROVIDER_CONFIG = JSON.stringify({
      version: 1,
      active: { scriptParsing: "local-script" },
      providers: {
        "local-script": {
          kind: "local-http",
          baseUrl: "http://127.0.0.1:3014",
          model: "text-v1",
          endpoints: { scriptParsing: "/script" },
        },
      },
    });
    resetRuntimeProviderCacheForTests();

    await withMockFetch(async (input, init) => {
      assert.equal(input.toString(), "http://127.0.0.1:3014/script");
      const body = JSON.parse(init?.body as string) as Record<string, unknown>;
      assert.equal((body.provider as Record<string, unknown>).id, "local-script");
      return Response.json({
        characters: [],
        scenes: [],
        relationships: [],
        plotBeats: [],
        dialogueBlocks: [],
        warnings: [],
      });
    }, async () => {
      const provider = await resolveScriptParserProvider();
      assert.equal(provider?.name, "local-http:local-script");
      const output = await provider?.parse({ content: "测试剧本" }) as Record<string, unknown>;
      assert.deepEqual(output.characters, []);
    });
  } finally {
    if (originalConfig === undefined) {
      delete process.env.STORYFORGE_PROVIDER_CONFIG;
    } else {
      process.env.STORYFORGE_PROVIDER_CONFIG = originalConfig;
    }
    if (originalModule === undefined) {
      delete process.env.STORYFORGE_PROVIDER_MODULE;
    } else {
      process.env.STORYFORGE_PROVIDER_MODULE = originalModule;
    }
    if (originalLiveModule === undefined) {
      delete process.env.STORYFORGE_LIVE_PROVIDER_MODULE;
    } else {
      process.env.STORYFORGE_LIVE_PROVIDER_MODULE = originalLiveModule;
    }
    resetRuntimeProviderCacheForTests();
  }
});

test("runtime provider config validates version and provider map", () => {
  const config = parseRuntimeProviderConfig(JSON.stringify({
    version: 1,
    active: { imageGeneration: "volcengine-image", scriptParsing: "script-provider" },
    providers: {
      "script-provider": {
        kind: "local-http",
        baseUrl: "https://example.invalid",
        endpoints: { scriptParsing: "/script" },
      },
      "volcengine-image": {
        kind: "volcengine",
        baseUrl: "https://example.invalid",
        endpoints: { imageGeneration: "/images" },
      },
    },
  }));

  assert.equal(config.active?.imageGeneration, "volcengine-image");
  assert.equal(config.active?.scriptParsing, "script-provider");
  assert.equal(config.providers["volcengine-image"].kind, "volcengine");
  assert.throws(() => parseRuntimeProviderConfig(JSON.stringify({ version: 2 })), /version: 1/);
});
