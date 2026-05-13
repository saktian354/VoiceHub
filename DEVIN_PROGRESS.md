# Devin Progress Notes

## Done
- Fixed "Electron API not available" error in "Add New API Key" modal.
  - Root cause: `package.json` has `"type": "module"`, so vite-plugin-electron defaulted to emitting `dist-electron/preload.js` as ESM. Electron's preload loader always uses `require()` for `.js` / `.cjs` files and fails on ESM modules (`require() of ES Module not supported`), so `contextBridge.exposeInMainWorld` never ran and `window.electronAPI` stayed `undefined`. PR #16's `sandbox: false` didn't help because the problem is the script loader, not the sandbox.
  - Fix: build the preload as CommonJS and emit it as `dist-electron/preload.cjs`; point `webPreferences.preload` at the `.cjs` file. See `vite.config.ts:34-52` and `electron/main.ts:23`.
- Fixed `tsc -p tsconfig.electron.json` build break (`import.meta` in CommonJS + axios `ResponseType`):
  - Switched the electron tsconfig to `target/module: ES2022` with `noEmit: true` — it now only typechecks; the actual JS comes from vite. Avoids overwriting vite's ESM `main.js` with broken CJS that conflicted with `type: module`.
  - Typed `responseType: ResponseType` from axios in `electron/main.ts:327`.
- Verified end-to-end:
  - `npm run build` is green (no TS errors, `main.js` ESM, `preload.cjs` CJS).
  - `npm run typecheck` passes.
  - Smoke test: opened Add API Key → Test Connection now shows "Connection successful" (real IPC roundtrip), dashboard stats load, no preload errors in DevTools console.

## In progress
- Waiting on CI for the fix PR (link in chat).

## Todo
- Once the fix PR merges, consider revisiting whether `sandbox: false` (added in PR #16) is still needed — with the CJS preload, sandboxed preload would also work and is the more secure default.
- `TTS.ai` Test Connection returns success for invalid keys because `/v1/voices` is a public list endpoint. Should probably switch to an endpoint that requires real auth (e.g. `/me` or quota endpoint) to make Test Connection meaningful.
- Production `electron-builder` packaging: not yet smoke-tested on this branch; the build pipeline now produces correct artifacts but real packaging on Windows still needs verification.

## Notes & Decisions
- Project is ESM (`type: module`). Keep `main.js` as ESM (uses `import.meta.url`); keep `preload.cjs` as CommonJS (Electron preload loader requires it).
- `vite.config.ts` includes a small inline plugin `voicehub:cleanup-preload-orphans` that deletes the orphan ESM preload artifact that vite emits because `mergeConfig` concatenates `lib.formats` arrays. Don't remove it unless you've also fixed the merge issue another way.
- Electron preload ESM via `.mjs` is supported in Electron 28+ but adds async/init complexity; `.cjs` is simpler and was chosen here.

## Known bugs / blockers
- `git push` from the Devin VM to `saktian354/VoiceHub` via the Devin proxy returns HTTP 403. Fixed for this session by pushing with a fine-grained PAT directly to GitHub. For future sessions, consider re-installing / re-authorizing the Devin GitHub App on `saktian354/VoiceHub` so the proxy push works again.
