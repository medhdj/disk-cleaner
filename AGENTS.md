# AGENTS.md

## Package manager
Always use `bun`, never `npm` or `yarn`. `npm` is not installed in this environment.

```bash
bun install          # install deps
bun run <script>     # run any script
```

## Key commands

| Task | Command |
|---|---|
| Dev mode (hot reload) | `bun run dev` |
| Type-check only | `bun run typecheck` |
| Full production build (with obfuscation) | `bun run build` |
| Package .dmg | `bun run dist` |

## Build pipeline order (enforced by `bun run build`)

1. `typecheck` — tsc --noEmit on both main and renderer configs
2. `build:renderer` — Vite bundles React UI into `dist/renderer/`
3. `build:main` — esbuild compiles main process into `dist/main/` (no tsc emit)
4. `obfuscate:main` — javascript-obfuscator runs on `dist/main/*.js`
5. `obfuscate:renderer` — javascript-obfuscator runs on `dist/renderer/assets/index-*.js`

**Never run `tsc -p tsconfig.main.json` to compile** — it is only used for type-checking (`--noEmit`). The actual main process build uses esbuild.

## Two TypeScript configs

- `tsconfig.main.json` — main process (Node.js, CommonJS). `sourceMap: false`.
- `tsconfig.json` — renderer (ESNext, bundler resolution). Used by Vite.

## Project structure

```
src/main/       — Electron main process (Node.js)
  index.ts      — BrowserWindow creation, app lifecycle
  ipc.ts        — All IPC handlers (scan, trash, reveal in Finder)
  preload.ts    — Context bridge — only surface exposed to renderer
  scanner.ts    — File walking, SHA-256 hashing, duplicate detection

src/renderer/   — React UI (Chromium)
  App.tsx       — Tab state, scan orchestration, trash handler
  views/        — One component per tab (DiskStatus, Duplicates, LargeFiles, LargeFolders)
```

## IPC boundary
The renderer has **zero** direct Node.js access. All filesystem operations go through `preload.ts` → `ipc.ts`. When adding new features that touch the filesystem, always add a handler in `ipc.ts` and expose it in `preload.ts` + `src/renderer/electron.d.ts`.

## Protected system paths
Defined as a hardcoded array in `src/main/scanner.ts` (`PROTECTED_PATHS`). The check runs in **both** the scanner (skips indexing) and the IPC trash handler (blocks deletion). If adding new deletion features, always call `isPathProtected()` before any destructive operation.

## Safe deletion only
All deletions use `shell.trashItem()` — never `fs.unlink` or `fs.rm`. This is intentional and must not be changed.

## Scan result shape
`ipc.ts` returns `{ allFiles, duplicates, largeFiles, largeFolders, totalSize, totalFiles }` to the renderer. `allFiles` contains `{ path, name, size }` only (no hash). The renderer derives file type breakdowns from `allFiles` in `DiskStatus.tsx` — no scanner changes needed for UI-only categorization.

## Dist artifacts — what to commit
- ✅ `src/`, `package.json`, `bun.lock`, `tsconfig*.json`, `vite.config.ts`, `*.md`, `demo.gif`, `Disk-Cleaner-*.dmg` (root only)
- ❌ `node_modules/`, `dist/`, `release/`, `*.mov`, `*.mp4`, `*.js.map`, `.DS_Store`

## Git identity
```
user.name  = medhdj
user.email = medhdjdevs@gmail.com
remote     = https://github.com/medhdj/disk-cleaner.git
```

## DMG distribution note
App is unsigned (no Apple Developer certificate). Recipients must run:
```bash
xattr -cr "/Applications/Disk Cleaner.app"
```
Current build targets `arm64` only. Universal build (arm64 + x64) requires changing `package.json` build target to `{ "target": "dmg", "arch": ["universal"] }`.
