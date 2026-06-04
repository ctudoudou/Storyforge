"use client";

import { Film, RefreshCcw, Camera, Maximize, PlayCircle } from "lucide-react";
import type { DialogueBlockRecord, PlotBeatRecord, SceneRecord } from "@/lib/types";

function assetUrl(relativePath: string) {
  return `/api/assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

export default function Storyboard({
  scenes,
  plotBeats,
  dialogueBlocks,
  onNext,
}: {
  scenes: SceneRecord[];
  plotBeats: PlotBeatRecord[];
  dialogueBlocks: DialogueBlockRecord[];
  onNext: () => void;
}) {
  const beatLabel: Record<PlotBeatRecord["type"], string> = {
    setup: "铺垫",
    conflict: "冲突",
    reversal: "反转",
    decision: "决断",
  };

  const dialogueBlocksByScene = new Map<number, DialogueBlockRecord[]>();
  for (const dialogue of dialogueBlocks) {
    const blocks = dialogueBlocksByScene.get(dialogue.sceneNumber) ?? [];
    blocks.push(dialogue);
    dialogueBlocksByScene.set(dialogue.sceneNumber, blocks);
  }

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden bg-neutral-950">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-xl font-semibold text-neutral-100 mb-1">分镜画板</h2>
          <p className="text-sm text-neutral-400">系统已为您拆解场景并生成关键帧参考。您可以修改运镜和画面提示词。</p>
        </div>
        <button
           onClick={onNext}
           className="px-6 py-2 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
         >
           生成视频并进入时间线
         </button>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        <div className="flex flex-col space-y-4">
          {scenes.length > 0 && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-neutral-200">剧情节点</h3>
                <span className="text-xs text-neutral-500">{plotBeats.length} 个节点</span>
              </div>
              {plotBeats.length === 0 ? (
                <div className="text-sm text-neutral-500">暂无冲突或反转节点</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plotBeats.map((beat) => (
                    <div key={beat.id} className="border border-neutral-800 rounded-lg bg-neutral-950/50 px-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-neutral-500">S{String(beat.sceneNumber).padStart(2, "0")}</span>
                        <span className="text-xs text-neutral-300 border border-neutral-700 rounded px-2 py-0.5">
                          {beatLabel[beat.type]}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-300 line-clamp-2">{beat.summary || "暂无节点摘要"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {scenes.map((scene) => (
            <div key={scene.id} className="flex bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden group">
              {/* Image side */}
              <div className="w-[320px] relative flex-shrink-0 bg-neutral-800 border-r border-neutral-800">
                {scene.asset ? (
                  <img src={assetUrl(scene.asset.relativePath)} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full min-h-[180px] flex flex-col items-center justify-center text-neutral-500">
                    <Film className="w-8 h-8 mb-3" />
                    <span className="text-sm">未绑定本地场景图</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded transition-colors" title="重新生成">
                    <RefreshCcw className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white rounded transition-colors" title="放大预览">
                    <Maximize className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2">
                  <span className="px-2 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-mono rounded">
                     S{String(scene.sceneNumber).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Content side */}
              <div className="flex-1 p-5 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-neutral-200">{scene.location || "未命名场景"}</span>
                    <span className="text-xs text-neutral-500 border border-neutral-700 px-1.5 py-0.5 rounded">{scene.timeOfDay || "未指定"}</span>
                  </div>
                  <div className="flex -space-x-1">
                     {scene.characters.map((char, i) => (
                       <div key={`${char}-${i}`} className="w-6 h-6 rounded-full bg-neutral-700 border-2 border-neutral-900 flex items-center justify-center text-[10px] text-neutral-300 font-medium" title={char}>
                         {char[0]}
                       </div>
                     ))}
                  </div>
                </div>

                <div className="flex-1">
                  <p className="text-sm text-neutral-300 leading-relaxed mb-4 whitespace-pre-line">
                    {scene.description || "暂无场景描述"}
                  </p>
                  {(dialogueBlocksByScene.get(scene.sceneNumber) ?? []).length > 0 && (
                    <div className="border border-neutral-800 rounded-lg bg-neutral-950/50 p-3 mb-4">
                      <div className="text-xs text-neutral-500 mb-2">对白块</div>
                      <div className="space-y-1.5">
                        {(dialogueBlocksByScene.get(scene.sceneNumber) ?? []).map((dialogue) => (
                          <div key={dialogue.id} className="text-xs text-neutral-400">
                            <span className="text-neutral-200">{dialogue.speaker}</span>
                            <span className="text-neutral-600 mx-1">:</span>
                            <span>{dialogue.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center text-xs text-neutral-400 bg-neutral-950 px-3 py-1.5 rounded-md border border-neutral-800/50">
                    <Camera className="w-3.5 h-3.5 mr-2 text-neutral-500" />
                    {scene.camera || "待设置"}
                  </div>

                  <button className="flex items-center text-xs text-neutral-400 hover:text-neutral-200 transition-colors">
                     <PlayCircle className="w-4 h-4 mr-1" />
                     测试生成此段落
                  </button>
                </div>
              </div>
            </div>
          ))}

          {scenes.length === 0 && (
            <div className="w-full min-h-[240px] border border-neutral-800 rounded-xl text-neutral-500 flex flex-col items-center justify-center">
              <Film className="w-8 h-8 mb-3" />
              <span className="text-sm font-medium">本地数据库暂无场景记录</span>
              <p className="text-xs text-neutral-600 mt-2 text-center px-8">
                先完成剧本解析，场景、地点和时间信息会生成到这里。
              </p>
            </div>
          )}

          <button className="w-full py-4 border border-neutral-800 border-dashed rounded-xl text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900 hover:border-neutral-600 transition-colors flex flex-col items-center justify-center">
            <Film className="w-5 h-5 mb-2" />
            <span className="text-sm font-medium">添加新场景</span>
          </button>
        </div>
      </div>
    </div>
  );
}
