export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function truncatePath(filePath: string, maxLen: number = 60): string {
  if (filePath.length <= maxLen) return filePath;
  const parts = filePath.split('/');
  const fileName = parts.pop()!;
  if (fileName.length >= maxLen - 4) return '...' + fileName.slice(-(maxLen - 3));
  let result = fileName;
  for (let i = parts.length - 1; i >= 0; i--) {
    const next = parts[i] + '/' + result;
    if (next.length > maxLen - 4) {
      return '.../' + result;
    }
    result = next;
  }
  return result;
}
