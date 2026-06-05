import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createHttpImageGenerationProvider,
  createHttpVideoAssemblyProvider,
  parseRuntimeProviderConfig,
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

test("runtime provider config validates version and provider map", () => {
  const config = parseRuntimeProviderConfig(JSON.stringify({
    version: 1,
    active: { imageGeneration: "volcengine-image" },
    providers: {
      "volcengine-image": {
        kind: "volcengine",
        baseUrl: "https://example.invalid",
        endpoints: { imageGeneration: "/images" },
      },
    },
  }));

  assert.equal(config.active?.imageGeneration, "volcengine-image");
  assert.equal(config.providers["volcengine-image"].kind, "volcengine");
  assert.throws(() => parseRuntimeProviderConfig(JSON.stringify({ version: 2 })), /version: 1/);
});
