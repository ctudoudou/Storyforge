import { createAssemblyManifest } from "../../lib/assembly-manifest.ts";
import {
  createVideoExportJob,
  exportDir,
  getVideoExportJob,
  getProject,
  recordVideoExportJobProgress,
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

export class VideoExportJobCanceledError extends Error {
  constructor(message = "Video export job was canceled.") {
    super(message);
    this.name = "VideoExportJobCanceledError";
  }
}

export type VideoExportAgentOptions = {
  onJobCreated?: (job: NonNullable<ReturnType<typeof createVideoExportJob>>) => void;
};

function assertVideoExportJobActive(jobId: string) {
  const currentJob = getVideoExportJob(jobId);
  if (currentJob?.status === "canceled" || currentJob?.cancelRequestedAt) {
    throw new VideoExportJobCanceledError();
  }
}

export function exportProjectVideo(
  projectId: string,
  provider: VideoAssemblyProvider = createLocalManifestVideoAssemblyProvider(),
  options: VideoExportAgentOptions = {}
): VideoExportResult | null {
  const project = getProject(projectId);
  if (!project) return null;

  const job = createVideoExportJob({ projectId, tool: provider.name });
  if (!job) {
    throw new VideoAssemblerError("Video export job could not be registered.");
  }

  try {
    options.onJobCreated?.(job);
    updateVideoExportJobStatus({
      jobId: job.id,
      status: "running",
      progressPercent: 5,
      progressMessage: "Video export started.",
    });
    assertVideoExportJobActive(job.id);

    const manifest = createAssemblyManifest(projectId);
    if (!manifest) {
      throw new VideoAssemblerError("Project not found.");
    }
    recordVideoExportJobProgress({
      jobId: job.id,
      progressPercent: 35,
      message: "Assembly manifest created.",
    });
    assertVideoExportJobActive(job.id);

    const output = provider.assemble({
      exportId: job.id,
      manifest,
      outputDir: exportDir,
    });
    assertVideoExportJobActive(job.id);
    const completedJob = updateVideoExportJobStatus({
      jobId: job.id,
      status: "completed",
      outputRelativePath: output.outputRelativePath,
      manifestVersion: manifest.version,
      durationMs: manifest.timeline.durationMs,
      progressMessage: "Video export completed.",
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
    if (!(error instanceof VideoExportJobCanceledError)) {
      updateVideoExportJobStatus({
        jobId: job.id,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Video export failed.",
      });
    }
    throw error;
  }
}
