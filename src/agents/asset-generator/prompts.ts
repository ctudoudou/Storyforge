import type {
  CharacterDesignPrompt,
  CharacterDesignPromptInput,
  SceneKeyframePrompt,
  SceneKeyframePromptInput,
} from "./types.ts";

function requireText(value: string | undefined, field: string) {
  if (!value?.trim()) {
    throw new Error(`Character design prompt ${field} is required.`);
  }
  return value.trim();
}

function joinList(values: string[] | undefined) {
  return values?.map((value) => value.trim()).filter(Boolean).join("、") || "待补充";
}

export function buildCharacterDesignPrompt(input: CharacterDesignPromptInput): CharacterDesignPrompt {
  const name = requireText(input.character.name, "character.name");
  const role = input.character.role?.trim() || "待定角色";
  const traits = joinList(input.character.traits);
  const style = input.style?.trim() || "写实短剧定妆照，电影级布光，适合竖屏短剧生产";
  const aspectRatio = input.aspectRatio ?? "9:16";
  const consistencyNotes = input.visualConsistency?.notes?.trim() || "保持五官、发型、年龄感和服装识别度稳定";
  const anchorAssetIds = input.visualConsistency?.anchorAssetIds?.filter(Boolean) ?? [];
  const referenceSummary = input.references?.length
    ? input.references.map((reference) => `${reference.role}:${reference.assetId}`).join("；")
    : "无";

  const prompt = [
    `角色名称：${name}`,
    `角色定位：${role}`,
    `性格与状态：${traits}`,
    input.projectTitle?.trim() ? `所属项目：${input.projectTitle.trim()}` : null,
    input.storySummary?.trim() ? `剧情语境：${input.storySummary.trim()}` : null,
    `视觉风格：${style}`,
    `画幅：${aspectRatio}`,
    `一致性要求：${consistencyNotes}`,
    anchorAssetIds.length ? `一致性锚点资产：${anchorAssetIds.join("、")}` : null,
    `参考资产：${referenceSummary}`,
    "输出要求：单人角色设计图，主体清晰，面部可识别，服装和道具服务剧情，不添加文字、水印或 UI 元素。",
  ].filter(Boolean).join("\n");

  return {
    target: "character",
    title: `${name}角色设计`,
    prompt,
    negativePrompt: "低清晰度，脸部变形，多人同框，文字，水印，logo，过度磨皮，肢体异常，服装细节混乱",
    aspectRatio,
    references: input.references ?? [],
    parameters: {
      promptType: "character-design",
      characterName: name,
      aspectRatio,
      hasReferenceAssets: Boolean(input.references?.length),
      hasConsistencyAnchors: anchorAssetIds.length > 0,
    },
  };
}

function describeCharacters(input: SceneKeyframePromptInput) {
  if (!input.characters?.length) return "无指定人物";
  return input.characters
    .map((character) => {
      const name = requireText(character.name, "character.name");
      const role = character.role?.trim() || "待定角色";
      const traits = joinList(character.traits);
      return `${name}（${role}，${traits}）`;
    })
    .join("；");
}

export function buildSceneKeyframePrompt(input: SceneKeyframePromptInput): SceneKeyframePrompt {
  const location = requireText(input.scene.location, "scene.location");
  const timeOfDay = input.scene.timeOfDay?.trim() || "未指定";
  const mood = input.scene.mood?.trim() || "待定";
  const camera = input.scene.camera?.trim() || "中景，主体关系清晰";
  const style = input.style?.trim() || "写实短剧场景图，电影级布光，适合本地短剧资产生产";
  const aspectRatio = input.aspectRatio ?? "9:16";
  const consistencyNotes = input.visualConsistency?.notes?.trim() || "保持场景空间、色温、时代感和美术风格稳定";
  const anchorAssetIds = input.visualConsistency?.anchorAssetIds?.filter(Boolean) ?? [];
  const referenceSummary = input.references?.length
    ? input.references.map((reference) => `${reference.role}:${reference.assetId}`).join("；")
    : "无";
  const visualType = input.target === "keyframe" ? "关键帧画面" : "场景设定图";

  const prompt = [
    `画面类型：${visualType}`,
    `场景地点：${location}`,
    `时间：${timeOfDay}`,
    `情绪氛围：${mood}`,
    `镜头提示：${camera}`,
    input.projectTitle?.trim() ? `所属项目：${input.projectTitle.trim()}` : null,
    input.storySummary?.trim() ? `剧情语境：${input.storySummary.trim()}` : null,
    input.beatSummary?.trim() ? `剧情节点：${input.beatSummary.trim()}` : null,
    `登场人物：${describeCharacters(input)}`,
    `视觉风格：${style}`,
    `画幅：${aspectRatio}`,
    `一致性要求：${consistencyNotes}`,
    anchorAssetIds.length ? `一致性锚点资产：${anchorAssetIds.join("、")}` : null,
    `参考资产：${referenceSummary}`,
    input.target === "keyframe"
      ? "输出要求：单张剧情关键帧，动作和视线关系明确，画面可直接用于分镜，不添加文字、水印或 UI 元素。"
      : "输出要求：单张场景设计图，空间关系明确，便于后续镜头复用，不添加文字、水印或 UI 元素。",
  ].filter(Boolean).join("\n");

  return {
    target: input.target,
    title: `${location}${input.target === "keyframe" ? "关键帧" : "场景图"}`,
    prompt,
    negativePrompt: "低清晰度，透视混乱，文字，水印，logo，画面脏乱，人物脸部变形，空间关系不清，过度装饰",
    aspectRatio,
    references: input.references ?? [],
    parameters: {
      promptType: input.target === "keyframe" ? "keyframe-design" : "scene-design",
      location,
      timeOfDay,
      mood,
      aspectRatio,
      hasReferenceAssets: Boolean(input.references?.length),
      hasConsistencyAnchors: anchorAssetIds.length > 0,
    },
  };
}
