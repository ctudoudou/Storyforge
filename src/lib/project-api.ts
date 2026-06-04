import { errorBody, type ApiErrorBody } from "./api-response.ts";
import {
  deleteProject,
  duplicateProject,
  updateProjectExportSettings,
  updateProjectReviewState,
  updateProjectSettings,
  updateProjectTitle,
} from "./db.ts";
import type { ProjectExportSettings, ProjectReviewState, ProjectSettings } from "./types.ts";

export type ApiResult<T> = {
  status: number;
  body: T;
};

export function renameProjectFromBody(
  projectId: string,
  body: { title?: unknown }
): ApiResult<{ project: NonNullable<ReturnType<typeof updateProjectTitle>> } | ApiErrorBody> {
  if (typeof body.title !== "string") {
    return { status: 400, body: errorBody("BAD_REQUEST", "title must be a string") };
  }

  const title = body.title.trim();
  if (!title) {
    return { status: 400, body: errorBody("BAD_REQUEST", "title cannot be empty") };
  }

  const project = updateProjectTitle(projectId, title);
  if (!project) {
    return { status: 404, body: errorBody("NOT_FOUND", "Project not found") };
  }

  return { status: 200, body: { project } };
}

export function updateProjectReviewStateFromBody(
  projectId: string,
  body: { reviewState?: unknown }
): ApiResult<{ project: NonNullable<ReturnType<typeof updateProjectReviewState>> } | ApiErrorBody> {
  if (typeof body.reviewState !== "string") {
    return { status: 400, body: errorBody("BAD_REQUEST", "reviewState must be a string") };
  }

  const reviewState = body.reviewState as ProjectReviewState;
  try {
    const project = updateProjectReviewState(projectId, reviewState);
    if (!project) {
      return { status: 404, body: errorBody("NOT_FOUND", "Project not found") };
    }

    return { status: 200, body: { project } };
  } catch {
    return { status: 400, body: errorBody("BAD_REQUEST", "reviewState is not supported") };
  }
}

export function updateProjectSettingsFromBody(
  projectId: string,
  body: { settings?: unknown }
): ApiResult<{ project: NonNullable<ReturnType<typeof updateProjectSettings>> } | ApiErrorBody> {
  if (!body.settings || typeof body.settings !== "object" || Array.isArray(body.settings)) {
    return { status: 400, body: errorBody("BAD_REQUEST", "settings must be an object") };
  }

  const rawSettings = body.settings as Record<string, unknown>;
  const settings: Partial<ProjectSettings> = {};

  if ("stylePreset" in rawSettings) {
    if (typeof rawSettings.stylePreset !== "string") {
      return { status: 400, body: errorBody("BAD_REQUEST", "stylePreset must be a string") };
    }
    settings.stylePreset = rawSettings.stylePreset as ProjectSettings["stylePreset"];
  }
  if ("aspectRatio" in rawSettings) {
    if (typeof rawSettings.aspectRatio !== "string") {
      return { status: 400, body: errorBody("BAD_REQUEST", "aspectRatio must be a string") };
    }
    settings.aspectRatio = rawSettings.aspectRatio as ProjectSettings["aspectRatio"];
  }
  if ("language" in rawSettings) {
    if (typeof rawSettings.language !== "string") {
      return { status: 400, body: errorBody("BAD_REQUEST", "language must be a string") };
    }
    settings.language = rawSettings.language as ProjectSettings["language"];
  }
  if ("voicePreset" in rawSettings) {
    if (typeof rawSettings.voicePreset !== "string") {
      return { status: 400, body: errorBody("BAD_REQUEST", "voicePreset must be a string") };
    }
    settings.voicePreset = rawSettings.voicePreset as ProjectSettings["voicePreset"];
  }
  if ("targetDurationSeconds" in rawSettings) {
    if (typeof rawSettings.targetDurationSeconds !== "number") {
      return { status: 400, body: errorBody("BAD_REQUEST", "targetDurationSeconds must be a number") };
    }
    settings.targetDurationSeconds = rawSettings.targetDurationSeconds;
  }

  try {
    const project = updateProjectSettings(projectId, settings);
    if (!project) {
      return { status: 404, body: errorBody("NOT_FOUND", "Project not found") };
    }

    return { status: 200, body: { project } };
  } catch {
    return { status: 400, body: errorBody("BAD_REQUEST", "settings contain unsupported values") };
  }
}

export function updateProjectExportSettingsFromBody(
  projectId: string,
  body: { exportSettings?: unknown }
): ApiResult<{ project: NonNullable<ReturnType<typeof updateProjectExportSettings>> } | ApiErrorBody> {
  if (!body.exportSettings || typeof body.exportSettings !== "object" || Array.isArray(body.exportSettings)) {
    return { status: 400, body: errorBody("BAD_REQUEST", "exportSettings must be an object") };
  }

  const rawSettings = body.exportSettings as Record<string, unknown>;
  const exportSettings: Partial<ProjectExportSettings> = {};

  if ("outputFormat" in rawSettings) {
    if (typeof rawSettings.outputFormat !== "string") {
      return { status: 400, body: errorBody("BAD_REQUEST", "outputFormat must be a string") };
    }
    exportSettings.outputFormat = rawSettings.outputFormat as ProjectExportSettings["outputFormat"];
  }
  if ("resolution" in rawSettings) {
    if (typeof rawSettings.resolution !== "string") {
      return { status: 400, body: errorBody("BAD_REQUEST", "resolution must be a string") };
    }
    exportSettings.resolution = rawSettings.resolution as ProjectExportSettings["resolution"];
  }
  if ("frameRate" in rawSettings) {
    if (typeof rawSettings.frameRate !== "number") {
      return { status: 400, body: errorBody("BAD_REQUEST", "frameRate must be a number") };
    }
    exportSettings.frameRate = rawSettings.frameRate as ProjectExportSettings["frameRate"];
  }
  if ("burnInSubtitles" in rawSettings) {
    if (typeof rawSettings.burnInSubtitles !== "boolean") {
      return { status: 400, body: errorBody("BAD_REQUEST", "burnInSubtitles must be a boolean") };
    }
    exportSettings.burnInSubtitles = rawSettings.burnInSubtitles;
  }
  if ("audioMix" in rawSettings) {
    if (typeof rawSettings.audioMix !== "string") {
      return { status: 400, body: errorBody("BAD_REQUEST", "audioMix must be a string") };
    }
    exportSettings.audioMix = rawSettings.audioMix as ProjectExportSettings["audioMix"];
  }

  try {
    const project = updateProjectExportSettings(projectId, exportSettings);
    if (!project) {
      return { status: 404, body: errorBody("NOT_FOUND", "Project not found") };
    }

    return { status: 200, body: { project } };
  } catch {
    return { status: 400, body: errorBody("BAD_REQUEST", "exportSettings contain unsupported values") };
  }
}

export function deleteProjectById(projectId: string): ApiResult<{ ok: true } | ApiErrorBody> {
  const deleted = deleteProject(projectId);
  if (!deleted) {
    return { status: 404, body: errorBody("NOT_FOUND", "Project not found") };
  }

  return { status: 200, body: { ok: true } };
}

export function duplicateProjectById(
  projectId: string
): ApiResult<{ project: NonNullable<ReturnType<typeof duplicateProject>> } | ApiErrorBody> {
  const project = duplicateProject(projectId);
  if (!project) {
    return { status: 404, body: errorBody("NOT_FOUND", "Project not found") };
  }

  return { status: 201, body: { project } };
}
