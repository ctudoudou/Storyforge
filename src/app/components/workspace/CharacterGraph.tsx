"use client";

import { User, RefreshCw, Settings2, Edit3 } from "lucide-react";
import type { CharacterRecord } from "@/lib/types";

function assetUrl(relativePath: string) {
  return `/api/assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export default function CharacterGraph({
  characters,
  onNext,
}: {
  characters: CharacterRecord[];
  onNext: () => void;
}) {
  return (
    <div className="h-full flex flex-col p-6 overflow-hidden bg-neutral-950">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100 mb-1">人物设定库</h2>
          <p className="text-sm text-neutral-400">基于剧本解析，已自动生成人物基础设定与参考形象。</p>
        </div>
        <button
           onClick={onNext}
           className="px-6 py-2 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
         >
           下一步：生成分镜
         </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {characters.map((char) => (
            <div key={char.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden group">
              <div className="aspect-square relative overflow-hidden bg-neutral-800">
                {char.asset ? (
                  <img src={assetUrl(char.asset.relativePath)} alt={char.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">
                    <User className="w-10 h-10 mb-3" />
                    <span className="text-sm">未绑定本地角色素材</span>
                  </div>
                )}
                <div className="absolute top-3 right-3 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded-md transition-colors" title="重新生成">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded-md transition-colors" title="调整参数">
                    <Settings2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-neutral-100">{char.name}</h3>
                  {char.age !== null && (
                    <span className="text-xs text-neutral-400 border border-neutral-700 px-2 py-0.5 rounded-full">
                      {char.age}岁
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-400 mb-4">{char.role || "未设置角色身份"}</p>

                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-neutral-500 mb-1.5 flex justify-between items-center">
                      <span>外貌特征与性格</span>
                      <button className="text-neutral-500 hover:text-neutral-300 transition-colors">
                         <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {char.traits.length === 0 ? (
                        <span className="text-xs bg-neutral-800 text-neutral-500 px-2 py-1 rounded">
                          暂无特征
                        </span>
                      ) : char.traits.map(trait => (
                        <span key={trait} className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 rounded">
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {characters.length === 0 && (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl flex flex-col items-center justify-center text-neutral-500 min-h-[400px]">
              <User className="w-8 h-8 mb-3" />
              <span className="font-medium">本地数据库暂无人物记录</span>
            </div>
          )}

          {/* Add Character Card */}
          <button className="bg-neutral-900/50 border border-neutral-800 border-dashed rounded-xl flex flex-col items-center justify-center text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 hover:bg-neutral-900 transition-all min-h-[400px]">
            <div className="w-12 h-12 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
              <User className="w-6 h-6" />
            </div>
            <span className="font-medium">手动添加人物</span>
          </button>
        </div>
      </div>
    </div>
  );
}

