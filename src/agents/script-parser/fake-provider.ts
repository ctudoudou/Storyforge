import type {
  AgentCharacterRelationship,
  AgentDialogueBlock,
  AgentParsedCharacter,
  AgentParsedScene,
  AgentPlotBeat,
  ScriptParserAgentOutput,
  ScriptParserProvider,
} from "./types.ts";

const sceneHeadingPattern = /^(?:场景|第)\s*([0-9一二三四五六七八九十]+)\s*(?:场|幕|景)?[：:]\s*(.+)$/;
const characterPattern = /([\u4e00-\u9fa5A-Za-z]{2,12})(?:（([^）]+)）|\(([^)]+)\))/g;
const dialoguePattern = /^([\u4e00-\u9fa5A-Za-z]{2,12})[：:]\s*(.+)$/;
const cameraHintPattern = /^(?:镜头|运镜|机位|画面)[：:]\s*(.+)$/;
const moodHintPattern = /^(?:情绪|氛围|气氛|基调)[：:]\s*(.+)$/;
const timeOfDayPattern = /(凌晨|清晨|早晨|上午|中午|午后|下午|傍晚|黄昏|夜晚|深夜|白天|黑夜|雨夜)/;

const chineseNumberMap = new Map([
  ["一", 1],
  ["二", 2],
  ["三", 3],
  ["四", 4],
  ["五", 5],
  ["六", 6],
  ["七", 7],
  ["八", 8],
  ["九", 9],
  ["十", 10],
]);

function parseSceneNumber(raw: string) {
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric;
  if (raw === "十") return 10;
  if (raw.startsWith("十")) return 10 + (chineseNumberMap.get(raw.slice(1)) ?? 0);
  if (raw.endsWith("十")) return (chineseNumberMap.get(raw.slice(0, -1)) ?? 1) * 10;
  if (raw.includes("十")) {
    const [tens, ones] = raw.split("十");
    return (chineseNumberMap.get(tens) ?? 1) * 10 + (chineseNumberMap.get(ones) ?? 0);
  }
  return chineseNumberMap.get(raw) ?? 0;
}

function parseSceneHeading(raw: string) {
  const separators = /\s*(?:[-－—|｜/，,])\s*/;
  const parts = raw.split(separators).map((part) => part.trim()).filter(Boolean);
  const timeOfDay = parts[1] || raw.match(timeOfDayPattern)?.[1] || "未指定";
  const location = parts[0]?.replace(timeOfDayPattern, "").trim();

  return {
    location: location || "未命名场景",
    timeOfDay,
    mood: parts[2] || "",
  };
}

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

  if (/争执|冲突|威胁|拒绝|误会/.test(description)) {
    return {
      sceneNumber: scene.sceneNumber,
      type: "conflict",
      summary: description.split("\n")[0] || scene.location,
    };
  }

  if (/发现|原来|真相|意识到/.test(description)) {
    return {
      sceneNumber: scene.sceneNumber,
      type: "reversal",
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

function inferSceneMood(scene: AgentParsedScene) {
  if (scene.mood) return scene.mood;
  const description = scene.description;
  if (/争执|冲突|威胁|拒绝|误会/.test(description)) return "紧张";
  if (/发现|原来|真相|意识到/.test(description)) return "悬疑";
  if (/决定|承诺|选择|合作|离开/.test(description)) return "释然";
  if (/雨|夜|旧|后巷/.test(`${scene.location}${description}`)) return "压抑";
  return "待定";
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
      const dialogueBlocks: AgentDialogueBlock[] = [];
      const characterMap = new Map<string, AgentParsedCharacter>();
      let currentScene: AgentParsedScene | null = null;
      let dialogueOrder = 0;

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const sceneMatch = line.match(sceneHeadingPattern);
        if (sceneMatch) {
          const heading = parseSceneHeading(sceneMatch[2] ?? "");
          currentScene = {
            sceneNumber: parseSceneNumber(sceneMatch[1]),
            location: heading.location,
            timeOfDay: heading.timeOfDay,
            mood: heading.mood,
            description: "",
            camera: "待设置",
            characters: [],
          };
          scenes.push(currentScene);
          continue;
        }

        const cameraMatch = line.match(cameraHintPattern);
        if (currentScene && cameraMatch) {
          currentScene.camera = cameraMatch[1].trim();
          continue;
        }

        const moodMatch = line.match(moodHintPattern);
        if (currentScene && moodMatch) {
          currentScene.mood = moodMatch[1].trim();
          continue;
        }

        if (currentScene) {
          currentScene.description = [currentScene.description, line].filter(Boolean).join("\n");
          const dialogueMatch = line.match(dialoguePattern);
          if (dialogueMatch) {
            dialogueBlocks.push({
              sceneNumber: currentScene.sceneNumber,
              speaker: dialogueMatch[1].trim(),
              content: dialogueMatch[2].trim(),
              orderIndex: dialogueOrder,
            });
            dialogueOrder += 1;
          }
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

      for (const scene of scenes) {
        scene.mood = inferSceneMood(scene);
      }

      return {
        characters: Array.from(characterMap.values()),
        scenes,
        relationships: inferRelationships(scenes),
        plotBeats: scenes.map(inferPlotBeat),
        dialogueBlocks,
        warnings: [],
      };
    },
  };
}
