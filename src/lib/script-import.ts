const supportedScriptImportExtensions = new Set([".txt", ".md"]);

export function getScriptImportExtension(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  const dotIndex = normalized.lastIndexOf(".");
  return dotIndex >= 0 ? normalized.slice(dotIndex) : "";
}

export function isSupportedScriptImportFileName(fileName: string) {
  return supportedScriptImportExtensions.has(getScriptImportExtension(fileName));
}

export function validateScriptImportFileName(fileName: string) {
  if (!isSupportedScriptImportFileName(fileName)) {
    throw new Error("仅支持导入 .txt 或 .md 剧本文件");
  }
}
