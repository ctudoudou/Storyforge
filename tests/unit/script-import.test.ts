import { test } from "node:test";
import assert from "node:assert/strict";

import {
  getScriptImportExtension,
  isSupportedScriptImportFileName,
  validateScriptImportFileName,
} from "../../src/lib/script-import.ts";

test("script import accepts txt and markdown file names", () => {
  assert.equal(isSupportedScriptImportFileName("story.txt"), true);
  assert.equal(isSupportedScriptImportFileName("outline.md"), true);
  assert.equal(isSupportedScriptImportFileName("SCRIPT.TXT"), true);
  assert.equal(getScriptImportExtension("draft.v1.md"), ".md");
});

test("script import rejects unsupported file names", () => {
  assert.equal(isSupportedScriptImportFileName("story.pdf"), false);
  assert.equal(isSupportedScriptImportFileName("story"), false);
  assert.throws(() => validateScriptImportFileName("story.docx"), /仅支持导入 \.txt 或 \.md/);
});
