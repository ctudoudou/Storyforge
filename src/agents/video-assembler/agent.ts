import { createAssemblyManifest } from "../../lib/assembly-manifest.ts";
import {
  createVideoExportJob,
  exportDir,
  getProject,
  updateVideoExportJobStatus,
} from "../../lib/db.ts";
import { createLocalManifestVideoAssemblyProvider } from "./local-provider.ts";
import type { VideoAssemblyProvider, VideoExportResult } from "./types.ts";

export class VideoAssemblerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoAssemblerError";
  }
}

export function exportProjectVideo(
  projectId: string,
  provider: VideoAssemblyProvider = createLocalManifestVideoAssemblyProvider()
): VideoExportResult | null {
  const project = getProject(projectId);
  if (!project) return null;

  const job = createVideoExportJob({ projectId, tool: provider.name });
  if (!job) {
    throw new VideoAssemblerError("Video export job could not be registered.");
  }

  updateVideoExportJobStatus({ jobId: job.id, status: "running" });

  try {
    const manifest = createAssemblyManifest(projectId);
    if (!manifest) {
      throw new VideoAssemblerError("Project not found.");
    }

    const output = provider.assemble({
      exportId: job.id,
      manifest,
      outputDir: exportDir,
    });
    const completedJob = updateVideoExportJobStatus({
      jobId: job.id,
      status: "completed",
      outputRelativePath: output.outputRelativePath,
      manifestVersion: manifest.version,
      durationMs: manifest.timeline.durationMs,
      errorMessage: null,
    });

    if (!completedJob) {
      throw new VideoAssemblerError("Video export job could not be completed.");
    }

    return {
      job: completedJob,
      output,
    };
  } catch (error) {
    updateVideoExportJobStatus({
      jobId: job.id,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Video export failed.",
    });
    throw error;
  }
}
