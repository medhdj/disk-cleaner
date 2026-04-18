# Disk Cleaner

A lightweight macOS desktop app to find duplicate files, large files, and reclaim disk space. Built with Electron + React + TypeScript.

## Features

- **Disk Status dashboard** — visual breakdown of disk usage by file type (Videos, Images, Archives, Documents, Audio, Code)
- **Duplicate detection** — finds real duplicates using SHA-256 content hashing (not just file names)
- **Large files finder** — configurable size threshold, sorted by size
- **Large folders finder** — top folders ranked by total size
- **Safe deletion** — all deletions go to macOS Trash (fully recoverable)
- **Protected system paths** — `/System`, `/Library`, `/usr`, `/bin`, etc. are blocked from scanning and deletion
- **Obfuscated build** — source code is minified and obfuscated in the distributed app

## Screenshots

_(coming soon)_

## Requirements

- macOS 10.13+
- [Bun](https://bun.sh/) (package manager and runtime)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/medhdj/disk-cleaner.git
cd disk-cleaner
```

### 2. Install dependencies

```bash
bun install
```

### 3. Run in development mode

```bash
bun run dev
```

This starts the Vite dev server (renderer) and TypeScript watcher (main process) concurrently. The Electron app will open with hot reload enabled.

### 4. Build the .dmg

```bash
bun run dist
```

This runs the full pipeline:

1. **Type-check** — validates TypeScript across both main and renderer
2. **Build renderer** — Vite bundles and minifies the React UI
3. **Build main** — esbuild compiles and minifies the Electron main process
4. **Obfuscate main** — javascript-obfuscator encrypts identifiers and strings
5. **Obfuscate renderer** — same treatment on the frontend bundle
6. **Package** — electron-builder produces the `.dmg` file

The output is at:

```
release/Disk Cleaner-1.0.0-arm64.dmg
```

## Installing on a Mac

1. Open the `.dmg` file
2. Drag **Disk Cleaner** into your **Applications** folder
3. The app is unsigned (no paid Apple Developer certificate), so macOS Gatekeeper will block it on first launch. To fix this, open Terminal and run:

```bash
xattr -cr "/Applications/Disk Cleaner.app"
```

4. Open the app normally

## Project Structure

```
disk-cleaner/
├── src/
│   ├── main/                  # Electron main process (Node.js)
│   │   ├── index.ts           # App entry point, window creation
│   │   ├── ipc.ts             # IPC handlers (scan, trash, reveal)
│   │   ├── preload.ts         # Context bridge for renderer
│   │   └── scanner.ts         # File system scanner + SHA-256 hashing
│   └── renderer/              # React UI (Chromium)
│       ├── App.tsx             # Main app shell, tabs, state
│       ├── main.tsx            # React entry point
│       ├── styles.css          # All styles
│       ├── utils.ts            # Formatting helpers
│       ├── electron.d.ts       # TypeScript types for the preload bridge
│       ├── index.html          # HTML entry point
│       └── views/
│           ├── DiskStatus.tsx   # Dashboard: type breakdown, top files
│           ├── Duplicates.tsx   # Duplicate groups with auto-select
│           ├── LargeFiles.tsx   # Large files list with checkboxes
│           └── LargeFolders.tsx # Large folders list with checkboxes
├── package.json
├── tsconfig.json               # Renderer TypeScript config
├── tsconfig.main.json          # Main process TypeScript config
└── vite.config.ts              # Vite config for renderer
```

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 28 |
| UI | React 18 + TypeScript |
| Bundler (renderer) | Vite 5 |
| Bundler (main) | esbuild |
| Duplicate detection | Node.js crypto (SHA-256 streaming) |
| Code protection | javascript-obfuscator |
| Packaging | electron-builder |

## License

See [LICENSE](LICENSE) file.
