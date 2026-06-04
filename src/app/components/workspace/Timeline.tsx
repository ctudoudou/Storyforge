"use client";

import { useState } from "react";
import { Play, Pause, SkipBack, SkipForward, Scissors, Copy, Trash2, ZoomIn, ZoomOut, Film } from "lucide-react";
import AssetLinkControl from "./AssetLinkControl";
import type { AssetRecord, SceneRecord, TimelineClipRecord } from "@/lib/types";

function assetUrl(relativePath: string) {
  return `/api/assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function formatTimecode(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `00:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:00`;
}

function clipStyle(clip: TimelineClipRecord, totalDuration: number) {
  const width = totalDuration > 0 ? Math.max((clip.durationMs / totalDuration) * 100, 8) : 8;
  const left = totalDuration > 0 ? (clip.startMs / totalDuration) * 100 : 0;
  return { width: `${width}%`, left: `${left}%` };
}

export default function Timeline({
  assets,
  scenes,
  clips,
  onAssetLink,
}: {
  assets: AssetRecord[];
  scenes: SceneRecord[];
  clips: TimelineClipRecord[];
  onAssetLink: (targetId: string, assetId: string | null) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const videoClips = clips.filter((clip) => clip.trackType === "video");
  const audioClips = clips.filter((clip) => clip.trackType === "audio");
  const selectedClip = clips.find((clip) => clip.id === selectedClipId) ?? videoClips[0] ?? audioClips[0] ?? null;
  const selectedScene = scenes[0] ?? null;
  const previewAsset = selectedClip?.asset ?? selectedScene?.asset ?? null;
  const isTimelineEmpty = clips.length === 0 && scenes.length === 0;
  const totalDuration = Math.max(...clips.map((clip) => clip.startMs + clip.durationMs), 0);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Player Area */}
      <div className="flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden border-b border-neutral-800">
        <div className="flex-1 bg-black rounded-xl border border-neutral-800 flex items-center justify-center relative overflow-hidden group">
          {previewAsset?.type === "image" ? (
            <img
              src={assetUrl(previewAsset.relativePath)}
              alt="Preview"
              className="h-full object-contain opacity-80"
            />
          ) : previewAsset?.type === "video" ? (
            <video
              src={assetUrl(previewAsset.relativePath)}
              className="h-full max-w-full object-contain opacity-80"
              controls
              muted
            />
          ) : previewAsset?.type === "audio" ? (
            <div className="flex flex-col items-center justify-center text-neutral-400">
              <Film className="w-10 h-10 mb-3" />
              <span className="text-sm mb-4">{previewAsset.name}</span>
              <audio src={assetUrl(previewAsset.relativePath)} controls />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-neutral-600">
              <Film className="w-10 h-10 mb-3" />
              <span className="text-sm">{isTimelineEmpty ? "暂无时间线片段" : "暂无本地预览素材"}</span>
              {isTimelineEmpty && (
                <p className="text-xs text-neutral-700 mt-2 text-center max-w-xs">
                  先完成剧本解析和分镜生成，系统会把可剪辑片段写入时间线。
                </p>
              )}
            </div>
          )}

          {selectedScene && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 transition-opacity">
               <div className="text-center mb-4">
                  <p className="text-lg font-medium text-white shadow-sm drop-shadow-md">
                    {selectedScene.description.split("\n")[0] || selectedScene.location}
                  </p>
               </div>
            </div>
          )}
        </div>

        {/* Properties Panel (right sidebar) */}
        <div className="w-80 bg-neutral-900/50 rounded-xl border border-neutral-800 p-4 hidden lg:flex flex-col overflow-auto custom-scrollbar">
          <h3 className="text-sm font-semibold text-neutral-200 mb-4">片段属性</h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-neutral-500 mb-1.5 block">本地片段</label>
              <div className="w-full bg-neutral-950 border border-neutral-800 text-sm text-neutral-300 rounded-md px-3 py-2">
                {selectedClip?.label ?? "暂无时间线片段"}
              </div>
            </div>

            {selectedClip && (
              <AssetLinkControl
                assets={assets}
                value={selectedClip.asset?.id ?? null}
                allowedTypes={selectedClip.trackType === "audio" ? ["audio"] : ["video", "image"]}
                onChange={(assetId) => onAssetLink(selectedClip.id, assetId)}
                label={selectedClip.trackType === "audio" ? "配音素材" : "画面素材"}
              />
            )}

            <div>
              <label className="text-xs text-neutral-500 mb-1.5 block">参与人物</label>
              <div className="flex gap-2 flex-wrap">
                {(selectedScene?.characters ?? []).length === 0 ? (
                  <span className="px-3 py-1 text-xs rounded-full border border-neutral-800 text-neutral-500">暂无</span>
                ) : selectedScene?.characters.map((character) => (
                  <span key={character} className="px-3 py-1 text-xs rounded-full border bg-neutral-800 border-neutral-600 text-neutral-200">
                    {character}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-800">
              <label className="text-xs text-neutral-500 mb-1.5 block">画面特效</label>
              <button className="w-full py-2 bg-neutral-800/50 text-neutral-300 text-sm rounded-md border border-neutral-700/50 hover:bg-neutral-800 transition-colors">
                添加转场 / 滤镜
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="h-12 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <button className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-neutral-800"><SkipBack className="w-4 h-4" /></button>
          <button
            className="p-1.5 bg-neutral-100 text-neutral-900 rounded-md hover:bg-white"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-neutral-800"><SkipForward className="w-4 h-4" /></button>

          <div className="text-xs font-mono text-neutral-400 ml-4">
            {formatTimecode(0)} / {formatTimecode(totalDuration)}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 border-r border-neutral-800 pr-4">
            <button className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-neutral-800" title="剪切"><Scissors className="w-4 h-4" /></button>
            <button className="p-1.5 text-neutral-400 hover:text-neutral-200 rounded-md hover:bg-neutral-800" title="复制"><Copy className="w-4 h-4" /></button>
            <button className="p-1.5 text-neutral-400 hover:text-red-400 rounded-md hover:bg-neutral-800" title="删除"><Trash2 className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-1 text-neutral-500 hover:text-neutral-300"><ZoomOut className="w-4 h-4" /></button>
            <div className="w-24 h-1 bg-neutral-800 rounded-full overflow-hidden">
               <div className="w-1/3 h-full bg-neutral-500"></div>
            </div>
            <button className="p-1 text-neutral-500 hover:text-neutral-300"><ZoomIn className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* Timeline Tracks */}
      <div className="h-48 bg-neutral-950 overflow-x-auto overflow-y-hidden custom-scrollbar relative flex flex-col">
        {/* Time ruler */}
        <div className="h-6 border-b border-neutral-800 flex items-end px-2 text-[10px] text-neutral-600 font-mono select-none sticky top-0 bg-neutral-950 z-10">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex-1 border-l border-neutral-800/50 pl-1 h-2/3 flex items-start">
              00:0{i}
            </div>
          ))}
        </div>

        {/* Playhead */}
        <div className="absolute top-0 bottom-0 left-[25%] w-px bg-red-500 z-20 pointer-events-none">
          <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-transparent border-t-red-500 absolute -top-0 -left-[4.5px]"></div>
        </div>

        <div className="flex-1 p-2 space-y-2 relative w-[200%]">
          {/* Video Track */}
          <div className="flex h-16 bg-neutral-900/30 rounded border border-neutral-800/50 relative">
            <div className="absolute left-2 top-0 bottom-0 flex items-center text-xs font-medium text-neutral-600 select-none w-16">
              视频轨
            </div>
            <div className="ml-20 flex w-full relative h-full py-1">
               {videoClips.length === 0 ? (
                 <div className="h-full flex items-center text-xs text-neutral-600">暂无本地视频片段</div>
               ) : videoClips.map((clip) => (
                 <div
                   key={clip.id}
                   className="h-full border rounded-md px-2 py-1 absolute overflow-hidden bg-blue-900/40 border-blue-500/50 cursor-pointer hover:brightness-110 transition-all"
                   style={clipStyle(clip, totalDuration)}
                   onClick={() => setSelectedClipId(clip.id)}
                 >
                   <span className="text-[10px] font-medium text-white/80 whitespace-nowrap">{clip.label}</span>
                   {clip.asset && (
                     <span className="absolute top-1 right-1 max-w-[45%] truncate text-[10px] text-blue-100/80">
                       {clip.asset.name}
                     </span>
                   )}
                   <div className="absolute bottom-1 left-1 right-1 h-6 flex gap-1 opacity-50">
                     {[...Array(5)].map((_, j) => (
                       <div key={j} className="flex-1 bg-black/40 rounded-sm border border-white/10"></div>
                     ))}
                   </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Audio Track */}
          <div className="flex h-12 bg-neutral-900/30 rounded border border-neutral-800/50 relative">
            <div className="absolute left-2 top-0 bottom-0 flex items-center text-xs font-medium text-neutral-600 select-none w-16">
              配音轨
            </div>
            <div className="ml-20 flex w-full relative h-full py-1">
               {audioClips.length === 0 ? (
                 <div className="h-full flex items-center text-xs text-neutral-600">暂无本地配音片段</div>
               ) : audioClips.map((clip) => (
                 <div
                   key={clip.id}
                   className="h-full border rounded-md px-2 py-1 absolute flex items-center justify-between bg-emerald-900/30 border-emerald-500/30 cursor-pointer hover:brightness-110 transition-all"
                   style={clipStyle(clip, totalDuration)}
                   onClick={() => setSelectedClipId(clip.id)}
                 >
                   <span className="text-[10px] font-medium text-white/80 whitespace-nowrap">{clip.label}</span>
                   {clip.asset && (
                     <span className="max-w-[35%] truncate text-[10px] text-emerald-100/80">
                       {clip.asset.name}
                     </span>
                   )}
                   <svg className="h-4 w-1/2 opacity-50" preserveAspectRatio="none" viewBox="0 0 100 20">
                     <path d="M0,10 Q5,0 10,10 T20,10 T30,10 T40,10 T50,10 T60,10 T70,10 T80,10 T90,10 T100,10" fill="none" stroke="currentColor" strokeWidth="1" className="text-emerald-300"/>
                   </svg>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
