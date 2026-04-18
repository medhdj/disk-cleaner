import React, { useState, useEffect, useCallback } from 'react';
import DiskStatus from './views/DiskStatus';
import Duplicates from './views/Duplicates';
import LargeFiles from './views/LargeFiles';
import LargeFolders from './views/LargeFolders';
import { formatBytes } from './utils';

type Tab = 'disk-status' | 'duplicates' | 'large-files' | 'large-folders';

interface ScanProgress {
  phase: 'indexing' | 'hashing' | 'done';
  filesScanned: number;
  totalFiles: number;
  currentFile: string;
}

export default function App() {
  const [tab, setTab] = useState<Tab>('disk-status');
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(50); // MB

  useEffect(() => {
    const unsub = window.electronAPI.onScanProgress((p) => setProgress(p));
    return unsub;
  }, []);

  const handlePickFolder = useCallback(async () => {
    const folder = await window.electronAPI.pickFolder();
    if (folder) setSelectedFolder(folder);
  }, []);

  const handleScan = useCallback(async () => {
    if (!selectedFolder) return;
    setScanning(true);
    setScanResult(null);
    setProgress(null);
    const result = await window.electronAPI.startScan(
      selectedFolder,
      threshold * 1024 * 1024
    );
    setScanning(false);
    if (result.error) {
      alert('Scan failed: ' + result.error);
    } else {
      setScanResult(result);
      setTab('disk-status');
    }
  }, [selectedFolder, threshold]);

  const handleStop = useCallback(async () => {
    await window.electronAPI.stopScan();
    setScanning(false);
  }, []);

  const handleTrash = useCallback(
    async (paths: string[]) => {
      const count = paths.length;
      const confirmed = confirm(
        `Are you sure you want to move ${count} file${count > 1 ? 's' : ''} to Trash?\n\nYou can recover them from Trash later.`
      );
      if (!confirmed) return;

      const results = await window.electronAPI.trashFiles(paths);
      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        alert(
          `${results.length - failed.length} moved to Trash.\n${failed.length} failed:\n${failed.map((f) => f.error).join('\n')}`
        );
      }

      // Refresh: remove trashed files from results
      if (scanResult) {
        const trashedSet = new Set(results.filter((r) => r.success).map((r) => r.path));
        setScanResult({
          ...scanResult,
          allFiles: scanResult.allFiles.filter((f: any) => !trashedSet.has(f.path)),
          largeFiles: scanResult.largeFiles.filter((f: any) => !trashedSet.has(f.path)),
          duplicates: scanResult.duplicates
            .map((g: any) => ({
              ...g,
              files: g.files.filter((f: any) => !trashedSet.has(f.path)),
            }))
            .filter((g: any) => g.files.length > 1),
          largeFolders: scanResult.largeFolders,
          totalSize: scanResult.allFiles
            .filter((f: any) => !trashedSet.has(f.path))
            .reduce((acc: number, f: any) => acc + f.size, 0),
          totalFiles: scanResult.totalFiles - trashedSet.size,
        });
      }
    },
    [scanResult]
  );

  const duplicateCount = scanResult?.duplicates?.length ?? 0;
  const largeFileCount = scanResult?.largeFiles?.length ?? 0;
  const largeFolderCount = scanResult?.largeFolders?.length ?? 0;

  return (
    <div className="app">
      {/* Draggable title bar */}
      <div className="titlebar" />

      <header className="header">
        <h1>Disk Cleaner</h1>
        <div className="controls">
          <button className="btn btn-secondary" onClick={handlePickFolder}>
            {selectedFolder ? 'Change Folder' : 'Select Folder'}
          </button>
          {selectedFolder && (
            <span className="folder-path" title={selectedFolder}>
              {selectedFolder}
            </span>
          )}
          <label className="threshold-label">
            Large file threshold:
            <input
              type="number"
              min={1}
              max={10000}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="threshold-input"
            />
            MB
          </label>
          {!scanning ? (
            <button
              className="btn btn-primary"
              onClick={handleScan}
              disabled={!selectedFolder}
            >
              Scan
            </button>
          ) : (
            <button className="btn btn-danger" onClick={handleStop}>
              Stop
            </button>
          )}
        </div>
      </header>

      {/* Progress bar */}
      {scanning && progress && (
        <div className="progress-bar-container">
          <div className="progress-info">
            <span>
              {progress.phase === 'indexing'
                ? `Indexing files: ${progress.filesScanned.toLocaleString()} found`
                : progress.phase === 'hashing'
                ? `Hashing: ${progress.filesScanned}/${progress.totalFiles}`
                : 'Done'}
            </span>
            <span className="progress-file">{progress.currentFile}</span>
          </div>
          {progress.phase === 'hashing' && progress.totalFiles > 0 && (
            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${(progress.filesScanned / progress.totalFiles) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      {scanResult && (
        <>
          <nav className="tabs">
            <button
              className={`tab ${tab === 'disk-status' ? 'active' : ''}`}
              onClick={() => setTab('disk-status')}
            >
              Disk Status
            </button>
            <button
              className={`tab ${tab === 'duplicates' ? 'active' : ''}`}
              onClick={() => setTab('duplicates')}
            >
              Duplicates ({duplicateCount})
            </button>
            <button
              className={`tab ${tab === 'large-files' ? 'active' : ''}`}
              onClick={() => setTab('large-files')}
            >
              Large Files ({largeFileCount})
            </button>
            <button
              className={`tab ${tab === 'large-folders' ? 'active' : ''}`}
              onClick={() => setTab('large-folders')}
            >
              Large Folders ({largeFolderCount})
            </button>
          </nav>

          <main className="content">
            {tab === 'disk-status' && (
              <DiskStatus
                allFiles={scanResult.allFiles}
                largeFiles={scanResult.largeFiles}
                duplicates={scanResult.duplicates}
                totalSize={scanResult.totalSize}
                totalFiles={scanResult.totalFiles}
                onNavigate={(t) => setTab(t as Tab)}
              />
            )}
            {tab === 'duplicates' && (
              <Duplicates groups={scanResult.duplicates} onTrash={handleTrash} />
            )}
            {tab === 'large-files' && (
              <LargeFiles files={scanResult.largeFiles} onTrash={handleTrash} />
            )}
            {tab === 'large-folders' && (
              <LargeFolders folders={scanResult.largeFolders} onTrash={handleTrash} />
            )}
          </main>
        </>
      )}

      {!scanResult && !scanning && (
        <div className="empty-state">
          <div className="empty-icon">&#128269;</div>
          <h2>Select a folder and start scanning</h2>
          <p>Find duplicate files, large files, and reclaim disk space.</p>
        </div>
      )}
    </div>
  );
}
