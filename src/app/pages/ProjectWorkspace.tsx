"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, Download, Edit3, Play, Save, Share2, X } from "lucide-react";
import Link from "next/link";
import ScriptEditor from "../components/workspace/ScriptEditor";
import CharacterGraph from "../components/workspace/CharacterGraph";
import Storyboard from "../components/workspace/Storyboard";
import Timeline from "../components/workspace/Timeline";
import PreviewPlayer from "../components/workspace/PreviewPlayer";
import clsx from "clsx";
import type {
  AssemblyManifest,
  AssetLinkTargetType,
  AssetRecord,
  ProjectDetail,
  VideoExportJobRecord,
} from "@/lib/types";
import { readErrorMessage } from "@/lib/client-errors";

type Tab = "script" | "characters" | "storyboard" | "timeline";

const tabLoadingText: Record<Tab, string> = {
  script: "正在读取剧本数据...",
  characters: "正在读取人物设定...",
  storyboard: "正在读取分镜数据...",
  timeline: "正在读取时间线数据...",
};

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("script");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetLinkError, setAssetLinkError] = useState<string | null>(null);
  const [timelineActionError, setTimelineActionError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [previewManifest, setPreviewManifest] = useState<AssemblyManifest | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [exportJob, setExportJob] = useState<VideoExportJobRecord | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      setIsLoading(true);
      setError(null);
      setAssetLinkError(null);
      setTimelineActionError(null);

      try {
        const loadAssets = async () => {
          const assetsResponse = await fetch("/api/assets");
          if (!assetsResponse.ok) {
            throw new Error(await readErrorMessage(assetsResponse, "素材列表读取失败"));
          }
          const assetsData = (await assetsResponse.json()) as { assets: AssetRecord[] };
          return assetsData.assets;
        };

        if (projectId === "new") {
          const response = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          if (!response.ok) {
            throw new Error(await readErrorMessage(response, "项目创建失败"));
          }
          const data = (await response.json()) as { project: ProjectDetail };
          const loadedAssets = await loadAssets();
          if (!cancelled) {
            router.replace(`/project/${data.project.id}`);
            setProject(data.project);
            setAssets(loadedAssets);
          }
          return;
        }

        const [response, loadedAssets] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          loadAssets(),
        ]);
        if (!response.ok) {
          throw new Error(await readErrorMessage(response, "项目不存在或无法读取"));
        }
        const data = (await response.json()) as { project: ProjectDetail };
        if (!cancelled) {
          setProject(data.project);
          setAssets(loadedAssets);
          setDraftTitle(data.project.title);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "项目读取失败");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProject();

    return () => {
      cancelled = true;
    };
  }, [projectId, router]);

  const updateAssetLink = async (
    targetType: AssetLinkTargetType,
    targetId: string,
    assetId: string | null
  ) => {
    if (!project) return;

    setAssetLinkError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}/asset-links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, assetId }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "素材绑定失败"));
      }
      const data = (await response.json()) as { project: ProjectDetail };
      setProject(data.project);
    } catch (linkError) {
      setAssetLinkError(linkError instanceof Error ? linkError.message : "素材绑定失败");
    }
  };

  const runTimelineAction = async (
    action: () => Promise<Response>,
    fallbackMessage: string
  ) => {
    setTimelineActionError(null);
    try {
      const response = await action();
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, fallbackMessage));
      }
      const data = (await response.json()) as { project: ProjectDetail };
      setProject(data.project);
    } catch (actionError) {
      setTimelineActionError(actionError instanceof Error ? actionError.message : fallbackMessage);
    }
  };

  const updateTimelineClip = async (
    clipId: string,
    input: { label?: string; startMs?: number; durationMs?: number }
  ) => {
    if (!project) return;
    await runTimelineAction(
      () => fetch(`/api/projects/${project.id}/timeline-clips/${clipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }),
      "时间线片段更新失败"
    );
  };

  const splitTimelineClip = async (clipId: string) => {
    if (!project) return;
    await runTimelineAction(
      () => fetch(`/api/projects/${project.id}/timeline-clips/${clipId}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      "时间线片段拆分失败"
    );
  };

  const createAudioTrack = async () => {
    if (!project) return;
    const nextIndex = project.audioTracks.length + 1;
    const defaultDurationMs = Math.max(project.durationSeconds * 1000, 5000);
    await runTimelineAction(
      () => fetch(`/api/projects/${project.id}/audio-tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: `配音轨 ${nextIndex}`,
          startMs: 0,
          durationMs: defaultDurationMs,
        }),
      }),
      "配音轨创建失败"
    );
  };

  const generateSubtitleTracks = async () => {
    if (!project) return;
    await runTimelineAction(
      () => fetch(`/api/projects/${project.id}/subtitle-tracks`, {
        method: "POST",
      }),
      "字幕轨生成失败"
    );
  };

  const createTransition = async (input: { sourceClipId: string; targetClipId: string }) => {
    if (!project) return;
    await runTimelineAction(
      () => fetch(`/api/projects/${project.id}/transitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceClipId: input.sourceClipId,
          targetClipId: input.targetClipId,
          type: "fade",
          durationMs: 500,
        }),
      }),
      "转场创建失败"
    );
  };

  const deleteTransition = async (transitionId: string) => {
    if (!project) return;
    await runTimelineAction(
      () => fetch(`/api/projects/${project.id}/transitions/${transitionId}`, {
        method: "DELETE",
      }),
      "转场删除失败"
    );
  };

  const deleteTimelineClip = async (clipId: string) => {
    if (!project) return;
    await runTimelineAction(
      () => fetch(`/api/projects/${project.id}/timeline-clips/${clipId}`, {
        method: "DELETE",
      }),
      "时间线片段删除失败"
    );
  };

  const reorderTimelineClip = async (clipId: string, direction: "left" | "right") => {
    if (!project) return;
    await runTimelineAction(
      () => fetch(`/api/projects/${project.id}/timeline-clips/${clipId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      }),
      "时间线片段移动失败"
    );
  };

  const openPreview = async () => {
    if (!project) return;

    setPreviewError(null);
    setIsPreviewLoading(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/assembly-manifest`);
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "本地预览清单生成失败"));
      }
      const data = (await response.json()) as { manifest: AssemblyManifest };
      setPreviewManifest(data.manifest);
    } catch (previewLoadError) {
      setPreviewError(previewLoadError instanceof Error ? previewLoadError.message : "本地预览清单生成失败");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const startExport = async () => {
    if (!project) return;

    setExportError(null);
    setExportJob(null);
    setIsExporting(true);
    try {
      const response = await fetch(`/api/projects/${project.id}/exports`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "本地导出失败"));
      }
      const data = (await response.json()) as { exportJob: VideoExportJobRecord };
      setExportJob(data.exportJob);
    } catch (videoExportError) {
      setExportError(videoExportError instanceof Error ? videoExportError.message : "本地导出失败");
    } finally {
      setIsExporting(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "script", label: "剧本解析" },
    { id: "characters", label: "人物关系与设定" },
    { id: "storyboard", label: "分镜生成" },
    { id: "timeline", label: "时间线与合成" },
  ];

  const startTitleEdit = () => {
    if (!project) return;
    setDraftTitle(project.title);
    setTitleError(null);
    setIsEditingTitle(true);
  };

  const cancelTitleEdit = () => {
    setDraftTitle(project?.title ?? "");
    setTitleError(null);
    setIsEditingTitle(false);
  };

  const saveTitle = async () => {
    if (!project) return;

    const title = draftTitle.trim();
    if (!title) {
      setTitleError("标题不能为空");
      return;
    }

    setIsSavingTitle(true);
    setTitleError(null);
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        throw new Error(await readErrorMessage(response, "标题保存失败"));
      }
      const data = (await response.json()) as { project: ProjectDetail };
      setProject(data.project);
      setDraftTitle(data.project.title);
      setIsEditingTitle(false);
    } catch (saveError) {
      setTitleError(saveError instanceof Error ? saveError.message : "标题保存失败");
    } finally {
      setIsSavingTitle(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800/50 flex items-center justify-between px-4 flex-shrink-0 bg-neutral-900/30">
        <div className="flex items-center">
          <Link href="/" className="text-neutral-400 hover:text-neutral-200 mr-4">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          {isEditingTitle ? (
            <div className="flex items-center">
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void saveTitle();
                  if (event.key === "Escape") cancelTitleEdit();
                }}
                className="w-64 bg-neutral-950 border border-neutral-700 rounded-md px-2 py-1 text-sm font-medium text-neutral-100 outline-none focus:border-neutral-500"
                autoFocus
              />
              <button
                type="button"
                onClick={saveTitle}
                disabled={isSavingTitle}
                className="ml-2 p-1.5 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
                title="保存标题"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={cancelTitleEdit}
                className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors"
                title="取消编辑"
              >
                <X className="w-4 h-4" />
              </button>
              {titleError && <span className="ml-2 text-xs text-red-400">{titleError}</span>}
            </div>
          ) : (
            <div className="flex items-center">
              <h1 className="text-sm font-medium text-neutral-200">{project?.title ?? "读取项目中..."}</h1>
              {project && (
                <button
                  type="button"
                  onClick={startTitleEdit}
                  className="ml-2 p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors"
                  title="编辑标题"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          <span className="ml-3 px-2 py-0.5 rounded text-[10px] font-medium bg-neutral-800 text-neutral-400">
            {project?.status === "processing" ? "处理中" : project?.status === "completed" ? "已完成" : "草稿"}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button className="flex items-center px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors">
            <Save className="w-4 h-4 mr-1.5" />
            保存
          </button>
          <button className="flex items-center px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors">
            <Share2 className="w-4 h-4 mr-1.5" />
            分享
          </button>
          <button
            type="button"
            onClick={() => void startExport()}
            disabled={!project || isExporting}
            className="flex items-center px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isExporting ? "导出中..." : "导出"}
          </button>
          <button
            type="button"
            onClick={() => void openPreview()}
            disabled={!project || isPreviewLoading}
            className="flex items-center px-4 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-900 hover:bg-white rounded-md transition-colors ml-2 disabled:opacity-60 disabled:hover:bg-neutral-100"
          >
            <Play className="w-4 h-4 mr-1.5 fill-current" />
            {isPreviewLoading ? "生成预览..." : "预览合成"}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-neutral-800/50 px-4 flex-shrink-0 flex justify-center bg-neutral-900/20">
        <nav className="flex space-x-1 py-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "px-5 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === tab.id
                  ? "bg-neutral-800 text-neutral-100"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Workspace Area */}
      <div className="flex-1 overflow-hidden relative">
        {(assetLinkError || timelineActionError || previewError || exportError) && (
          <div className="absolute top-3 right-4 z-20 max-w-sm rounded-md border border-red-500/30 bg-red-950/90 px-3 py-2 text-xs text-red-100 shadow-lg">
            {assetLinkError || timelineActionError || previewError || exportError}
          </div>
        )}
        {exportJob?.status === "completed" && exportJob.outputRelativePath && (
          <div className="absolute top-3 right-4 z-20 max-w-sm rounded-md border border-emerald-500/30 bg-emerald-950/90 px-3 py-2 text-xs text-emerald-100 shadow-lg">
            导出完成：{exportJob.outputRelativePath}
          </div>
        )}
        {previewManifest && (
          <PreviewPlayer manifest={previewManifest} onClose={() => setPreviewManifest(null)} />
        )}
        {isLoading && (
          <div className="h-full flex flex-col items-center justify-center bg-neutral-950 text-neutral-500">
            <span className="text-sm font-medium text-neutral-400">{tabLoadingText[activeTab]}</span>
            <span className="text-xs mt-2">正在从本地 SQLite 数据库加载项目内容</span>
          </div>
        )}
        {!isLoading && error && (
          <div className="h-full flex items-center justify-center bg-neutral-950 text-neutral-500">
            {error}
          </div>
        )}
        {!isLoading && project && activeTab === "script" && (
          <ScriptEditor
            project={project}
            onProjectChange={setProject}
            onNext={() => setActiveTab("characters")}
          />
        )}
        {!isLoading && project && activeTab === "characters" && (
          <CharacterGraph
            assets={assets}
            characters={project.characters}
            relationships={project.relationships}
            onAssetLink={(targetId, assetId) => void updateAssetLink("character", targetId, assetId)}
            onNext={() => setActiveTab("storyboard")}
          />
        )}
        {!isLoading && project && activeTab === "storyboard" && (
          <Storyboard
            assets={assets}
            scenes={project.scenes}
            plotBeats={project.plotBeats}
            dialogueBlocks={project.dialogueBlocks}
            onAssetLink={(targetId, assetId) => void updateAssetLink("scene", targetId, assetId)}
            onNext={() => setActiveTab("timeline")}
          />
        )}
        {!isLoading && project && activeTab === "timeline" && (
          <Timeline
            assets={assets}
            scenes={project.scenes}
            clips={project.timelineClips}
            audioTracks={project.audioTracks}
            subtitleTracks={project.subtitleTracks}
            transitions={project.transitions}
            onAssetLink={(targetType, targetId, assetId) => void updateAssetLink(targetType, targetId, assetId)}
            onClipUpdate={(clipId, input) => void updateTimelineClip(clipId, input)}
            onClipSplit={(clipId) => void splitTimelineClip(clipId)}
            onClipDelete={(clipId) => void deleteTimelineClip(clipId)}
            onClipReorder={(clipId, direction) => void reorderTimelineClip(clipId, direction)}
            onAudioTrackCreate={() => void createAudioTrack()}
            onSubtitleTracksGenerate={() => void generateSubtitleTracks()}
            onTransitionCreate={(input) => void createTransition(input)}
            onTransitionDelete={(transitionId) => void deleteTransition(transitionId)}
          />
        )}
      </div>
    </div>
  );
}
