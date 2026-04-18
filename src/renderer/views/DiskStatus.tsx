import React, { useMemo } from 'react';
import { formatBytes } from '../utils';

interface SimpleFile {
  path: string;
  name: string;
  size: number;
}

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
  allFiles: SimpleFile[];
  largeFiles: FileInfo[];
  duplicates: DuplicateGroup[];
  totalSize: number;
  totalFiles: number;
  onNavigate: (tab: string) => void;
}

// File type categories by extension
const CATEGORY_MAP: Record<string, string> = {};
const CATEGORIES = [
  {
    name: 'Videos',
    color: '#4fc3f7',
    extensions: ['mp4', 'mov', 'avi', 'mkv', 'm4v', 'wmv', 'flv', 'webm', 'mpg', 'mpeg', '3gp'],
  },
  {
    name: 'Images',
    color: '#66bb6a',
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'heic', 'heif', 'svg', 'raw', 'cr2', 'nef', 'ico', 'psd'],
  },
  {
    name: 'Archives',
    color: '#ffb74d',
    extensions: ['zip', 'tar', 'gz', 'tgz', 'bz2', 'rar', '7z', 'dmg', 'iso', 'pkg', 'xz', 'lz', 'cab', 'deb', 'rpm'],
  },
  {
    name: 'Documents',
    color: '#ba68c8',
    extensions: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'odt', 'ods', 'odp', 'pages', 'numbers', 'keynote', 'csv', 'epub', 'md'],
  },
  {
    name: 'Audio',
    color: '#f06292',
    extensions: ['mp3', 'wav', 'aac', 'flac', 'm4a', 'ogg', 'wma', 'aiff', 'alac', 'opus', 'mid', 'midi'],
  },
  {
    name: 'Code',
    color: '#4db6ac',
    extensions: ['js', 'ts', 'tsx', 'jsx', 'py', 'swift', 'java', 'c', 'cpp', 'h', 'hpp', 'go', 'rb', 'php', 'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml', 'sh', 'bash', 'rs', 'kt', 'dart', 'lua', 'sql', 'r', 'vue', 'svelte'],
  },
];

// Build the lookup map
for (const cat of CATEGORIES) {
  for (const ext of cat.extensions) {
    CATEGORY_MAP[ext] = cat.name;
  }
}

function getCategory(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex === -1) return 'Other';
  const ext = fileName.slice(dotIndex + 1).toLowerCase();
  return CATEGORY_MAP[ext] || 'Other';
}

interface CategoryData {
  name: string;
  color: string;
  size: number;
  count: number;
  percentage: number;
}

export default function DiskStatus({
  allFiles,
  largeFiles,
  duplicates,
  totalSize,
  totalFiles,
  onNavigate,
}: Props) {
  const wastedSpace = useMemo(
    () => duplicates.reduce((acc, g) => acc + g.totalWasted, 0),
    [duplicates]
  );

  const categoryData = useMemo((): CategoryData[] => {
    const map = new Map<string, { size: number; count: number }>();

    for (const file of allFiles) {
      const cat = getCategory(file.name);
      const existing = map.get(cat) || { size: 0, count: 0 };
      existing.size += file.size;
      existing.count += 1;
      map.set(cat, existing);
    }

    // Build results in the order of CATEGORIES, then Other
    const results: CategoryData[] = [];
    for (const cat of CATEGORIES) {
      const data = map.get(cat.name);
      if (data && data.size > 0) {
        results.push({
          name: cat.name,
          color: cat.color,
          size: data.size,
          count: data.count,
          percentage: totalSize > 0 ? (data.size / totalSize) * 100 : 0,
        });
      }
    }
    const otherData = map.get('Other');
    if (otherData && otherData.size > 0) {
      results.push({
        name: 'Other',
        color: '#90a4ae',
        size: otherData.size,
        count: otherData.count,
        percentage: totalSize > 0 ? (otherData.size / totalSize) * 100 : 0,
      });
    }

    return results;
  }, [allFiles, totalSize]);

  const top10Files = useMemo(
    () => largeFiles.slice(0, 10),
    [largeFiles]
  );

  const top5Duplicates = useMemo(
    () => duplicates.slice(0, 5),
    [duplicates]
  );

  return (
    <div className="disk-status">
      {/* Section 1 — Overview Cards */}
      <div className="status-cards">
        <div className="status-card">
          <span className="status-card-value">{formatBytes(totalSize)}</span>
          <span className="status-card-label">Total Scanned</span>
        </div>
        <div className="status-card">
          <span className="status-card-value">{totalFiles.toLocaleString()}</span>
          <span className="status-card-label">Total Files</span>
        </div>
        <div className="status-card warn">
          <span className="status-card-value">{formatBytes(wastedSpace)}</span>
          <span className="status-card-label">Duplicate Waste</span>
        </div>
        <div className="status-card warn">
          <span className="status-card-value">{duplicates.length}</span>
          <span className="status-card-label">Duplicate Groups</span>
        </div>
      </div>

      {/* Section 2 — File Type Breakdown */}
      <div className="status-section">
        <h2 className="status-section-title">File Type Breakdown</h2>

        {/* Stacked bar */}
        <div className="type-bar">
          {categoryData.map((cat) => (
            <div
              key={cat.name}
              className="type-bar-segment"
              style={{
                width: `${Math.max(cat.percentage, 0.5)}%`,
                backgroundColor: cat.color,
              }}
              title={`${cat.name}: ${formatBytes(cat.size)} (${cat.percentage.toFixed(1)}%)`}
            />
          ))}
        </div>

        {/* Legend table */}
        <div className="type-legend">
          {categoryData.map((cat) => (
            <div key={cat.name} className="type-legend-row">
              <span
                className="type-legend-dot"
                style={{ backgroundColor: cat.color }}
              />
              <span className="type-legend-name">{cat.name}</span>
              <span className="type-legend-bar-bg">
                <span
                  className="type-legend-bar-fill"
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </span>
              <span className="type-legend-size">{formatBytes(cat.size)}</span>
              <span className="type-legend-pct">
                {cat.percentage.toFixed(1)}%
              </span>
              <span className="type-legend-count">
                {cat.count.toLocaleString()} files
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — Top 10 Largest Files */}
      <div className="status-section">
        <h2 className="status-section-title">Top 10 Largest Files</h2>
        {top10Files.length === 0 ? (
          <p className="status-empty">No large files found.</p>
        ) : (
          <>
            <div className="mini-list">
              {top10Files.map((file, i) => (
                <div key={file.path} className="mini-list-row">
                  <span className="mini-list-rank">{i + 1}</span>
                  <span className="mini-list-name">{file.name}</span>
                  <span className="mini-list-size">{formatBytes(file.size)}</span>
                  <span className="mini-list-path" title={file.path}>
                    {file.path}
                  </span>
                </div>
              ))}
            </div>
            <button
              className="view-all-link"
              onClick={() => onNavigate('large-files')}
            >
              View all {largeFiles.length} large files &rarr;
            </button>
          </>
        )}
      </div>

      {/* Section 4 — Top 5 Duplicate Groups */}
      <div className="status-section">
        <h2 className="status-section-title">Top Duplicate Groups</h2>
        {top5Duplicates.length === 0 ? (
          <p className="status-empty">No duplicates found.</p>
        ) : (
          <>
            <div className="mini-list">
              {top5Duplicates.map((group, i) => (
                <div key={group.hash} className="mini-list-row">
                  <span className="mini-list-rank">{i + 1}</span>
                  <span className="mini-list-name">{group.files[0].name}</span>
                  <span className="mini-list-copies">
                    {group.files.length} copies
                  </span>
                  <span className="mini-list-wasted">
                    {formatBytes(group.totalWasted)} wasted
                  </span>
                </div>
              ))}
            </div>
            <button
              className="view-all-link"
              onClick={() => onNavigate('duplicates')}
            >
              View all {duplicates.length} duplicate groups &rarr;
            </button>
          </>
        )}
      </div>
    </div>
  );
}
