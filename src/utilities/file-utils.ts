export function generateStoragePath(
  basePath: string,
  category: MediaCategory,
  id: string,
  format: string
): string {
  const date = new Date();
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${basePath}/${category}/${year}/${month}/${id}.${format}`;
}

export function generateTempPath(tempDir: string, id: string, format: string): string {
  return `${tempDir}/temp-${id}.${format}`;
}

export function ensureDir(dirPath: string): Promise<void> {
  const fs = require('fs').promises;
  return fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  const fs = require('fs').promises;
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  const fs = require('fs').promises;
  try {
    await fs.unlink(filePath);
  } catch {
    // File may not exist, ignore
  }
}

export async function getFileSize(filePath: string): Promise<number> {
  const fs = require('fs').promises;
  const stats = await fs.stat(filePath);
  return stats.size;
}

export async function copyFile(src: string, dest: string): Promise<void> {
  const fs = require('fs').promises;
  await fs.copyFile(src, dest);
}

export async function renameFile(src: string, dest: string): Promise<void> {
  const fs = require('fs').promises;
  await fs.rename(src, dest);
}

type MediaCategory = 'image' | 'video' | 'audio';
