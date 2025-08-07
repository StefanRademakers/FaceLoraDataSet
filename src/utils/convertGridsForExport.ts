import { ImageSlot } from "../interfaces/types";

// Type helper to convert grids to the format expected by exportImagesTabToPDF
export function convertGridsForExport(grids: Record<string, (ImageSlot | null)[]>): Record<string, { path: string; caption: string }[]> {
  const result: Record<string, { path: string; caption: string }[]> = {};
  for (const [section, images] of Object.entries(grids)) {
    result[section] = images
      .filter((img): img is ImageSlot => !!img && !!img.path)
      .map((img) => ({ path: img.path, caption: img.caption || '' }));
  }
  return result;
}
