import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import { scanDirectory, isPathProtected, ScanResult } from './scanner';

let currentScanAbort: { aborted: boolean } | null = null;
let lastScanResult: ScanResult | null = null;

export function registerIpcHandlers(mainWindow: BrowserWindow) {
  // Pick a folder to scan
  ipcMain.handle('pick-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select folder to scan',
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // Start scanning
  ipcMain.handle(
    'start-scan',
    async (_event, folderPath: string, largeSizeThreshold: number) => {
      // Abort any previous scan
      if (currentScanAbort) currentScanAbort.aborted = true;
      currentScanAbort = { aborted: false };

      try {
        const result = await scanDirectory(
          folderPath,
          (progress) => {
            mainWindow.webContents.send('scan-progress', progress);
          },
          currentScanAbort,
          largeSizeThreshold
        );
        lastScanResult = result;
        return {
          allFiles: result.allFiles.map((f) => ({
            path: f.path,
            name: f.name,
            size: f.size,
          })),
          duplicates: result.duplicates,
          largeFiles: result.largeFiles,
          largeFolders: result.largeFolders,
          totalSize: result.totalSize,
          totalFiles: result.totalFiles,
        };
      } catch (err: any) {
        return { error: err.message };
      }
    }
  );

  // Stop scanning
  ipcMain.handle('stop-scan', async () => {
    if (currentScanAbort) currentScanAbort.aborted = true;
  });

  // Move files to trash
  ipcMain.handle('trash-files', async (_event, filePaths: string[]) => {
    const results: { path: string; success: boolean; error?: string }[] = [];

    for (const filePath of filePaths) {
      if (isPathProtected(filePath)) {
        results.push({
          path: filePath,
          success: false,
          error: 'Protected system path — cannot delete',
        });
        continue;
      }

      try {
        await shell.trashItem(filePath);
        results.push({ path: filePath, success: true });
      } catch (err: any) {
        results.push({ path: filePath, success: false, error: err.message });
      }
    }

    return results;
  });

  // Reveal file in Finder
  ipcMain.handle('reveal-in-finder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath);
  });
}
