export {};

interface ElectronAPI {
  pickFolder: () => Promise<string | null>;
  startScan: (folderPath: string, largeSizeThreshold: number) => Promise<any>;
  stopScan: () => Promise<void>;
  trashFiles: (filePaths: string[]) => Promise<{ path: string; success: boolean; error?: string }[]>;
  revealInFinder: (filePath: string) => Promise<void>;
  onScanProgress: (callback: (progress: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
