"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Play, Save, Share2 } from "lucide-react";
import Link from "next/link";
import ScriptEditor from "../components/workspace/ScriptEditor";
import CharacterGraph from "../components/workspace/CharacterGraph";
import Storyboard from "../components/workspace/Storyboard";
import Timeline from "../components/workspace/Timeline";
import clsx from "clsx";
import type { ProjectDetail } from "@/lib/types";

type Tab = "script" | "characters" | "storyboard" | "timeline";

export default function ProjectWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("script");
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      setIsLoading(true);
      setError(null);

      try {
        if (projectId === "new") {
          const response = await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          });
          const data = (await response.json()) as { project: ProjectDetail };
          if (!cancelled) {
            router.replace(`/project/${data.project.id}`);
            setProject(data.project);
          }
          return;
        }

        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          throw new Error("项目不存在或无法读取");
        }
        const data = (await response.json()) as { project: ProjectDetail };
        if (!cancelled) setProject(data.project);
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

  const tabs: { id: Tab; label: string }[] = [
    { id: "script", label: "剧本解析" },
    { id: "characters", label: "人物关系与设定" },
    { id: "storyboard", label: "分镜生成" },
    { id: "timeline", label: "时间线与合成" },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      {/* Header */}
      <header className="h-14 border-b border-neutral-800/50 flex items-center justify-between px-4 flex-shrink-0 bg-neutral-900/30">
        <div className="flex items-center">
          <Link href="/" className="text-neutral-400 hover:text-neutral-200 mr-4">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-sm font-medium text-neutral-200">{project?.title ?? "读取项目中..."}</h1>
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
          <button className="flex items-center px-4 py-1.5 text-xs font-medium bg-neutral-100 text-neutral-900 hover:bg-white rounded-md transition-colors ml-2">
            <Play className="w-4 h-4 mr-1.5 fill-current" />
            预览合成
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
        {isLoading && (
          <div className="h-full flex items-center justify-center bg-neutral-950 text-neutral-500">
            正在读取本地数据库...
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
          <CharacterGraph characters={project.characters} onNext={() => setActiveTab("storyboard")} />
        )}
        {!isLoading && project && activeTab === "storyboard" && (
          <Storyboard scenes={project.scenes} onNext={() => setActiveTab("timeline")} />
        )}
        {!isLoading && project && activeTab === "timeline" && (
          <Timeline scenes={project.scenes} clips={project.timelineClips} />
        )}
      </div>
    </div>
  );
}

