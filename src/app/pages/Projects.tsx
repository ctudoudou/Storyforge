"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, Edit3, Trash2, X } from "lucide-react";
import type { ProjectSummary } from "@/lib/types";

export default function Projects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((response) => response.json())
      .then((data: { projects: ProjectSummary[] }) => setProjects(data.projects))
      .finally(() => setIsLoading(false));
  }, []);

  const startEditing = (project: ProjectSummary) => {
    setEditingProjectId(project.id);
    setDraftTitle(project.title);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingProjectId(null);
    setDraftTitle("");
    setError(null);
  };

  const saveTitle = async (projectId: string) => {
    const title = draftTitle.trim();
    if (!title) {
      setError("标题不能为空");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!response.ok) {
        throw new Error("标题保存失败");
      }
      const data = (await response.json()) as { project: ProjectSummary };
      setProjects((items) => items.map((item) => item.id === projectId ? data.project : item));
      cancelEditing();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "标题保存失败");
    } finally {
      setIsSaving(false);
    }
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
      if (editingProjectId === project.id) cancelEditing();
    } else {
      setError("项目删除失败");
    }
  };

  const duplicateProject = async (project: ProjectSummary) => {
    const response = await fetch(`/api/projects/${project.id}/duplicate`, { method: "POST" });
    if (response.ok) {
      const data = (await response.json()) as { project: ProjectSummary };
      setProjects((items) => [data.project, ...items]);
    } else {
      setError("项目复制失败");
    }
  };

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-neutral-100 mb-6">我的项目</h1>
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-8 text-neutral-400">
          {isLoading ? (
            <p className="text-center">正在读取本地数据库...</p>
          ) : projects.length === 0 ? (
            <p className="text-center">本地数据库暂无项目。</p>
          ) : (
            <div className="divide-y divide-neutral-800">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between py-4 gap-4 text-neutral-300"
                >
                  {editingProjectId === project.id ? (
                    <div className="flex items-center min-w-0 flex-1">
                      <input
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") void saveTitle(project.id);
                          if (event.key === "Escape") cancelEditing();
                        }}
                        className="min-w-0 flex-1 bg-neutral-950 border border-neutral-700 rounded-md px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => saveTitle(project.id)}
                        disabled={isSaving}
                        className="ml-2 p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
                        title="保存标题"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors"
                        title="取消编辑"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Link
                        href={`/project/${project.id}`}
                        className="min-w-0 flex-1 truncate hover:text-neutral-100 transition-colors"
                      >
                        {project.title}
                      </Link>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-neutral-500">{project.sceneCount} 幕</span>
                        <button
                          type="button"
                          onClick={() => startEditing(project)}
                          className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors"
                          title="编辑标题"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateProject(project)}
                          className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors"
                          title="复制项目"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProject(project)}
                          className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-md transition-colors"
                          title={confirmingDeleteId === project.id ? "确认删除项目" : "删除项目"}
                        >
                          {confirmingDeleteId === project.id ? (
                            <span className="text-xs text-red-400">确认删除</span>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                        {confirmingDeleteId === project.id && (
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            className="p-2 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors"
                            title="取消删除"
                          >
                            取消
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {error && <p className="text-xs text-red-400 mt-4">{error}</p>}
          <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">返回工作台</Link>
        </div>
      </div>
    </div>
  );
}
