"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, CheckCircle2, Circle, X } from "lucide-react";
import type { ProjectDetail, ScriptParsePreview } from "@/lib/types";
import { readErrorMessage } from "@/lib/client-errors";

export default function ScriptEditor({
  project,
  onProjectChange,
  onNext,
}: {
  project: ProjectDetail;
  onProjectChange: (project: ProjectDetail) => void;
  onNext: () => void;
}) {
  const [content, setContent] = useState(project.script.content);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ScriptParsePreview | null>(null);
  const [isConfirmingPreview, setIsConfirmingPreview] = useState(false);
  const didHydrate = useRef(false);

  const isParsed = project.characters.length > 0 || project.scenes.length > 0;
  const isScriptEmpty = content.trim().length === 0;

  const steps = [
    "Parsing narrative structure & timeline...",
    "Extracting character graphs & relationships...",
    "Scouting virtual environment parameters...",
    "Rendering sequence frames & shot selection...",
    "Assembling studio workbench..."
  ];

  useEffect(() => {
    setContent(project.script.content);
    didHydrate.current = false;
    setPreview(null);
  }, [project.id, project.script.content]);

  useEffect(() => {
    setPreview(null);
  }, [content]);

  useEffect(() => {
    if (!isParsing) return;

    let prog = 0;
    const interval = setInterval(() => {
      prog += 1;
      setProgress(prog);
      setCurrentStep(Math.min(Math.floor(prog / 20), 4));

      if (prog >= 100) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [isParsing]);

  useEffect(() => {
    if (!didHydrate.current) {
      didHydrate.current = true;
      return;
    }

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${project.id}/script`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (response.ok) {
          const data = (await response.json()) as { project: ProjectDetail };
          onProjectChange(data.project);
        } else {
          setError(await readErrorMessage(response, "剧本保存失败"));
        }
      } catch {
        setError("剧本保存失败");
      } finally {
        setIsSaving(false);
      }
    }, 600);

    return () => clearTimeout(timeout);
  }, [content, onProjectChange, project.id]);

  const handleParse = async () => {
    setIsParsing(true);
    setProgress(0);
    setCurrentStep(0);
    setError(null);

    try {
      const saveRequest = fetch(`/api/projects/${project.id}/script`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const minimumAnimation = new Promise((resolve) => setTimeout(resolve, 4300));

      const [saveResponse] = await Promise.all([saveRequest, minimumAnimation]);
      if (!saveResponse.ok) {
        throw new Error(await readErrorMessage(saveResponse, "剧本保存失败"));
      }
      const saveData = (await saveResponse.json()) as { project: ProjectDetail };
      onProjectChange(saveData.project);

      const previewResponse = await fetch(`/api/projects/${project.id}/parse/preview`, { method: "POST" });
      if (!previewResponse.ok) {
        throw new Error(await readErrorMessage(previewResponse, "剧本解析失败"));
      }
      const data = (await previewResponse.json()) as { preview: ScriptParsePreview };
      setPreview(data.preview);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "剧本解析失败");
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmPreview = async () => {
    setIsConfirmingPreview(true);
    setError(null);

    try {
      const parseResponse = await fetch(`/api/projects/${project.id}/parse`, { method: "POST" });
      if (!parseResponse.ok) {
        throw new Error(await readErrorMessage(parseResponse, "剧本写入失败"));
      }
      const data = (await parseResponse.json()) as { project: ProjectDetail };
      setPreview(null);
      onProjectChange(data.project);
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "剧本写入失败");
    } finally {
      setIsConfirmingPreview(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-neutral-950 relative">
      {/* Parsing Animation Modal */}
      {isParsing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/95 backdrop-blur-sm">
          <div className="w-full max-w-2xl px-10 py-12 rounded-lg flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <span className="text-neutral-100 font-sans text-[15px] font-medium tracking-wide">
                Render Engine Activity
              </span>
              <span className="text-neutral-500 font-mono text-sm">{progress}%</span>
            </div>

            <div className="h-px w-full bg-neutral-800/80 mb-10"></div>

            <div className="space-y-6 font-mono text-[13px]">
              {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isActive = index === currentStep;
                const isPending = index > currentStep;

                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-5 ${
                      isCompleted ? "text-neutral-400" :
                      isActive ? "text-neutral-100" :
                      "text-neutral-800"
                    }`}
                  >
                    {isCompleted && <CheckCircle2 className="w-4 h-4 flex-shrink-0 stroke-[1.5]" />}
                    {isActive && (
                      <svg className="w-4 h-4 flex-shrink-0 animate-[spin_3s_linear_infinite]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="9" strokeDasharray="4 4" />
                      </svg>
                    )}
                    {isPending && <Circle className="w-4 h-4 flex-shrink-0 stroke-[1.5]" />}
                    <span className="tracking-tight">{step}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-14 h-[3px] w-full bg-neutral-900 overflow-hidden rounded-full">
              <div
                className="h-full bg-neutral-100 transition-all duration-75 ease-linear rounded-r-full"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050505]/85 backdrop-blur-sm px-6">
          <div className="w-full max-w-4xl max-h-[86vh] overflow-hidden rounded-lg border border-neutral-800 bg-neutral-950 shadow-2xl flex flex-col">
            <div className="h-14 border-b border-neutral-800 flex items-center justify-between px-5">
              <div>
                <div className="text-sm font-medium text-neutral-100">解析结果预览</div>
                <div className="text-xs text-neutral-500 mt-0.5">确认后写入本地 SQLite，取消不会修改现有记录</div>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={isConfirmingPreview}
                className="p-1.5 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
                title="关闭预览"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-5">
              {isParsed && (
                <div className="mb-4 border border-amber-500/20 bg-amber-500/10 text-amber-200 text-xs px-3 py-2 rounded-md">
                  当前项目已有解析记录，确认写入会替换现有的人物、关系、剧情节点、对白、场景和时间线。
                </div>
              )}

              <div className="grid grid-cols-5 gap-3 mb-5">
                {[
                  ["人物", preview.characters.length],
                  ["关系", preview.relationships.length],
                  ["剧情", preview.plotBeats.length],
                  ["对白", preview.dialogueBlocks.length],
                  ["场景", preview.scenes.length],
                ].map(([label, count]) => (
                  <div key={label} className="border border-neutral-800 bg-neutral-900/60 rounded-md p-3">
                    <div className="text-[11px] text-neutral-500">{label}</div>
                    <div className="text-xl text-neutral-100 font-mono mt-1">{count}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <section className="border border-neutral-800 rounded-md p-4">
                  <div className="text-xs font-medium text-neutral-300 mb-3">人物</div>
                  <div className="space-y-2">
                    {preview.characters.slice(0, 6).map((character) => (
                      <div key={character.name} className="text-sm text-neutral-300 flex justify-between">
                        <span>{character.name}</span>
                        <span className="text-xs text-neutral-500">{character.traits.slice(0, 3).join(" / ") || "待补充"}</span>
                      </div>
                    ))}
                    {preview.characters.length === 0 && <div className="text-sm text-neutral-500">暂无人物</div>}
                  </div>
                </section>

                <section className="border border-neutral-800 rounded-md p-4">
                  <div className="text-xs font-medium text-neutral-300 mb-3">剧情节点</div>
                  <div className="space-y-2">
                    {preview.plotBeats.slice(0, 5).map((beat) => (
                      <div key={`${beat.sceneNumber}-${beat.type}`} className="text-sm text-neutral-300">
                        <span className="text-neutral-500 font-mono mr-2">S{String(beat.sceneNumber).padStart(2, "0")}</span>
                        <span>{beat.summary}</span>
                      </div>
                    ))}
                    {preview.plotBeats.length === 0 && <div className="text-sm text-neutral-500">暂无剧情节点</div>}
                  </div>
                </section>
              </div>

              <section className="mt-4 border border-neutral-800 rounded-md p-4">
                <div className="text-xs font-medium text-neutral-300 mb-3">场景</div>
                <div className="space-y-3">
                  {preview.scenes.slice(0, 5).map((scene) => (
                    <div key={scene.sceneNumber} className="text-sm text-neutral-300">
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 font-mono">S{String(scene.sceneNumber).padStart(2, "0")}</span>
                        <span className="text-neutral-100">{scene.location}</span>
                        <span className="text-xs text-neutral-500 border border-neutral-800 px-1.5 py-0.5 rounded">{scene.timeOfDay}</span>
                        <span className="text-xs text-neutral-500 border border-neutral-800 px-1.5 py-0.5 rounded">{scene.mood}</span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-1">{scene.camera}</div>
                    </div>
                  ))}
                  {preview.scenes.length === 0 && <div className="text-sm text-neutral-500">暂无场景</div>}
                </div>
              </section>
            </div>

            <div className="h-16 border-t border-neutral-800 flex items-center justify-end gap-3 px-5">
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={isConfirmingPreview}
                className="px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded-md transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmPreview}
                disabled={isConfirmingPreview}
                className="px-5 py-2 bg-neutral-100 text-neutral-900 rounded-md text-sm font-medium hover:bg-white transition-colors disabled:opacity-50"
              >
                {isConfirmingPreview ? "写入中..." : "确认写入"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl h-full flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="h-12 border-b border-neutral-800 flex items-center px-4 justify-between bg-neutral-900 flex-shrink-0">
          <div className="flex items-center text-neutral-400">
            <FileText className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">输入剧本内容</span>
          </div>
          <div className="text-xs text-neutral-500">{isSaving ? "正在保存..." : "自动保存已开启"}</div>
        </div>

        <div className="flex-1 p-0 relative">
          <textarea
            className="w-full h-full p-6 bg-transparent text-neutral-200 outline-none resize-none leading-relaxed text-base placeholder-neutral-600 custom-scrollbar font-sans"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="在此输入您的剧本或大纲..."
          />
        </div>

        <div className="p-4 border-t border-neutral-800 bg-neutral-900/50 flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-500">
              {content.length} 个字符
            </div>
            {isScriptEmpty && (
              <div className="text-xs text-neutral-500 mt-1">
                尚未输入剧本，粘贴大纲或分场文本后即可解析。
              </div>
            )}
            {error && <div className="text-xs text-red-400 mt-1">{error}</div>}
          </div>

          <div className="flex space-x-3">
            {!isParsed ? (
               <button
                 onClick={handleParse}
                 disabled={isParsing || content.length === 0}
                 className="flex items-center px-6 py-2 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isParsing ? "启动中..." : "解析剧本"}
               </button>
            ) : (
               <>
                 <button
                   onClick={handleParse}
                   disabled={isParsing || content.length === 0}
                   className="flex items-center px-4 py-2 text-neutral-400 border border-neutral-800 rounded-lg text-sm font-medium hover:text-neutral-200 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {isParsing ? "启动中..." : "重新解析"}
                 </button>
                 <div className="flex items-center px-4 py-2 text-emerald-400 text-sm font-medium">
                   <CheckCircle2 className="w-4 h-4 mr-1.5" />
                   解析完成 (发现{project.characters.length}个人物, {project.scenes.length}个场景)
                 </div>
                 <button
                   onClick={onNext}
                   className="flex items-center px-6 py-2 bg-neutral-100 text-neutral-900 rounded-lg text-sm font-medium hover:bg-white transition-colors"
                 >
                   查看人物设定
                 </button>
               </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
