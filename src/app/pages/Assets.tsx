"use client";

import { File, Image, Music, Upload, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { AssetRecord } from "@/lib/types";
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

export default function Assets() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
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
      setUploadMessage(`已导入 ${data.asset.name}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "素材导入失败");
    } finally {
      setIsUploading(false);
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
                <div key={asset.id} className="border border-neutral-800 rounded-lg p-4 bg-neutral-950/50">
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
                </div>
              ))}
            </div>
          )}
          <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">返回工作台</Link>
        </div>
      </div>
    </div>
  );
}
