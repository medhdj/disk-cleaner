import React, { useState, useRef, useEffect } from 'react';
import { formatBytes } from '../utils';

interface FolderInfo {
  path: string;
  name: string;
  size: number;
  fileCount: number;
}

interface Props {
  folders: FolderInfo[];
  onTrash: (paths: string[]) => void;
}

export default function LargeFolders({ folders, onTrash }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const allCount = folders.length;
  const someSelected = selected.size > 0 && selected.size < allCount;
  const allSelected = allCount > 0 && selected.size === allCount;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggle = (path: string) => {
    const next = new Set(selected);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(folders.map((f) => f.path)));
    }
  };

  const trashSelected = () => {
    if (selected.size === 0) return;
    onTrash(Array.from(selected));
    setSelected(new Set());
  };

  if (folders.length === 0) {
    return <div className="empty-tab">No folder data available.</div>;
  }

  const maxSize = folders[0]?.size ?? 1;

  const totalSelectedSize = folders
    .filter((f) => selected.has(f.path))
    .reduce((acc, f) => acc + f.size, 0);

  const totalSelectedFiles = folders
    .filter((f) => selected.has(f.path))
    .reduce((acc, f) => acc + f.fileCount, 0);

  return (
    <div className="large-folders">
      <div className="action-bar">
        <label className="file-checkbox">
          <input
            type="checkbox"
            ref={selectAllRef}
            checked={allSelected}
            onChange={toggleAll}
          />
          Select All
        </label>
        <span className="selection-info">
          {selected.size > 0 &&
            `${selected.size} folders selected (${formatBytes(totalSelectedSize)}, ${totalSelectedFiles.toLocaleString()} files)`}
        </span>
        <button
          className="btn btn-danger"
          onClick={trashSelected}
          disabled={selected.size === 0}
        >
          Move {selected.size} to Trash
        </button>
      </div>

      <div className="folder-list">
        {folders.map((folder) => (
          <div
            key={folder.path}
            className={`folder-row ${selected.has(folder.path) ? 'selected' : ''}`}
          >
            <div className="folder-row-top">
              <label className="file-checkbox">
                <input
                  type="checkbox"
                  checked={selected.has(folder.path)}
                  onChange={() => toggle(folder.path)}
                />
              </label>
              <div className="folder-bar-bg">
                <div
                  className="folder-bar"
                  style={{ width: `${(folder.size / maxSize) * 100}%` }}
                />
              </div>
            </div>
            <div className="folder-info">
              <span className="folder-size">{formatBytes(folder.size)}</span>
              <span className="folder-count">
                {folder.fileCount.toLocaleString()} files
              </span>
              <span className="folder-path" title={folder.path}>
                {folder.path}
              </span>
              <button
                className="btn-icon"
                title="Reveal in Finder"
                onClick={() => window.electronAPI.revealInFinder(folder.path)}
              >
                &#128194;
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
