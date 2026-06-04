import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { VideoAssemblyProvider } from "./types.ts";

export function createLocalManifestVideoAssemblyProvider(): VideoAssemblyProvider {
  return {
    name: "local-manifest-assembler",
    assemble(request) {
      const outputRelativePath = `${request.manifest.project.id}/${request.exportId}.storyforge-export.json`;
      const outputAbsolutePath = join(request.outputDir, outputRelativePath);
      mkdirSync(join(request.outputDir, request.manifest.project.id), { recursive: true });

      const artifact = {
        format: "storyforge.local-video-export",
        formatVersion: 1,
        generatedAt: new Date().toISOString(),
        project: request.manifest.project,
        timeline: {
          durationMs: request.manifest.timeline.durationMs,
          videoClipCount: request.manifest.timeline.videoClips.length,
          audioTrackCount: request.manifest.timeline.audioTracks.length,
          subtitleTrackCount: request.manifest.timeline.subtitleTracks.length,
          transitionCount: request.manifest.timeline.transitions.length,
        },
        manifest: request.manifest,
      };

      writeFileSync(outputAbsolutePath, `${JSON.stringify(artifact, null, 2)}\n`);
      const stats = statSync(outputAbsolutePath);

      return {
        outputRelativePath,
        outputAbsolutePath,
        sizeBytes: stats.size,
        mimeType: "application/vnd.storyforge.local-video-export+json",
      };
    },
  };
}
