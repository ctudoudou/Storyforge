import type {
  AgentCharacterRelationship,
  AgentParsedCharacter,
  AgentParsedScene,
  AgentPlotBeat,
  ScriptParserAgentOutput,
  ScriptParserProvider,
} from "./types.ts";

const sceneHeadingPattern = /^场景\s*(\d+)[：:]\s*(.+?)(?:\s*[-－]\s*(.+))?$/;
const characterPattern = /([\u4e00-\u9fa5A-Za-z]{2,12})(?:（([^）]+)）|\(([^)]+)\))/g;

function parseTraits(raw: string): { age: number | null; traits: string[] } {
  const parts = raw
    .split(/[，,、]/)
    .map((part) => part.trim())
    .filter(Boolean);

  let age: number | null = null;
  const traits: string[] = [];

  for (const part of parts) {
    const ageMatch = part.match(/(\d{1,3})\s*岁/);
    if (ageMatch) {
      age = Number(ageMatch[1]);
      continue;
    }
    traits.push(part);
  }

  return { age, traits };
}

function inferPlotBeat(scene: AgentParsedScene): AgentPlotBeat {
  const description = scene.description;

  if (/发现|原来|真相|意识到/.test(description)) {
    return {
      sceneNumber: scene.sceneNumber,
      type: "reversal",
      summary: description.split("\n")[0] || scene.location,
    };
  }

  if (/争执|冲突|威胁|拒绝|误会/.test(description)) {
    return {
      sceneNumber: scene.sceneNumber,
      type: "conflict",
      summary: description.split("\n")[0] || scene.location,
    };
  }

  if (/决定|承诺|选择|合作|离开/.test(description)) {
    return {
      sceneNumber: scene.sceneNumber,
      type: "decision",
      summary: description.split("\n")[0] || scene.location,
    };
  }

  return {
    sceneNumber: scene.sceneNumber,
    type: "setup",
    summary: description.split("\n")[0] || scene.location,
  };
}

function inferRelationships(scenes: AgentParsedScene[]): AgentCharacterRelationship[] {
  const relationshipMap = new Map<string, AgentCharacterRelationship>();

  for (const scene of scenes) {
    if (scene.characters.length < 2) continue;
    for (let index = 0; index < scene.characters.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < scene.characters.length; nextIndex += 1) {
        const source = scene.characters[index];
        const target = scene.characters[nextIndex];
        const key = [source, target].sort().join("::");
        if (relationshipMap.has(key)) continue;

        relationshipMap.set(key, {
          source,
          target,
          relation: "同场互动",
          evidence: scene.description.split("\n")[0] || scene.location,
        });
      }
    }
  }

  return Array.from(relationshipMap.values());
}

export function createFakeScriptParserProvider(): ScriptParserProvider {
  return {
    name: "fake-script-parser",
    parse(input): ScriptParserAgentOutput {
      const lines = input.content.split(/\r?\n/);
      const scenes: AgentParsedScene[] = [];
      const characterMap = new Map<string, AgentParsedCharacter>();
      let currentScene: AgentParsedScene | null = null;

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const sceneMatch = line.match(sceneHeadingPattern);
        if (sceneMatch) {
          currentScene = {
            sceneNumber: Number(sceneMatch[1]),
            location: sceneMatch[2]?.trim() || "未命名场景",
            timeOfDay: sceneMatch[3]?.trim() || "未指定",
            description: "",
            camera: "待设置",
            characters: [],
          };
          scenes.push(currentScene);
          continue;
        }

        if (currentScene) {
          currentScene.description = [currentScene.description, line].filter(Boolean).join("\n");
        }

        for (const match of line.matchAll(characterPattern)) {
          const name = match[1]?.trim();
          const detail = (match[2] || match[3] || "").trim();
          if (!name || name.startsWith("场景")) continue;

          const { age, traits } = parseTraits(detail);
          const existing = characterMap.get(name);
          characterMap.set(name, {
            name,
            age: existing?.age ?? age,
            role: existing?.role || "",
            traits: Array.from(new Set([...(existing?.traits ?? []), ...traits])),
          });

          if (currentScene && !currentScene.characters.includes(name)) {
            currentScene.characters.push(name);
          }
        }
      }

      return {
        characters: Array.from(characterMap.values()),
        scenes,
        relationships: inferRelationships(scenes),
        plotBeats: scenes.map(inferPlotBeat),
      };
    },
  };
}
