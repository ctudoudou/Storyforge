import { existsSync, statSync } from "node:fs";
import { join, normalize, sep } from "node:path";

import { assetDir, getProject } from "./db.ts";
import type {
  AssemblyManifest,
  AssemblyManifestAssetReference,
  AssetRecord,
  AudioTrackRecord,
  TimelineClipRecord,
} from "./types";

export class AssemblyManifestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssemblyManifestError";
  }
}

function localAssetPath(asset: AssetRecord) {
  const absolutePath = normalize(join(assetDir, asset.relativePath));
  const normalizedAssetDir = normalize(assetDir);
  if (!absolutePath.startsWith(normalizedAssetDir + sep)) {
    throw new AssemblyManifestError(`Asset path escapes local asset directory: ${asset.relativePath}`);
  }
  if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
    throw new AssemblyManifestError(`Required local asset file is missing: ${asset.relativePath}`);
  }

  return absolutePath;
}

function manifestAsset(asset: AssetRecord): AssemblyManifestAssetReference {
  return {
    assetId: asset.id,
    type: asset.type,
    name: asset.name,
    relativePath: asset.relativePath,
    absolutePath: localAssetPath(asset),
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
  };
}

function requiredClipAsset(clip: TimelineClipRecord) {
  if (!clip.asset) {
    throw new AssemblyManifestError(`Timeline clip requires a linked local asset: ${clip.label}`);
  }
  if (clip.trackType === "video" && !["image", "video"].includes(clip.asset.type)) {
    throw new AssemblyManifestError(`Timeline clip asset must be image or video: ${clip.label}`);
  }

  return manifestAsset(clip.asset);
}

function requiredAudioAsset(track: AudioTrackRecord) {
  if (!track.asset) {
    throw new AssemblyManifestError(`Audio track requires a linked local audio asset: ${track.label}`);
  }
  if (track.asset.type !== "audio") {
    throw new AssemblyManifestError(`Audio track asset must be audio: ${track.label}`);
  }

  return manifestAsset(track.asset);
}

export function createAssemblyManifest(projectId: string): AssemblyManifest | null {
  const project = getProject(projectId);
  if (!project) return null;

  const videoClips = project.timelineClips
    .filter((clip) => clip.trackType === "video")
    .map((clip) => ({
      id: clip.id,
      label: clip.label,
      startMs: clip.startMs,
      durationMs: clip.durationMs,
      asset: requiredClipAsset(clip),
    }));

  if (videoClips.length === 0) {
    throw new AssemblyManifestError("Assembly manifest requires at least one video clip");
  }

  const audioTracks = project.audioTracks.map((track) => ({
    id: track.id,
    label: track.label,
    speaker: track.speaker,
    startMs: track.startMs,
    durationMs: track.durationMs,
    asset: requiredAudioAsset(track),
  }));

  const subtitleTracks = project.subtitleTracks.map((subtitle) => ({
    id: subtitle.id,
    sceneNumber: subtitle.sceneNumber,
    dialogueBlockId: subtitle.dialogueBlockId,
    speaker: subtitle.speaker,
    text: subtitle.text,
    startMs: subtitle.startMs,
    durationMs: subtitle.durationMs,
  }));

  const transitions = project.transitions.map((transition) => ({
    id: transition.id,
    sourceClipId: transition.sourceClipId,
    targetClipId: transition.targetClipId,
    type: transition.type,
    durationMs: transition.durationMs,
  }));

  const durationMs = Math.max(
    ...videoClips.map((clip) => clip.startMs + clip.durationMs),
    ...audioTracks.map((track) => track.startMs + track.durationMs),
    ...subtitleTracks.map((subtitle) => subtitle.startMs + subtitle.durationMs),
    0
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    project: {
      id: project.id,
      title: project.title,
      durationSeconds: Math.ceil(durationMs / 1000),
    },
    timeline: {
      durationMs,
      videoClips,
      audioTracks,
      subtitleTracks,
      transitions,
    },
  };
}
