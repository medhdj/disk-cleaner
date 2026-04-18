import React, { useState, useRef, useEffect } from 'react';
import { formatBytes, formatDate } from '../utils';

interface FileInfo {
  path: string;
  name: string;
  size: number;
  modifiedAt: number;
}

interface Props {
  files: FileInfo[];
  onTrash: (paths: string[]) => void;
}

export default function LargeFiles({ files, onTrash }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);

  const allCount = files.length;
  const someSelected = selected.size > 0 && selected.size < allCount;
  const allSelected = allCount > 0 && selected.size === allCount;

  // Indeterminate state for master checkbox
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
      setSelected(new Set(files.map((f) => f.path)));
    }
  };

  const trashSelected = () => {
    if (selected.size === 0) return;
    onTrash(Array.from(selected));
    setSelected(new Set());
  };

  if (files.length === 0) {
    return <div className="empty-tab">No large files found above the threshold.</div>;
  }

  const totalSelected = files
    .filter((f) => selected.has(f.path))
    .reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="large-files">
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
            `${selected.size} selected (${formatBytes(totalSelected)})`}
        </span>
        <button
          className="btn btn-danger"
          onClick={trashSelected}
          disabled={selected.size === 0}
        >
          Move {selected.size} to Trash
        </button>
      </div>

      <div className="file-list">
        {files.map((file) => (
          <div
            key={file.path}
            className={`file-row ${selected.has(file.path) ? 'selected' : ''}`}
          >
            <label className="file-checkbox">
              <input
                type="checkbox"
                checked={selected.has(file.path)}
                onChange={() => toggle(file.path)}
              />
            </label>
            <span className="file-name">{file.name}</span>
            <span className="file-size">{formatBytes(file.size)}</span>
            <span className="file-path" title={file.path}>
              {file.path}
            </span>
            <span className="file-date">{formatDate(file.modifiedAt)}</span>
            <button
              className="btn-icon"
              title="Reveal in Finder"
              onClick={() => window.electronAPI.revealInFinder(file.path)}
            >
              &#128194;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
