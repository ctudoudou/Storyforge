import type { SceneDesignerProvider } from "./types.ts";

export function createFakeSceneDesignerProvider(): SceneDesignerProvider {
  return {
    name: "fake-scene-designer",
    model: "fake-scene-designer-v1",
    designScene(context) {
      const sceneLabel = `S${String(context.scene.sceneNumber).padStart(2, "0")} - ${context.scene.location}`;
      const mood = context.scene.mood || "待定";
      const camera = context.scene.camera || "待设置";

      return {
        provider: "fake-scene-designer",
        model: "fake-scene-designer-v1",
        visualBrief: [
          `${sceneLabel} 是 ${context.projectTitle} 的场景设计。`,
          `时间与情绪：${context.scene.timeOfDay || "未指定"}，${mood}。`,
          `镜头连续性：${camera}。`,
        ].join("\n"),
        continuityChecklist: [
          "保持地点空间关系",
          "保持色温和时间状态",
          "保持人物调度和镜头方向",
        ],
        metadata: {
          fake: true,
          sceneId: context.scene.id,
          linkedSceneAssetId: context.scene.asset?.id ?? null,
        },
      };
    },
  };
}
