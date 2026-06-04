"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Clock, Film, Trash2 } from "lucide-react";
import type { ProjectSummary } from "@/lib/types";

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((response) => response.json())
      .then((data: { projects: ProjectSummary[] }) => setProjects(data.projects))
      .finally(() => setIsLoading(false));
  }, []);

  const createProject = async () => {
    setIsCreating(true);
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await response.json()) as { project: ProjectSummary };
    router.push(`/project/${data.project.id}`);
  };

  const deleteProject = async (project: ProjectSummary) => {
    if (confirmingDeleteId !== project.id) {
      setConfirmingDeleteId(project.id);
      return;
    }

    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (response.ok) {
      setProjects((items) => items.filter((item) => item.id !== project.id));
      setConfirmingDeleteId(null);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-neutral-100 tracking-tight">工作台</h1>
            <p className="text-sm text-neutral-400 mt-1">欢迎回来，继续您的创作之旅。</p>
          </div>
          <button
            type="button"
            onClick={createProject}
            disabled={isCreating}
            className="flex items-center px-4 py-2 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isCreating ? "创建中..." : "新建项目"}
          </button>
        </div>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-200">最近项目</h2>
            <Link href="/projects" className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors">
              查看全部
            </Link>
          </div>

          {isLoading ? (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8 text-center text-neutral-500">
              正在读取本地数据库...
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8 text-center text-neutral-400">
              <p>本地数据库暂无项目。</p>
              <button
                type="button"
                onClick={createProject}
                disabled={isCreating}
                className="text-blue-400 hover:underline mt-4 inline-block disabled:opacity-50"
              >
                创建第一个项目
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  className="group flex flex-col bg-neutral-900/50 border border-neutral-800 rounded-xl p-5 hover:border-neutral-600 transition-colors cursor-pointer relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:bg-neutral-700 group-hover:text-neutral-200 transition-colors">
                      <Film className="w-5 h-5" />
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void deleteProject(project);
                      }}
                      className="text-neutral-500 hover:text-red-400 p-1 rounded-md hover:bg-neutral-800 transition-colors"
                      title={confirmingDeleteId === project.id ? "确认删除项目" : "删除项目"}
                    >
                      {confirmingDeleteId === project.id ? (
                        <span className="text-xs text-red-400 px-1">确认删除</span>
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-base font-medium text-neutral-200 group-hover:text-neutral-100 mb-1 truncate">
                    {project.title}
                  </h3>

                  <div className="flex items-center text-xs text-neutral-500 mt-auto pt-4 space-x-4">
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      {formatUpdatedAt(project.updatedAt)}
                    </span>
                    <span>{project.sceneCount} 幕</span>
                    <span>{formatDuration(project.durationSeconds)}</span>
                  </div>

                  {project.status === "processing" && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-neutral-800">
                      <div className="h-full bg-blue-500 w-1/3 animate-pulse"></div>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
