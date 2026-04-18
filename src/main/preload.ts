import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  pickFolder: () => ipcRenderer.invoke('pick-folder'),
  startScan: (folderPath: string, largeSizeThreshold: number) =>
    ipcRenderer.invoke('start-scan', folderPath, largeSizeThreshold),
  stopScan: () => ipcRenderer.invoke('stop-scan'),
  trashFiles: (filePaths: string[]) =>
    ipcRenderer.invoke('trash-files', filePaths),
  revealInFinder: (filePath: string) =>
    ipcRenderer.invoke('reveal-in-finder', filePath),
  onScanProgress: (callback: (progress: any) => void) => {
    const handler = (_event: any, progress: any) => callback(progress);
    ipcRenderer.on('scan-progress', handler);
    return () => ipcRenderer.removeListener('scan-progress', handler);
  },
});
