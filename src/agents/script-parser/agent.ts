import { createFakeScriptParserProvider } from "./fake-provider.ts";
import type { ScriptParserAgentOutput, ScriptParserProvider } from "./types.ts";

export type ScriptParserAgentOptions = {
  provider?: ScriptParserProvider;
};

function assertAgentOutput(output: ScriptParserAgentOutput) {
  if (!Array.isArray(output.characters)) {
    throw new Error("Script parser provider returned invalid characters.");
  }
  if (!Array.isArray(output.scenes)) {
    throw new Error("Script parser provider returned invalid scenes.");
  }
  if (!Array.isArray(output.relationships)) {
    throw new Error("Script parser provider returned invalid relationships.");
  }
  if (!Array.isArray(output.plotBeats)) {
    throw new Error("Script parser provider returned invalid plot beats.");
  }
}

export function parseScriptWithAgent(
  content: string,
  options: ScriptParserAgentOptions = {}
): ScriptParserAgentOutput {
  const provider = options.provider ?? createFakeScriptParserProvider();
  const output = provider.parse({ content });
  assertAgentOutput(output);
  return output;
}
