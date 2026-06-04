"use client";

import { useEffect, useMemo, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";

import type { AssemblyManifest, AssemblyManifestTransition, AssemblyManifestVideoClip } from "@/lib/types";

function assetUrl(relativePath: string) {
  return `/api/assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`;
}

function formatSeconds(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function transitionLabel(type: AssemblyManifestTransition["type"]) {
  const labels: Record<AssemblyManifestTransition["type"], string> = {
    cut: "硬切",
    fade: "淡入淡出",
    dissolve: "叠化",
    wipe: "划像",
  };
  return labels[type];
}

function currentVideoClip(clips: AssemblyManifestVideoClip[], currentMs: number) {
  return clips.find((clip) => currentMs >= clip.startMs && currentMs < clip.startMs + clip.durationMs) ?? clips[0] ?? null;
}

export default function PreviewPlayer({
  manifest,
  onClose,
}: {
  manifest: AssemblyManifest;
  onClose: () => void;
}) {
  const [currentMs, setCurrentMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const durationMs = Math.max(manifest.timeline.durationMs, 1);
  const activeClip = currentVideoClip(manifest.timeline.videoClips, currentMs);
  const activeSubtitle = manifest.timeline.subtitleTracks.find((subtitle) => (
    currentMs >= subtitle.startMs && currentMs < subtitle.startMs + subtitle.durationMs
  ));
  const activeTransition = useMemo(() => {
    return manifest.timeline.transitions.find((transition) => {
      const source = manifest.timeline.videoClips.find((clip) => clip.id === transition.sourceClipId);
      if (!source) return false;
      const transitionStartMs = Math.max(source.startMs, source.startMs + source.durationMs - transition.durationMs);
      return currentMs >= transitionStartMs && currentMs <= source.startMs + source.durationMs;
    }) ?? null;
  }, [currentMs, manifest.timeline.transitions, manifest.timeline.videoClips]);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = window.setInterval(() => {
      setCurrentMs((value) => {
        const nextValue = value + 250;
        if (nextValue >= durationMs) {
          window.clearInterval(interval);
          setIsPlaying(false);
          return durationMs;
        }
        return nextValue;
      });
    }, 250);

    return () => window.clearInterval(interval);
  }, [durationMs, isPlaying]);

  const resetPreview = () => {
    setCurrentMs(0);
    setIsPlaying(false);
  };

  return (
    <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-5xl max-h-full overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl flex flex-col">
        <div className="h-12 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900">
          <div>
            <h2 className="text-sm font-medium text-neutral-100">本地预览播放</h2>
            <p className="text-[11px] text-neutral-500">读取 assembly manifest · {manifest.project.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800"
            title="关闭预览"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] min-h-0">
          <div className="relative bg-black min-h-[420px] flex items-center justify-center overflow-hidden">
            {activeClip?.asset.type === "video" ? (
              <video
                key={activeClip.asset.relativePath}
                src={assetUrl(activeClip.asset.relativePath)}
                className="max-h-full max-w-full object-contain"
                muted
                autoPlay={isPlaying}
                controls
              />
            ) : activeClip ? (
              <img
                src={assetUrl(activeClip.asset.relativePath)}
                alt={`${activeClip.label} 本地预览素材`}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-sm text-neutral-500">暂无可预览的本地视频片段</div>
            )}

            {activeTransition && (
              <div className="absolute top-4 left-4 rounded-md border border-fuchsia-400/40 bg-fuchsia-950/80 px-3 py-1 text-xs text-fuchsia-100">
                转场预览 · {transitionLabel(activeTransition.type)} · {formatSeconds(activeTransition.durationMs)}
              </div>
            )}

            {activeSubtitle && (
              <div className="absolute bottom-8 left-1/2 max-w-[80%] -translate-x-1/2 rounded bg-black/75 px-4 py-2 text-center text-sm text-white shadow-lg">
                {activeSubtitle.speaker ? `${activeSubtitle.speaker}: ` : ""}{activeSubtitle.text}
              </div>
            )}
          </div>

          <aside className="border-t lg:border-t-0 lg:border-l border-neutral-800 bg-neutral-950 p-4 overflow-auto custom-scrollbar">
            <div className="space-y-4">
              <div>
                <div className="text-xs text-neutral-500 mb-1">当前片段</div>
                <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200">
                  {activeClip?.label ?? "暂无片段"}
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-500 mb-1">播放进度</div>
                <div className="h-2 rounded-full bg-neutral-800 overflow-hidden">
                  <div
                    className="h-full bg-neutral-200"
                    style={{ width: `${Math.min(100, (currentMs / durationMs) * 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-neutral-500">
                  <span>{formatSeconds(currentMs)}</span>
                  <span>{formatSeconds(durationMs)}</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-neutral-500 mb-2">本地音频轨</div>
                {manifest.timeline.audioTracks.length === 0 ? (
                  <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-500">
                    暂无本地音频轨
                  </div>
                ) : manifest.timeline.audioTracks.map((track) => (
                  <div key={track.id} className="mb-2 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2">
                    <div className="mb-2 flex items-center justify-between gap-2 text-xs text-neutral-300">
                      <span className="truncate">{track.label}</span>
                      <span className="font-mono text-neutral-500">{formatSeconds(track.startMs)}</span>
                    </div>
                    <audio src={assetUrl(track.asset.relativePath)} controls className="w-full h-8" />
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs text-neutral-500 mb-2">Manifest 轨道</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2">
                    <span className="block text-neutral-500">视频</span>
                    <span className="text-neutral-200">{manifest.timeline.videoClips.length}</span>
                  </div>
                  <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2">
                    <span className="block text-neutral-500">字幕</span>
                    <span className="text-neutral-200">{manifest.timeline.subtitleTracks.length}</span>
                  </div>
                  <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2">
                    <span className="block text-neutral-500">音频</span>
                    <span className="text-neutral-200">{manifest.timeline.audioTracks.length}</span>
                  </div>
                  <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2">
                    <span className="block text-neutral-500">转场</span>
                    <span className="text-neutral-200">{manifest.timeline.transitions.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="h-14 border-t border-neutral-800 bg-neutral-900 flex items-center justify-between px-4">
          <div className="text-xs text-neutral-500">
            本地素材路径：{activeClip?.asset.relativePath ?? "无"}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={resetPreview}
              className="p-2 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              title="重新开始"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((value) => !value)}
              className="flex items-center rounded-md bg-neutral-100 px-4 py-2 text-xs font-medium text-neutral-900 hover:bg-white"
            >
              {isPlaying ? <Pause className="mr-1.5 h-4 w-4" /> : <Play className="mr-1.5 h-4 w-4 fill-current" />}
              {isPlaying ? "暂停预览" : "播放预览"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
