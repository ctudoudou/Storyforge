# Add Job Progress And Cancellation

## Goal

Add real SQLite-backed progress events and cancellation state for long-running image generation and video export jobs.

## Scope

- Extend image generation and video export job records with progress percent, progress message, cancel request time, and canceled time.
- Add progress event tables for image generation jobs and video export jobs.
- Prevent canceled jobs from being overwritten by later completed or failed updates.
- Add agent-level job-created hooks so future task runners can capture job ids and request cancellation.
- Add a local video export cancellation API route.

## Verification

- Migration tests cover new job columns and event tables.
- Image generation tests cover cancellation before provider output is persisted.
- Local export smoke tests cover cancellation during provider execution.
- API route tests cover canceling a local export job.
