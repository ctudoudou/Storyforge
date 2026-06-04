import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  assetDir,
  createProject,
  deleteProject,
  listProjects,
  parseProjectScript,
  registerAsset,
} from "../src/lib/db.ts";

const fixtureTitle = "开发示例：雨夜重逢短剧";
const fixtureScript = `场景1：旧城区咖啡馆 - 夜晚
林夏（28岁，编剧，敏感）在雨声中修改短剧大纲。
顾沉（32岁，制片人，冷静）带着投资合同出现，两人因为三年前的误会再次争执。

场景2：咖啡馆后巷 - 夜晚
林夏发现合同背面夹着母亲的旧照片，意识到顾沉一直在暗中帮她。
顾沉承认自己当年隐瞒真相，是为了保护她的剧本版权。

场景3：天台 - 清晨
两人决定重新合作，把真实经历写成短剧第一集。`;

for (const project of listProjects()) {
  if (project.title === fixtureTitle) {
    deleteProject(project.id);
  }
}

const project = createProject({
  title: fixtureTitle,
  script: fixtureScript,
});

if (!project) {
  throw new Error("Failed to create development fixture project.");
}

const parsedProject = parseProjectScript(project.id);
if (!parsedProject) {
  throw new Error("Failed to parse development fixture project.");
}

const relativeAssetPath = "fixtures/dev-scene-note.txt";
const absoluteAssetPath = join(assetDir, relativeAssetPath);
mkdirSync(dirname(absoluteAssetPath), { recursive: true });
writeFileSync(
  absoluteAssetPath,
  `Storyforge development fixture for ${fixtureTitle}\nProject: ${parsedProject.id}\n`,
  "utf8"
);

const stats = statSync(absoluteAssetPath);
registerAsset({
  type: "other",
  name: "开发 fixture 场景说明",
  relativePath: relativeAssetPath,
  mimeType: "text/plain",
  sizeBytes: stats.size,
});

console.log(`Seeded development fixture project: ${parsedProject.id}`);
console.log(`Registered local fixture asset: ${relativeAssetPath}`);
