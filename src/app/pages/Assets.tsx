"use client";

import { AlertTriangle, CheckCircle2, ExternalLink, File, Image, Music, Trash2, Upload, Video, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { AssetDetail, AssetRecord, AssetReferenceRecord } from "@/lib/types";
import { readErrorMessage } from "@/lib/client-errors";

const acceptedAssetTypes = "image/jpeg,image/png,image/webp,image/gif,audio/mpeg,audio/wav,video/mp4,video/webm";

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function AssetIcon({ type }: { type: AssetRecord["type"] }) {
  if (type === "image") return <Image className="w-4 h-4 text-neutral-500" />;
  if (type === "audio") return <Music className="w-4 h-4 text-neutral-500" />;
  if (type === "video") return <Video className="w-4 h-4 text-neutral-500" />;
  return <File className="w-4 h-4 text-neutral-500" />;
}

function assetUrl(relativePath: string) {
  return `/api/assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

const referenceLabels: Record<AssetReferenceRecord["targetType"], string> = {
  character: "人物",
  scene: "场景",
  timelineClip: "时间线",
};

const versionSourceLabels: Record<AssetDetail["versions"][number]["source"], string> = {
  import: "导入",
  regeneration: "再生成",
  manual: "手动",
};

function AssetPreview({ detail }: { detail: AssetDetail }) {
  if (!detail.fileExists) {
    return (
      <div className="h-64 border border-red-500/30 bg-red-950/20 rounded-lg flex flex-col items-center justify-center text-red-200">
        <AlertTriangle className="w-8 h-8 mb-3" />
        <span className="text-sm font-medium">本地文件缺失</span>
        <span className="text-xs text-red-200/70 mt-2">{detail.asset.relativePath}</span>
      </div>
    );
  }

  if (detail.asset.type === "image") {
    return (
      <div className="h-64 bg-black rounded-lg border border-neutral-800 overflow-hidden flex items-center justify-center">
        <img src={detail.assetUrl} alt={detail.asset.name} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  if (detail.asset.type === "video") {
    return (
      <div className="h-64 bg-black rounded-lg border border-neutral-800 overflow-hidden flex items-center justify-center">
        <video src={detail.assetUrl} controls className="max-h-full max-w-full" />
      </div>
    );
  }

  if (detail.asset.type === "audio") {
    return (
      <div className="h-40 bg-neutral-950 rounded-lg border border-neutral-800 flex flex-col items-center justify-center px-6">
        <Music className="w-8 h-8 text-neutral-500 mb-4" />
        <audio src={detail.assetUrl} controls className="w-full" />
      </div>
    );
  }

  return (
    <div className="h-40 bg-neutral-950 rounded-lg border border-neutral-800 flex flex-col items-center justify-center text-neutral-500">
      <File className="w-8 h-8 mb-3" />
      <span className="text-sm">暂不支持预览此素材类型</span>
    </div>
  );
}

function AssetThumbnail({ asset }: { asset: AssetRecord }) {
  if (asset.thumbnailPath) {
    return (
      <div className="aspect-video bg-black rounded-md border border-neutral-800 overflow-hidden mb-3">
        <img src={assetUrl(asset.thumbnailPath)} alt={`${asset.name} 缩略图`} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="aspect-video bg-neutral-900 rounded-md border border-neutral-800 mb-3 flex flex-col items-center justify-center text-neutral-600">
      <AssetIcon type={asset.type} />
      <span className="text-xs mt-2">暂无缩略图</span>
    </div>
  );
}

export default function Assets() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [assetDetail, setAssetDetail] = useState<AssetDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activatingVersionId, setActivatingVersionId] = useState<string | null>(null);
  const [isDeletingAsset, setIsDeletingAsset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/assets")
      .then(async (response) => {
        if (!response.ok) throw new Error(await readErrorMessage(response, "素材列表读取失败"));
        return response.json();
      })
      .then((data: { assets: AssetRecord[] }) => setAssets(data.assets))
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "素材列表读取失败"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedAssetId) {
      setAssetDetail(null);
      setDetailError(null);
      return;
    }

    let cancelled = false;
    setIsDetailLoading(true);
    setDetailError(null);
    fetch(`/api/assets/${selectedAssetId}/detail`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await readErrorMessage(response, "素材详情读取失败"));
        return response.json();
      })
      .then((data: { detail: AssetDetail }) => {
        if (!cancelled) setAssetDetail(data.detail);
      })
      .catch((detailLoadError) => {
        if (!cancelled) setDetailError(detailLoadError instanceof Error ? detailLoadError.message : "素材详情读取失败");
      })
      .finally(() => {
        if (!cancelled) setIsDetailLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAssetId]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/assets", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "素材导入失败"));
      }
      const data = (await response.json()) as { asset: AssetRecord };
      setAssets((current) => [data.asset, ...current.filter((asset) => asset.id !== data.asset.id)]);
      setSelectedAssetId(data.asset.id);
      setUploadMessage(`已导入 ${data.asset.name}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "素材导入失败");
    } finally {
      setIsUploading(false);
    }
  };

  const activateVersion = async (versionId: string) => {
    if (!assetDetail) return;

    setActivatingVersionId(versionId);
    setDetailError(null);
    try {
      const response = await fetch(`/api/assets/${assetDetail.asset.id}/versions/${versionId}`, {
        method: "PATCH",
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "版本切换失败"));
      }
      const data = (await response.json()) as { detail: AssetDetail };
      setAssetDetail(data.detail);
      setAssets((current) => current.map((asset) => asset.id === data.detail.asset.id ? data.detail.asset : asset));
    } catch (activateError) {
      setDetailError(activateError instanceof Error ? activateError.message : "版本切换失败");
    } finally {
      setActivatingVersionId(null);
    }
  };

  const deleteSelectedAsset = async () => {
    if (!assetDetail) return;

    setIsDeletingAsset(true);
    setDetailError(null);
    try {
      const response = await fetch(`/api/assets/${assetDetail.asset.id}/detail`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "素材删除失败"));
      }
      setAssets((current) => current.filter((asset) => asset.id !== assetDetail.asset.id));
      setSelectedAssetId(null);
      setUploadMessage(`已删除 ${assetDetail.asset.name}`);
    } catch (deleteError) {
      setDetailError(deleteError instanceof Error ? deleteError.message : "素材删除失败");
    } finally {
      setIsDeletingAsset(false);
    }
  };

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-neutral-100">预设资产</h1>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept={acceptedAssetTypes}
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center px-4 py-2 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? "导入中..." : "导入本地素材"}
            </button>
          </div>
        </div>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8 text-neutral-400">
          {uploadMessage && <p className="text-sm text-emerald-400 mb-4">{uploadMessage}</p>}
          {isLoading ? (
            <p className="text-center">正在读取本地素材目录...</p>
          ) : error ? (
            <p className="text-center text-red-400">{error}</p>
          ) : assets.length === 0 ? (
            <div className="text-center">
              <p>本地素材目录暂无已登记素材。</p>
              <p className="text-xs text-neutral-500 mt-2">后续导入或生成的图片、音频、视频会登记在 SQLite，并存放到 data/assets/。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedAssetId(asset.id)}
                  className="text-left border border-neutral-800 rounded-lg p-4 bg-neutral-950/50 hover:border-neutral-700 hover:bg-neutral-950 transition-colors"
                >
                  <AssetThumbnail asset={asset} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-200 truncate">{asset.name}</p>
                      <p className="text-xs text-neutral-500 mt-1">{asset.relativePath}</p>
                    </div>
                    <AssetIcon type={asset.type} />
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-neutral-500">
                    <span>{asset.mimeType ?? asset.type}</span>
                    <span>{formatBytes(asset.sizeBytes)}</span>
                  </div>
                  <div className="text-xs text-neutral-600 mt-2">
                    缩略图：{asset.thumbnailStatus === "fallback" ? "fallback" : asset.thumbnailStatus}
                  </div>
                  <div className="text-xs text-neutral-400 mt-3">查看详情</div>
                </button>
              ))}
            </div>
          )}
          <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">返回工作台</Link>
        </div>
      </div>

      {selectedAssetId && (
        <div className="fixed inset-0 z-50 flex bg-black/50">
          <button
            type="button"
            aria-label="关闭素材详情"
            className="flex-1 cursor-default"
            onClick={() => setSelectedAssetId(null)}
          />
          <aside className="w-full max-w-xl h-full bg-neutral-950 border-l border-neutral-800 shadow-2xl overflow-auto custom-scrollbar">
            <div className="sticky top-0 z-10 bg-neutral-950/95 border-b border-neutral-800 px-5 py-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 mb-1">素材详情</p>
                <h2 className="text-lg font-semibold text-neutral-100 truncate">
                  {assetDetail?.asset.name ?? "读取素材中..."}
                </h2>
              </div>
              <div className="flex items-center gap-1">
                {assetDetail && (
                  <button
                    type="button"
                    onClick={() => void deleteSelectedAsset()}
                    disabled={isDeletingAsset || assetDetail.references.length > 0}
                    className="p-2 text-neutral-500 hover:text-red-300 hover:bg-red-950/30 rounded-md transition-colors disabled:opacity-40 disabled:hover:text-neutral-500 disabled:hover:bg-transparent"
                    title={assetDetail.references.length > 0 ? "素材仍被项目引用，不能删除" : "删除素材"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedAssetId(null)}
                  className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900 rounded-md transition-colors"
                  title="关闭"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {isDetailLoading ? (
                <div className="h-64 border border-neutral-800 rounded-lg flex items-center justify-center text-sm text-neutral-500">
                  正在读取素材详情...
                </div>
              ) : detailError ? (
                <div className="h-64 border border-red-500/30 bg-red-950/20 rounded-lg flex items-center justify-center text-sm text-red-200">
                  {detailError}
                </div>
              ) : assetDetail ? (
                <>
                  <AssetPreview detail={assetDetail} />
                  {assetDetail.thumbnailUrl && (
                    <div>
                      <p className="text-xs text-neutral-500 mb-2">缩略图</p>
                      <div className="aspect-video bg-black border border-neutral-800 rounded-lg overflow-hidden">
                        <img src={assetDetail.thumbnailUrl} alt={`${assetDetail.asset.name} 缩略图`} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="border border-neutral-800 rounded-lg bg-neutral-900/40 p-3">
                      <p className="text-neutral-500 mb-1">类型</p>
                      <p className="text-neutral-200">{assetDetail.asset.mimeType ?? assetDetail.asset.type}</p>
                    </div>
                    <div className="border border-neutral-800 rounded-lg bg-neutral-900/40 p-3">
                      <p className="text-neutral-500 mb-1">大小</p>
                      <p className="text-neutral-200">{formatBytes(assetDetail.asset.sizeBytes)}</p>
                    </div>
                    <div className="col-span-2 border border-neutral-800 rounded-lg bg-neutral-900/40 p-3">
                      <p className="text-neutral-500 mb-1">缩略图状态</p>
                      <p className="text-neutral-200">{assetDetail.asset.thumbnailStatus}</p>
                      {assetDetail.asset.thumbnailError && (
                        <p className="text-red-300 mt-1">{assetDetail.asset.thumbnailError}</p>
                      )}
                    </div>
                    <div className="col-span-2 border border-neutral-800 rounded-lg bg-neutral-900/40 p-3">
                      <p className="text-neutral-500 mb-1">本地路径</p>
                      <p className="text-neutral-200 break-all">{assetDetail.asset.relativePath}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-neutral-200">版本历史</h3>
                      <span className="text-xs text-neutral-500">{assetDetail.versions.length} 个版本</span>
                    </div>
                    {assetDetail.versions.length === 0 ? (
                      <div className="border border-neutral-800 rounded-lg bg-neutral-900/40 px-3 py-4 text-sm text-neutral-500">
                        暂无版本记录
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {assetDetail.versions.map((version) => (
                          <div
                            key={version.id}
                            className="border border-neutral-800 rounded-lg bg-neutral-900/40 px-3 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-neutral-200">V{version.versionNumber}</span>
                                  <span className="text-xs text-neutral-500">{versionSourceLabels[version.source]}</span>
                                  {version.isActive && (
                                    <span className="inline-flex items-center text-xs text-emerald-300">
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      当前版本
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-neutral-500 mt-1 truncate">{version.name}</div>
                                <div className="text-xs text-neutral-600 mt-1 break-all">{version.relativePath}</div>
                                {(version.provider || version.model || version.prompt) && (
                                  <div className="mt-2 text-xs text-neutral-500 space-y-1">
                                    {version.provider && <div>Provider: {version.provider}</div>}
                                    {version.model && <div>Model: {version.model}</div>}
                                    {version.prompt && <div className="line-clamp-2">Prompt: {version.prompt}</div>}
                                  </div>
                                )}
                              </div>
                              {!version.isActive && (
                                <button
                                  type="button"
                                  onClick={() => void activateVersion(version.id)}
                                  disabled={activatingVersionId === version.id}
                                  className="flex-shrink-0 px-2 py-1 text-xs text-neutral-300 border border-neutral-700 rounded-md hover:bg-neutral-800 transition-colors disabled:opacity-50"
                                >
                                  {activatingVersionId === version.id ? "切换中" : "设为当前"}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-neutral-200">项目引用</h3>
                      <span className="text-xs text-neutral-500">{assetDetail.references.length} 处</span>
                    </div>
                    {assetDetail.references.length === 0 ? (
                      <div className="border border-neutral-800 rounded-lg bg-neutral-900/40 px-3 py-4 text-sm text-neutral-500">
                        暂无项目引用
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {assetDetail.references.map((reference) => (
                          <div
                            key={`${reference.targetType}-${reference.targetId}`}
                            className="border border-neutral-800 rounded-lg bg-neutral-900/40 px-3 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm text-neutral-200 truncate">{reference.targetLabel}</div>
                                <div className="text-xs text-neutral-500 mt-1">
                                  {reference.projectTitle} / {referenceLabels[reference.targetType]}
                                </div>
                              </div>
                              <Link
                                href={`/project/${reference.projectId}`}
                                className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors"
                                title="打开项目"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border border-neutral-800 rounded-lg bg-neutral-900/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-neutral-200">删除保护</h3>
                        <p className="text-xs text-neutral-500 mt-1">
                          {assetDetail.references.length > 0
                            ? "该素材仍被项目记录引用，解除绑定后才能删除。"
                            : "删除会移除该素材记录，并清理当前文件和版本文件。"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void deleteSelectedAsset()}
                        disabled={isDeletingAsset || assetDetail.references.length > 0}
                        className="flex-shrink-0 inline-flex items-center px-3 py-2 text-xs text-red-200 border border-red-500/30 rounded-md hover:bg-red-950/40 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        {isDeletingAsset ? "删除中" : "删除素材"}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
