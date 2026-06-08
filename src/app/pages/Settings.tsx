"use client";

import { useEffect, useMemo, useState } from "react";
import { Film, ImageIcon, RefreshCw, Save, Server } from "lucide-react";

import { readErrorMessage } from "@/lib/client-errors";
import type {
  RuntimeProviderConfig,
  RuntimeProviderEndpoint,
  RuntimeProviderKind,
  RuntimeProviderProfile,
} from "@/agents/provider-runtime";

type ProviderConfigSource = "environment" | "file" | "missing";

type ProviderConfigState = {
  config: RuntimeProviderConfig | null;
  configPath: string;
  source: ProviderConfigSource;
  environmentOverride: boolean;
};

type ProviderDraft = {
  enabled: boolean;
  id: string;
  kind: RuntimeProviderKind;
  baseUrl: string;
  model: string;
  endpointPath: string;
  authEnv: string;
};

const endpointLabels: Record<RuntimeProviderEndpoint, string> = {
  imageGeneration: "图片生成",
  videoAssembly: "视频组装",
};

const kindLabels: Record<RuntimeProviderKind, string> = {
  "local-http": "本地服务",
  volcengine: "火山网关",
  kling: "Kling 网关",
};

const endpointIcons = {
  imageGeneration: ImageIcon,
  videoAssembly: Film,
};

const presets: Record<RuntimeProviderKind, Record<RuntimeProviderEndpoint, ProviderDraft>> = {
  "local-http": {
    imageGeneration: {
      enabled: true,
      id: "local-image",
      kind: "local-http",
      baseUrl: "http://127.0.0.1:7860",
      model: "local-image-v1",
      endpointPath: "/v1/images/generate",
      authEnv: "LOCAL_IMAGE_API_KEY",
    },
    videoAssembly: {
      enabled: true,
      id: "local-video",
      kind: "local-http",
      baseUrl: "http://127.0.0.1:7861",
      model: "local-video",
      endpointPath: "/v1/video/assemble",
      authEnv: "LOCAL_VIDEO_API_KEY",
    },
  },
  volcengine: {
    imageGeneration: {
      enabled: true,
      id: "volcengine-image",
      kind: "volcengine",
      baseUrl: "http://127.0.0.1:8787",
      model: "doubao-image",
      endpointPath: "/storyforge/images",
      authEnv: "VOLCENGINE_GATEWAY_TOKEN",
    },
    videoAssembly: {
      enabled: true,
      id: "volcengine-video",
      kind: "volcengine",
      baseUrl: "http://127.0.0.1:8787",
      model: "volcengine-video",
      endpointPath: "/storyforge/video",
      authEnv: "VOLCENGINE_GATEWAY_TOKEN",
    },
  },
  kling: {
    imageGeneration: {
      enabled: true,
      id: "kling-image",
      kind: "kling",
      baseUrl: "http://127.0.0.1:8788",
      model: "kling-image",
      endpointPath: "/storyforge/images",
      authEnv: "KLING_GATEWAY_TOKEN",
    },
    videoAssembly: {
      enabled: true,
      id: "kling-video",
      kind: "kling",
      baseUrl: "http://127.0.0.1:8788",
      model: "kling-video",
      endpointPath: "/storyforge/video",
      authEnv: "KLING_GATEWAY_TOKEN",
    },
  },
};

const defaultDraft = presets["local-http"];

function authEnvFromProfile(profile?: RuntimeProviderProfile) {
  const authorization = profile?.headers?.Authorization;
  const match = authorization?.match(/^Bearer \$\{([A-Z0-9_]+)\}$/);
  return match?.[1] ?? "";
}

function draftFromConfig(config: RuntimeProviderConfig | null): Record<RuntimeProviderEndpoint, ProviderDraft> {
  if (!config) return defaultDraft;

  const readEndpoint = (endpoint: RuntimeProviderEndpoint) => {
    const profileId = config.active?.[endpoint]
      ?? Object.entries(config.providers).find(([, profile]) => Boolean(profile.endpoints[endpoint]))?.[0];
    const profile = profileId ? config.providers[profileId] : undefined;
    const fallback = defaultDraft[endpoint];

    return {
      enabled: Boolean(profile?.endpoints[endpoint]),
      id: profileId ?? fallback.id,
      kind: profile?.kind ?? fallback.kind,
      baseUrl: profile?.baseUrl ?? fallback.baseUrl,
      model: profile?.model ?? fallback.model,
      endpointPath: profile?.endpoints[endpoint] ?? fallback.endpointPath,
      authEnv: authEnvFromProfile(profile) || fallback.authEnv,
    };
  };

  return {
    imageGeneration: readEndpoint("imageGeneration"),
    videoAssembly: readEndpoint("videoAssembly"),
  };
}

function buildConfig(draft: Record<RuntimeProviderEndpoint, ProviderDraft>): RuntimeProviderConfig {
  const active: Partial<Record<RuntimeProviderEndpoint, string>> = {};
  const providers: Record<string, RuntimeProviderProfile> = {};

  for (const endpoint of Object.keys(endpointLabels) as RuntimeProviderEndpoint[]) {
    const value = draft[endpoint];
    if (!value.enabled) continue;

    const id = value.id.trim();
    const baseUrl = value.baseUrl.trim();
    const endpointPath = value.endpointPath.trim();
    const model = value.model.trim();
    const authEnv = value.authEnv.trim();

    if (!id) throw new Error(`${endpointLabels[endpoint]} Provider ID 不能为空`);
    if (!baseUrl) throw new Error(`${endpointLabels[endpoint]} Base URL 不能为空`);
    if (!endpointPath) throw new Error(`${endpointLabels[endpoint]} Endpoint 不能为空`);
    if (authEnv && !/^[A-Z][A-Z0-9_]*$/.test(authEnv)) {
      throw new Error(`${endpointLabels[endpoint]} 环境变量名格式不正确`);
    }

    active[endpoint] = id;
    const existing = providers[id];
    providers[id] = {
      kind: value.kind,
      baseUrl,
      model: model || undefined,
      headers: authEnv ? { Authorization: `Bearer \${${authEnv}}` } : existing?.headers,
      endpoints: {
        ...(existing?.endpoints ?? {}),
        [endpoint]: endpointPath,
      },
    };
  }

  return {
    version: 1,
    active,
    providers,
  };
}

export default function Settings() {
  const [draft, setDraft] = useState<Record<RuntimeProviderEndpoint, ProviderDraft>>(defaultDraft);
  const [configPath, setConfigPath] = useState("");
  const [source, setSource] = useState<ProviderConfigSource>("missing");
  const [environmentOverride, setEnvironmentOverride] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const enabledCount = useMemo(
    () => Object.values(draft).filter((providerDraft) => providerDraft.enabled).length,
    [draft]
  );

  const loadConfig = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/provider-config");
      if (!response.ok) throw new Error(await readErrorMessage(response, "Provider 配置读取失败"));
      const state = (await response.json()) as ProviderConfigState;
      setDraft(draftFromConfig(state.config));
      setConfigPath(state.configPath);
      setSource(state.source);
      setEnvironmentOverride(state.environmentOverride);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Provider 配置读取失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const updateDraft = (endpoint: RuntimeProviderEndpoint, patch: Partial<ProviderDraft>) => {
    setDraft((current) => ({
      ...current,
      [endpoint]: {
        ...current[endpoint],
        ...patch,
      },
    }));
    setSavedAt(null);
  };

  const applyPreset = (kind: RuntimeProviderKind) => {
    setDraft(presets[kind]);
    setSavedAt(null);
  };

  const saveConfig = async () => {
    setIsSaving(true);
    setError(null);
    setSavedAt(null);
    try {
      const config = buildConfig(draft);
      const response = await fetch("/api/provider-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!response.ok) throw new Error(await readErrorMessage(response, "Provider 配置保存失败"));
      const state = (await response.json()) as ProviderConfigState;
      setDraft(draftFromConfig(state.config));
      setConfigPath(state.configPath);
      setSource(state.source);
      setEnvironmentOverride(state.environmentOverride);
      setSavedAt(new Date().toLocaleTimeString("zh-CN", { hour12: false }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Provider 配置保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-[#0a0a0a] p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100">设置</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
              <span>Provider：{enabledCount} 个启用</span>
              <span>来源：{source === "file" ? "本地文件" : source === "environment" ? "环境变量" : "未配置"}</span>
              {configPath && <span className="max-w-full truncate">路径：{configPath}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadConfig()}
              disabled={isLoading || isSaving}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-neutral-300 transition-colors hover:border-neutral-700 hover:text-neutral-100 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              重新读取
            </button>
            <button
              type="button"
              onClick={() => void saveConfig()}
              disabled={isLoading || isSaving || environmentOverride}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-neutral-100 px-3 text-sm font-medium text-neutral-950 transition-colors hover:bg-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {isSaving ? "保存中" : "保存配置"}
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {(Object.keys(kindLabels) as RuntimeProviderKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => applyPreset(kind)}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-neutral-800 bg-neutral-900/50 px-3 text-xs text-neutral-300 transition-colors hover:border-neutral-700 hover:text-neutral-100"
            >
              <Server className="h-3.5 w-3.5" />
              {kindLabels[kind]}
            </button>
          ))}
        </div>

        {(error || savedAt || environmentOverride) && (
          <div className="mb-4 rounded-md border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs">
            {error && <span className="text-red-300">{error}</span>}
            {!error && savedAt && <span className="text-emerald-300">已保存：{savedAt}</span>}
            {!error && !savedAt && environmentOverride && (
              <span className="text-amber-300">当前由 STORYFORGE_PROVIDER_CONFIG 接管，文件配置不会生效。</span>
            )}
          </div>
        )}

        <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900/50">
          {(Object.keys(endpointLabels) as RuntimeProviderEndpoint[]).map((endpoint) => {
            const Icon = endpointIcons[endpoint];
            const value = draft[endpoint];
            return (
              <section key={endpoint} className="p-5">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-800 text-neutral-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-medium text-neutral-100">{endpointLabels[endpoint]}</h2>
                      <p className="text-xs text-neutral-500">{value.id || "未命名 Provider"}</p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-neutral-400">
                    <input
                      type="checkbox"
                      checked={value.enabled}
                      onChange={(event) => updateDraft(endpoint, { enabled: event.target.checked })}
                      className="h-4 w-4 rounded border-neutral-700 bg-neutral-950"
                    />
                    启用
                  </label>
                </div>

                <div className="grid gap-3 lg:grid-cols-6">
                  <label className="lg:col-span-1">
                    <span className="mb-1 block text-[11px] text-neutral-500">类型</span>
                    <select
                      value={value.kind}
                      onChange={(event) => updateDraft(endpoint, { kind: event.target.value as RuntimeProviderKind })}
                      className="h-9 w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 text-sm text-neutral-300 outline-none hover:border-neutral-700"
                    >
                      {(Object.keys(kindLabels) as RuntimeProviderKind[]).map((kind) => (
                        <option key={kind} value={kind}>
                          {kindLabels[kind]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="lg:col-span-1">
                    <span className="mb-1 block text-[11px] text-neutral-500">Provider ID</span>
                    <input
                      value={value.id}
                      onChange={(event) => updateDraft(endpoint, { id: event.target.value })}
                      className="h-9 w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 text-sm text-neutral-300 outline-none hover:border-neutral-700"
                    />
                  </label>
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-[11px] text-neutral-500">Base URL</span>
                    <input
                      value={value.baseUrl}
                      onChange={(event) => updateDraft(endpoint, { baseUrl: event.target.value })}
                      className="h-9 w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 text-sm text-neutral-300 outline-none hover:border-neutral-700"
                    />
                  </label>
                  <label className="lg:col-span-1">
                    <span className="mb-1 block text-[11px] text-neutral-500">Endpoint</span>
                    <input
                      value={value.endpointPath}
                      onChange={(event) => updateDraft(endpoint, { endpointPath: event.target.value })}
                      className="h-9 w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 text-sm text-neutral-300 outline-none hover:border-neutral-700"
                    />
                  </label>
                  <label className="lg:col-span-1">
                    <span className="mb-1 block text-[11px] text-neutral-500">Model</span>
                    <input
                      value={value.model}
                      onChange={(event) => updateDraft(endpoint, { model: event.target.value })}
                      className="h-9 w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 text-sm text-neutral-300 outline-none hover:border-neutral-700"
                    />
                  </label>
                  <label className="lg:col-span-2">
                    <span className="mb-1 block text-[11px] text-neutral-500">Token Env</span>
                    <input
                      value={value.authEnv}
                      onChange={(event) => updateDraft(endpoint, { authEnv: event.target.value.toUpperCase() })}
                      className="h-9 w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 text-sm text-neutral-300 outline-none hover:border-neutral-700"
                    />
                  </label>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
