import { readFile } from "node:fs/promises";
import { test } from "node:test";
import assert from "node:assert/strict";

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

const agents = [
  {
    name: "script-parser",
    entrypoint: "parseScriptWithAgent",
    provider: "createFakeScriptParserProvider",
    types: ["ScriptParserInput", "ScriptParserAgentOutput", "ScriptParserProvider"],
  },
  {
    name: "character-designer",
    entrypoint: "designCharacter",
    provider: "createFakeCharacterDesignerProvider",
    types: ["CharacterDesignerInput", "CharacterDesignPlan", "CharacterDesignerProvider"],
  },
  {
    name: "scene-designer",
    entrypoint: "designScene",
    provider: "createFakeSceneDesignerProvider",
    types: ["SceneDesignerInput", "SceneDesignPlan", "SceneDesignerProvider"],
  },
  {
    name: "storyboard-planner",
    entrypoint: "planStoryboard",
    provider: "createFakeStoryboardPlannerProvider",
    types: ["StoryboardPlannerInput", "StoryboardPlan", "StoryboardPlannerProvider"],
  },
  {
    name: "asset-generator",
    entrypoint: "generateImageAsset",
    provider: "createFakeImageGenerationProvider",
    types: ["ImageGenerationRequest", "GeneratedImageAsset", "ImageGenerationProvider"],
  },
  {
    name: "video-assembler",
    entrypoint: "exportProjectVideo",
    provider: "createLocalManifestVideoAssemblyProvider",
    types: ["VideoAssemblyRequest", "VideoExportResult", "VideoAssemblyProvider"],
  },
];

test("agent directories expose stable entrypoints, schemas, and test providers", async () => {
  for (const agent of agents) {
    const index = await read(`src/agents/${agent.name}/index.ts`);
    const types = await read(`src/agents/${agent.name}/types.ts`);

    assert.match(index, new RegExp(agent.entrypoint), `${agent.name} should export ${agent.entrypoint}`);
    assert.match(index, new RegExp(agent.provider), `${agent.name} should export ${agent.provider}`);
    for (const typeName of agent.types) {
      assert.match(index, new RegExp(typeName), `${agent.name} index should export ${typeName}`);
      assert.match(types, new RegExp(`type ${typeName}`), `${agent.name} types should define ${typeName}`);
    }
  }
});

test("agent architecture docs list every current agent contract", async () => {
  const docs = await read("docs/agent-architecture.md");

  for (const agent of agents) {
    assert.equal(docs.includes(`\`${agent.name}\``), true, `docs should list ${agent.name}`);
    assert.match(docs, new RegExp(agent.provider), `docs should list ${agent.name} test provider`);
  }
});
