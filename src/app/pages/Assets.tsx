"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AssetRecord } from "@/lib/types";

export default function Assets() {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/assets")
      .then((response) => response.json())
      .then((data: { assets: AssetRecord[] }) => setAssets(data.assets))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-100 mb-6">预设资产</h1>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8 text-neutral-400">
          {isLoading ? (
            <p className="text-center">正在读取本地素材目录...</p>
          ) : assets.length === 0 ? (
            <p className="text-center">本地素材目录暂无已登记素材。素材目录：data/assets/</p>
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

