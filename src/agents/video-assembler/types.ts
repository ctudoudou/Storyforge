import type { AssemblyManifest, VideoExportJobRecord } from "../../lib/types.ts";

export type VideoAssemblyRequest = {
  exportId: string;
  manifest: AssemblyManifest;
  outputDir: string;
};

export type VideoAssemblyResult = {
  outputRelativePath: string;
  outputAbsolutePath: string;
  sizeBytes: number;
  mimeType: string;
};

export type VideoAssemblyProvider = {
  name: string;
  assemble(request: VideoAssemblyRequest): VideoAssemblyResult;
};

export type VideoExportResult = {
  job: VideoExportJobRecord;
  output: VideoAssemblyResult;
};
