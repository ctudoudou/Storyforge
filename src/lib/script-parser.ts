import { parseScriptWithAgent } from "../agents/script-parser/index.ts";
import type { AgentParsedCharacter, AgentParsedScene } from "../agents/script-parser/index.ts";

export type ParsedCharacter = AgentParsedCharacter;

export type ParsedScene = AgentParsedScene;

export type ParsedScript = {
  characters: ParsedCharacter[];
  scenes: ParsedScene[];
};

export function parseScript(content: string): ParsedScript {
  const parsed = parseScriptWithAgent(content);
  return {
    characters: parsed.characters,
    scenes: parsed.scenes,
  };
}
