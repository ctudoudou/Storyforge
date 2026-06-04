export type ParsedCharacter = {
  name: string;
  age: number | null;
  role: string;
  traits: string[];
};

export type ParsedScene = {
  sceneNumber: number;
  location: string;
  timeOfDay: string;
  description: string;
  camera: string;
  characters: string[];
};

export type ParsedScript = {
  characters: ParsedCharacter[];
  scenes: ParsedScene[];
};

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

export function parseScript(content: string): ParsedScript {
  const lines = content.split(/\r?\n/);
  const scenes: ParsedScene[] = [];
  const characterMap = new Map<string, ParsedCharacter>();
  let currentScene: ParsedScene | null = null;

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
  };
}

