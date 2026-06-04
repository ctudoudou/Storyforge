import type { CharacterDesignPrompt, CharacterDesignPromptInput } from "./types.ts";

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
