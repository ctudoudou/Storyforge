import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  parseRuntimeProviderConfig,
  type RuntimeProviderConfig,
  type RuntimeProviderEndpoint,
  type RuntimeProviderKind,
  type RuntimeProviderProfile,
} from "../agents/provider-runtime.ts";

export type ProviderConfigSource = "environment" | "file" | "missing";

export type ProviderConfigState = {
  config: RuntimeProviderConfig | null;
  configPath: string;
  source: ProviderConfigSource;
  environmentOverride: boolean;
};

const providerKinds = new Set<RuntimeProviderKind>(["local-http", "volcengine", "kling"]);
const providerEndpoints = new Set<RuntimeProviderEndpoint>([
  "scriptParsing",
  "characterDesign",
  "sceneDesign",
  "storyboardPlanning",
  "imageGeneration",
  "videoAssembly",
]);

export function runtimeProviderConfigPath() {
  return resolve(process.env.STORYFORGE_PROVIDER_CONFIG_FILE?.trim() || ".storyforge/providers.json");
}

function assertProfile(profileId: string, profile: RuntimeProviderProfile) {
  if (!providerKinds.has(profile.kind)) {
    throw new Error(`unsupported provider kind: ${profileId}`);
  }
  if (!profile.baseUrl || typeof profile.baseUrl !== "string") {
    throw new Error(`provider baseUrl is required: ${profileId}`);
  }
  try {
    new URL(profile.baseUrl);
  } catch {
    throw new Error(`provider baseUrl must be a valid URL: ${profileId}`);
  }
  if (!profile.endpoints || typeof profile.endpoints !== "object" || Array.isArray(profile.endpoints)) {
    throw new Error(`provider endpoints are required: ${profileId}`);
  }
  for (const [endpoint, path] of Object.entries(profile.endpoints)) {
    if (!providerEndpoints.has(endpoint as RuntimeProviderEndpoint)) {
      throw new Error(`unsupported provider endpoint: ${endpoint}`);
    }
    if (typeof path !== "string" || !path.trim()) {
      throw new Error(`provider endpoint path is required: ${profileId}.${endpoint}`);
    }
  }
  if (profile.model !== undefined && typeof profile.model !== "string") {
    throw new Error(`provider model must be a string: ${profileId}`);
  }
  if (profile.headers !== undefined) {
    if (typeof profile.headers !== "object" || Array.isArray(profile.headers)) {
      throw new Error(`provider headers must be an object: ${profileId}`);
    }
    for (const [key, value] of Object.entries(profile.headers)) {
      if (!key.trim() || typeof value !== "string") {
        throw new Error(`provider headers must use string keys and values: ${profileId}`);
      }
    }
  }
}

export function validateRuntimeProviderConfig(config: RuntimeProviderConfig) {
  const parsed = parseRuntimeProviderConfig(JSON.stringify(config));
  for (const [profileId, profile] of Object.entries(parsed.providers)) {
    assertProfile(profileId, profile);
  }
  for (const [endpoint, profileId] of Object.entries(parsed.active ?? {})) {
    if (!providerEndpoints.has(endpoint as RuntimeProviderEndpoint)) {
      throw new Error(`unsupported active endpoint: ${endpoint}`);
    }
    if (profileId && !parsed.providers[profileId]?.endpoints[endpoint as RuntimeProviderEndpoint]) {
      throw new Error(`active provider is missing endpoint: ${endpoint}`);
    }
  }
  return parsed;
}

export function readRuntimeProviderConfigState(): ProviderConfigState {
  const configPath = runtimeProviderConfigPath();
  if (process.env.STORYFORGE_PROVIDER_CONFIG?.trim()) {
    return {
      config: validateRuntimeProviderConfig(parseRuntimeProviderConfig(process.env.STORYFORGE_PROVIDER_CONFIG)),
      configPath,
      source: "environment",
      environmentOverride: true,
    };
  }

  if (!existsSync(configPath)) {
    return {
      config: null,
      configPath,
      source: "missing",
      environmentOverride: false,
    };
  }

  return {
    config: validateRuntimeProviderConfig(parseRuntimeProviderConfig(readFileSync(configPath, "utf8"))),
    configPath,
    source: "file",
    environmentOverride: false,
  };
}

export function saveRuntimeProviderConfig(config: RuntimeProviderConfig): ProviderConfigState {
  if (process.env.STORYFORGE_PROVIDER_CONFIG?.trim()) {
    throw new Error("STORYFORGE_PROVIDER_CONFIG is active; file settings would not be used.");
  }

  const validated = validateRuntimeProviderConfig(config);
  const configPath = runtimeProviderConfigPath();
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(configPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");

  return {
    config: validated,
    configPath,
    source: "file",
    environmentOverride: false,
  };
}
