# Storyforge Provider Configuration

Storyforge keeps provider integration local-first and git-ignored. Runtime code can keep using deterministic fake/local providers, or switch selected agents to configured providers without changing product code.

## Supported Runtime Paths

- `STORYFORGE_PROVIDER_MODULE`: local TypeScript module exporting concrete providers.
- `STORYFORGE_PROVIDER_CONFIG`: JSON string with HTTP provider profiles.
- `STORYFORGE_PROVIDER_CONFIG_FILE`: path to a local JSON config file.
- Default config path: `.storyforge/providers.json`.

`.storyforge/`, `.storyforge-live/`, and `.env*.local` are ignored by Git. Do not commit API keys, provider responses, request logs, or generated credentials.

## Quick Settings UI

The app Settings page at `/settings` can read and write the local provider config file. It supports quick presets for local HTTP services, Volcengine gateway profiles, and Kling gateway profiles.

The UI stores token references as environment variable names, for example `Authorization: Bearer ${LOCAL_IMAGE_API_KEY}`. It does not write real provider secrets.

If `STORYFORGE_PROVIDER_CONFIG` is set, that environment value takes precedence over the file and the Settings page reports the override instead of silently writing an unused file.

## Provider Module

Use a local module when a vendor needs custom signing, polling, or SDK logic:

```ts
export const runtimeProviders = {
  imageGenerationProvider,
  videoAssemblyProvider,
};
```

The same module can also export `liveProviders` for `npm run test:live`.

## HTTP Provider Profiles

HTTP profiles are useful for local API services, internal gateways, or vendor-specific proxy services. They currently support:

- `imageGeneration`
- `videoAssembly`

Example `.storyforge/providers.json`:

```json
{
  "version": 1,
  "active": {
    "imageGeneration": "local-image",
    "videoAssembly": "local-video"
  },
  "providers": {
    "local-image": {
      "kind": "local-http",
      "baseUrl": "http://127.0.0.1:7860",
      "model": "local-image-v1",
      "headers": {
        "Authorization": "Bearer ${LOCAL_IMAGE_API_KEY}"
      },
      "endpoints": {
        "imageGeneration": "/v1/images/generate"
      }
    },
    "local-video": {
      "kind": "local-http",
      "baseUrl": "http://127.0.0.1:7861",
      "endpoints": {
        "videoAssembly": "/v1/video/assemble"
      }
    }
  }
}
```

## Vendor Profiles

`kind` can be `local-http`, `volcengine`, or `kling`. The first runtime adapter treats all three as HTTP profiles. For Volcengine and Kling, prefer an internal proxy module/service when the provider requires request signing, upload sessions, polling, callbacks, or vendor-specific output normalization.

Example gateway profile:

```json
{
  "version": 1,
  "active": {
    "imageGeneration": "volcengine-image"
  },
  "providers": {
    "volcengine-image": {
      "kind": "volcengine",
      "baseUrl": "http://127.0.0.1:8787",
      "model": "doubao-image",
      "headers": {
        "Authorization": "Bearer ${VOLCENGINE_GATEWAY_TOKEN}"
      },
      "endpoints": {
        "imageGeneration": "/storyforge/images"
      }
    }
  }
}
```

The gateway receives Storyforge's provider-neutral request and returns the provider-neutral response. This keeps vendor churn out of the product UI and SQLite workflow.

## HTTP Image Contract

Storyforge sends:

```json
{
  "provider": {
    "id": "local-image",
    "kind": "local-http",
    "model": "local-image-v1"
  },
  "request": {
    "target": "character",
    "projectId": "project_x",
    "name": "角色图",
    "prompt": "..."
  }
}
```

Return JSON:

```json
{
  "dataBase64": "...",
  "mimeType": "image/png",
  "extension": ".png",
  "seed": 1,
  "metadata": {
    "providerJobId": "..."
  }
}
```

The image endpoint may also return raw `image/png`, `image/jpeg`, `image/webp`, or `image/svg+xml` bytes.

## HTTP Video Contract

Storyforge sends:

```json
{
  "provider": {
    "id": "local-video",
    "kind": "local-http",
    "model": "local-video"
  },
  "request": {
    "exportId": "video_export_x",
    "exportSettings": {},
    "manifest": {},
    "outputDir": "/absolute/path/to/data/exports"
  }
}
```

Return JSON:

```json
{
  "outputRelativePath": "project_x/video_export_x.mp4",
  "outputAbsolutePath": "/absolute/path/to/data/exports/project_x/video_export_x.mp4",
  "sizeBytes": 123456,
  "mimeType": "video/mp4"
}
```

## Current Scope

Runtime configuration is wired into image generation and video assembly/export. Script parsing, character design, scene design, and storyboard planning still support provider contracts and live provider tests, but their product runtime path remains deterministic until the async parser/designer runtime is refactored.
