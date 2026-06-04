"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ProjectSummary } from "@/lib/types";

export default function Projects() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((response) => response.json())
      .then((data: { projects: ProjectSummary[] }) => setProjects(data.projects))
      .finally(() => setIsLoading(false));
  }, []);

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
                <Link
                  key={project.id}
                  href={`/project/${project.id}`}
                  className="flex items-center justify-between py-4 text-neutral-300 hover:text-neutral-100 transition-colors"
                >
                  <span>{project.title}</span>
                  <span className="text-xs text-neutral-500">{project.sceneCount} 幕</span>
                </Link>
              ))}
            </div>
          )}
          <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">返回工作台</Link>
        </div>
      </div>
    </div>
  );
}

