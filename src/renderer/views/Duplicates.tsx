import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatBytes, formatDate } from '../utils';

interface FileInfo {
  path: string;
  name: string;
  size: number;
  modifiedAt: number;
}

interface DuplicateGroup {
  hash: string;
  size: number;
  files: FileInfo[];
  totalWasted: number;
}

interface Props {
  groups: DuplicateGroup[];
  onTrash: (paths: string[]) => void;
}

type KeepStrategy = 'oldest' | 'newest';

export default function Duplicates({ groups, onTrash }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [keepStrategy, setKeepStrategy] = useState<KeepStrategy>('oldest');
  const selectAllRef = useRef<HTMLInputElement>(null);

  // All file paths across all groups
  const allPaths = groups.flatMap((g) => g.files.map((f) => f.path));
  const allCount = allPaths.length;
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
      setSelected(new Set(allPaths));
    }
  };

  const toggleExpand = (hash: string) => {
    const next = new Set(expanded);
    if (next.has(hash)) next.delete(hash);
    else next.add(hash);
    setExpanded(next);
  };

  const computeAutoSelection = useCallback(
    (strategy: KeepStrategy): Set<string> => {
      const next = new Set<string>();
      for (const group of groups) {
        const sorted = [...group.files].sort(
          (a, b) => a.modifiedAt - b.modifiedAt
        );
        if (strategy === 'oldest') {
          // Keep oldest (first), select the rest
          for (let i = 1; i < sorted.length; i++) {
            next.add(sorted[i].path);
          }
        } else {
          // Keep newest (last), select the rest
          for (let i = 0; i < sorted.length - 1; i++) {
            next.add(sorted[i].path);
          }
        }
      }
      return next;
    },
    [groups]
  );

  const isAutoSelected = useCallback((): boolean => {
    const expected = computeAutoSelection(keepStrategy);
    if (expected.size !== selected.size) return false;
    for (const p of expected) {
      if (!selected.has(p)) return false;
    }
    return true;
  }, [computeAutoSelection, keepStrategy, selected]);

  const handleAutoSelect = () => {
    if (isAutoSelected()) {
      // Toggle off — deselect all
      setSelected(new Set());
    } else {
      setSelected(computeAutoSelection(keepStrategy));
    }
  };

  const trashSelected = () => {
    if (selected.size === 0) return;
    onTrash(Array.from(selected));
    setSelected(new Set());
  };

  if (groups.length === 0) {
    return <div className="empty-tab">No duplicate files found.</div>;
  }

  const totalSelected = groups
    .flatMap((g) => g.files)
    .filter((f) => selected.has(f.path))
    .reduce((acc, f) => acc + f.size, 0);

  return (
    <div className="duplicates">
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
        <div className="auto-select-group">
          <button
            className={`btn ${isAutoSelected() ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleAutoSelect}
          >
            {isAutoSelected() ? 'Deselect duplicates' : 'Auto-select duplicates'}
          </button>
          <select
            className="keep-strategy-select"
            value={keepStrategy}
            onChange={(e) => setKeepStrategy(e.target.value as KeepStrategy)}
          >
            <option value="oldest">Keep oldest</option>
            <option value="newest">Keep newest</option>
          </select>
        </div>
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

      {groups.map((group) => (
        <div key={group.hash} className="duplicate-group">
          <div
            className="group-header"
            onClick={() => toggleExpand(group.hash)}
          >
            <span className="expand-icon">
              {expanded.has(group.hash) ? '▼' : '▶'}
            </span>
            <span className="group-info">
              <strong>{group.files.length} copies</strong> &middot;{' '}
              {formatBytes(group.size)} each &middot;{' '}
              <span className="wasted">
                {formatBytes(group.totalWasted)} wasted
              </span>
            </span>
            <span className="group-name">{group.files[0].name}</span>
          </div>

          {expanded.has(group.hash) && (
            <div className="group-files">
              {group.files.map((file) => (
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
          )}
        </div>
      ))}
    </div>
  );
}
