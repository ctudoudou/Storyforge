import { createFakeScriptParserProvider } from "./fake-provider.ts";
import { resolveScriptParserProvider } from "../provider-runtime.ts";
import type { ScriptParserAgentOutput, ScriptParserProvider, ScriptParserSection, ScriptParserWarning } from "./types.ts";

export type ScriptParserAgentOptions = {
  provider?: ScriptParserProvider;
};

const parserSections: ScriptParserSection[] = ["characters", "scenes", "relationships", "plotBeats", "dialogueBlocks"];

function normalizeAgentOutput(output: unknown): ScriptParserAgentOutput {
  if (!output || typeof output !== "object") {
    throw new Error("Script parser provider returned unrecoverable output.");
  }

  const record = output as Record<ScriptParserSection | "warnings", unknown>;
  const warnings: ScriptParserWarning[] = Array.isArray(record.warnings)
    ? (record.warnings as ScriptParserWarning[])
    : [];
  const normalized = {} as Record<ScriptParserSection, unknown[]>;

  for (const section of parserSections) {
    const value = record[section];
    if (Array.isArray(value)) {
      normalized[section] = value;
      continue;
    }

    normalized[section] = [];
    warnings.push({
      section,
      message: `Script parser provider returned invalid ${section}; this section was skipped.`,
    });
  }

  return {
    characters: normalized.characters as ScriptParserAgentOutput["characters"],
    scenes: normalized.scenes as ScriptParserAgentOutput["scenes"],
    relationships: normalized.relationships as ScriptParserAgentOutput["relationships"],
    plotBeats: normalized.plotBeats as ScriptParserAgentOutput["plotBeats"],
    dialogueBlocks: normalized.dialogueBlocks as ScriptParserAgentOutput["dialogueBlocks"],
    warnings,
  };
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return Boolean(value && typeof (value as Promise<unknown>).then === "function");
}

export function parseScriptWithAgent(
  content: string,
  options: ScriptParserAgentOptions = {}
): ScriptParserAgentOutput {
  const provider = options.provider ?? createFakeScriptParserProvider();
  const output = provider.parse({ content });
  if (isPromiseLike(output)) {
    throw new Error("Script parser provider returned an async result; use parseScriptWithRuntimeAgent.");
  }
  return normalizeAgentOutput(output);
}

export async function parseScriptWithRuntimeAgent(
  content: string,
  options: ScriptParserAgentOptions = {}
): Promise<ScriptParserAgentOutput> {
  const provider = options.provider ?? await resolveScriptParserProvider() ?? createFakeScriptParserProvider();
  const output = await provider.parse({ content });
  return normalizeAgentOutput(output);
}
