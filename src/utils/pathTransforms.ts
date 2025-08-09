import path from 'path';
import url from 'url';
import { ImageSlot } from '../interfaces/types';

export type GridMap = Record<string, (ImageSlot | null)[]>;

// Convert file:// absolute paths in grids to project-relative POSIX-style paths for saving
export function toRelativeGrids(grids: GridMap, projectPath: string): GridMap {
  const result: GridMap = {};
  for (const [section, images] of Object.entries(grids)) {
    result[section] = images.map((imageSlot) => {
      if (imageSlot && imageSlot.path && imageSlot.path.startsWith('file://')) {
        const filePath = url.fileURLToPath(imageSlot.path);
        const relativePath = path.relative(projectPath, filePath).replace(/\\/g, '/');
        return { ...imageSlot, path: relativePath };
      }
      return imageSlot;
    });
  }
  return result;
}

// Convert relative paths in grids to absolute paths using the project directory (no file:// prefix)
export function toAbsoluteGrids(grids: GridMap, projectDir: string): GridMap {
  const result: GridMap = {};
  for (const [section, images] of Object.entries(grids)) {
    result[section] = images.map((imageSlot) => {
      if (
        imageSlot &&
        imageSlot.path &&
        !imageSlot.path.startsWith('file://') &&
        !path.isAbsolute(imageSlot.path)
      ) {
        const absolutePath = path.join(projectDir, imageSlot.path);
        return { ...imageSlot, path: absolutePath };
      }
      return imageSlot;
    });
  }
  return result;
}
