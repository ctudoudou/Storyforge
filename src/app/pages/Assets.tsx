"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AssetRecord } from "@/lib/types";
import { readErrorMessage } from "@/lib/client-errors";

export default function Assets() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-100 mb-6">预设资产</h1>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8 text-neutral-400">
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
                  <p className="text-sm text-neutral-200 truncate">{asset.name}</p>
                  <p className="text-xs text-neutral-500 mt-1">{asset.relativePath}</p>
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
