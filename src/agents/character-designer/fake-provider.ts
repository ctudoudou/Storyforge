import type { CharacterDesignerProvider } from "./types.ts";

function joinTraits(traits: string[]) {
  return traits.length ? traits.join("、") : "待补充";
}

export function createFakeCharacterDesignerProvider(): CharacterDesignerProvider {
  return {
    name: "fake-character-designer",
    model: "fake-character-designer-v1",
    designCharacter(context) {
      const role = context.character.role || "待定角色";
      const traits = joinTraits(context.character.traits);
      const consistencyNotes = context.visualConsistency.notes || "保持五官、发型、年龄感和服装识别度稳定";

      return {
        provider: "fake-character-designer",
        model: "fake-character-designer-v1",
        visualBrief: [
          `${context.character.name}是${context.projectTitle}中的${role}。`,
          `角色气质：${traits}。`,
          `造型连续性：${consistencyNotes}。`,
        ].join("\n"),
        consistencyChecklist: [
          "保持面部识别度",
          "保持发型和年龄感",
          "保持服装主色和关键道具",
        ],
        metadata: {
          fake: true,
          characterId: context.character.id,
          anchorAssetIds: context.visualConsistency.anchorAssetIds,
        },
      };
    },
  };
}
