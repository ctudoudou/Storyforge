# Storyforge

AI 短剧生成平台。当前版本是从用户提供的 `AI 短剧生成平台.zip` 迁移而来的 Next.js UI 基线。

## Development

```bash
npm install
npm run dev
```

Local URL:

```text
http://localhost:3000
```

## Quality Checks

```bash
npm run test
npm run typecheck
npm run build
```

## Local Data

Storyforge stores local metadata in `data/storyforge.sqlite` and local media assets in `data/assets/`.

The app does not seed mock projects. Use the UI or `POST /api/projects` to create real local projects.

## UI Baseline

The initial UI must follow the supplied reference bundle exactly. Any visual change should be handled through a separate version iteration.
