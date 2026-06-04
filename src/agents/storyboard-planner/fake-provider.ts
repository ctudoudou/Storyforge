import type { StoryboardPlannerProvider, StoryboardShot } from "./types.ts";

function sceneLabel(sceneNumber: number, location: string) {
  return `S${String(sceneNumber).padStart(2, "0")} - ${location}`;
}

function summarizeDialogue(lines: string[]) {
  return lines.length ? lines.join(" / ") : "无对白";
}

export function createFakeStoryboardPlannerProvider(): StoryboardPlannerProvider {
  return {
    name: "fake-storyboard-planner",
    model: "fake-storyboard-planner-v1",
    planStoryboard(context) {
      const shots: StoryboardShot[] = context.scenes.map((scene, index) => {
        const matchingClip = context.timelineClips.find((clip) => (
          clip.trackType === "video" && clip.label.startsWith(`S${String(scene.sceneNumber).padStart(2, "0")}`)
        ));
        const beats = context.plotBeats.filter((beat) => beat.sceneNumber === scene.sceneNumber);
        const dialogue = context.dialogueBlocks.filter((block) => block.sceneNumber === scene.sceneNumber);

        return {
          id: `storyboard_shot_${scene.id}`,
          sceneId: scene.id,
          sceneNumber: scene.sceneNumber,
          title: sceneLabel(scene.sceneNumber, scene.location),
          description: scene.description || `${scene.location}的剧情镜头`,
          camera: scene.camera || "中景，人物关系清晰",
          characters: scene.characters,
          beatSummary: beats.map((beat) => beat.summary).join("；") || "待补充剧情节点",
          dialogueSummary: summarizeDialogue(dialogue.map((block) => `${block.speaker}: ${block.content}`)),
          startMs: matchingClip?.startMs ?? index * 5000,
          durationMs: matchingClip?.durationMs ?? 5000,
        };
      });

      return {
        provider: "fake-storyboard-planner",
        model: "fake-storyboard-planner-v1",
        summary: `${context.projectTitle} 共规划 ${shots.length} 个分镜片段，风格：${context.style}。`,
        shots,
        metadata: {
          fake: true,
          sceneCount: context.scenes.length,
          targetDurationMs: context.targetDurationMs,
        },
      };
    },
  };
}
