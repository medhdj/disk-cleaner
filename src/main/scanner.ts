import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// System paths that should never be modified
const PROTECTED_PATHS = [
  '/System',
  '/Library',
  '/usr',
  '/bin',
  '/sbin',
  '/private',
  '/etc',
  '/var',
  '/tmp',
  '/dev',
  '/cores',
  '/opt',
  '/Applications/Utilities',
];

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  modifiedAt: number;
  hash?: string;
}

export interface DuplicateGroup {
  hash: string;
  size: number;
  files: FileInfo[];
  totalWasted: number;
}

export interface FolderInfo {
  path: string;
  name: string;
  size: number;
  fileCount: number;
}

export interface ScanProgress {
  phase: 'indexing' | 'hashing' | 'done';
  filesScanned: number;
  totalFiles: number;
  currentFile: string;
  bytesScanned: number;
}

export interface ScanResult {
  allFiles: FileInfo[];
  duplicates: DuplicateGroup[];
  largeFiles: FileInfo[];
  largeFolders: FolderInfo[];
  totalSize: number;
  totalFiles: number;
}

function isProtectedPath(filePath: string): boolean {
  const resolved = path.resolve(filePath);
  return PROTECTED_PATHS.some(
    (p) => resolved === p || resolved.startsWith(p + '/')
  );
}

export function isPathProtected(filePath: string): boolean {
  return isProtectedPath(filePath);
}

async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath, { highWaterMark: 1024 * 1024 });
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

export async function scanDirectory(
  rootPath: string,
  onProgress: (progress: ScanProgress) => void,
  abortSignal?: { aborted: boolean },
  largeSizeThreshold: number = 50 * 1024 * 1024 // 50MB
): Promise<ScanResult> {
  const allFiles: FileInfo[] = [];
  const folderSizes = new Map<string, { size: number; fileCount: number }>();
  let filesScanned = 0;

  // Phase 1: Index all files
  const walk = (dir: string) => {
    if (abortSignal?.aborted) return;
    if (isProtectedPath(dir)) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // Skip dirs we can't read
    }

    for (const entry of entries) {
      if (abortSignal?.aborted) return;
      const fullPath = path.join(dir, entry.name);

      // Skip hidden files/dirs and symlinks
      if (entry.name.startsWith('.')) continue;
      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        try {
          const stat = fs.statSync(fullPath);
          const fileInfo: FileInfo = {
            path: fullPath,
            name: entry.name,
            size: stat.size,
            modifiedAt: stat.mtimeMs,
          };
          allFiles.push(fileInfo);
          filesScanned++;

          // Accumulate folder sizes for all parent dirs up to root
          let parentDir = path.dirname(fullPath);
          while (parentDir.startsWith(rootPath)) {
            const existing = folderSizes.get(parentDir) || { size: 0, fileCount: 0 };
            existing.size += stat.size;
            existing.fileCount += 1;
            folderSizes.set(parentDir, existing);
            if (parentDir === rootPath) break;
            parentDir = path.dirname(parentDir);
          }

          if (filesScanned % 500 === 0) {
            onProgress({
              phase: 'indexing',
              filesScanned,
              totalFiles: filesScanned,
              currentFile: fullPath,
              bytesScanned: 0,
            });
          }
        } catch {
          // Skip files we can't stat
        }
      }
    }
  };

  walk(rootPath);

  onProgress({
    phase: 'indexing',
    filesScanned: allFiles.length,
    totalFiles: allFiles.length,
    currentFile: '',
    bytesScanned: 0,
  });

  // Phase 2: Find duplicates by hashing files with the same size
  const sizeGroups = new Map<number, FileInfo[]>();
  for (const file of allFiles) {
    if (file.size === 0) continue; // Skip empty files
    const group = sizeGroups.get(file.size);
    if (group) group.push(file);
    else sizeGroups.set(file.size, [file]);
  }

  // Only hash files that share a size with at least one other file
  const filesToHash: FileInfo[] = [];
  for (const [, group] of sizeGroups) {
    if (group.length > 1) {
      filesToHash.push(...group);
    }
  }

  let hashProgress = 0;
  const hashGroups = new Map<string, FileInfo[]>();

  for (const file of filesToHash) {
    if (abortSignal?.aborted) break;
    try {
      const hash = await hashFile(file.path);
      file.hash = hash;
      const group = hashGroups.get(hash);
      if (group) group.push(file);
      else hashGroups.set(hash, [file]);
    } catch {
      // Skip files that can't be hashed
    }
    hashProgress++;
    if (hashProgress % 50 === 0) {
      onProgress({
        phase: 'hashing',
        filesScanned: hashProgress,
        totalFiles: filesToHash.length,
        currentFile: file.path,
        bytesScanned: 0,
      });
    }
  }

  // Build duplicate groups
  const duplicates: DuplicateGroup[] = [];
  for (const [hash, files] of hashGroups) {
    if (files.length > 1) {
      duplicates.push({
        hash,
        size: files[0].size,
        files,
        totalWasted: files[0].size * (files.length - 1),
      });
    }
  }
  duplicates.sort((a, b) => b.totalWasted - a.totalWasted);

  // Large files
  const largeFiles = allFiles
    .filter((f) => f.size >= largeSizeThreshold)
    .sort((a, b) => b.size - a.size);

  // Large folders (top 100)
  const largeFolders: FolderInfo[] = Array.from(folderSizes.entries())
    .map(([folderPath, info]) => ({
      path: folderPath,
      name: path.basename(folderPath),
      size: info.size,
      fileCount: info.fileCount,
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 100);

  const totalSize = allFiles.reduce((acc, f) => acc + f.size, 0);

  onProgress({
    phase: 'done',
    filesScanned: allFiles.length,
    totalFiles: allFiles.length,
    currentFile: '',
    bytesScanned: totalSize,
  });

  return {
    allFiles,
    duplicates,
    largeFiles,
    largeFolders,
    totalSize,
    totalFiles: allFiles.length,
  };
}
