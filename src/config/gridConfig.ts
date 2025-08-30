// Grid configuration and initial state for ProjectPage
// This file centralizes grid section names, initial slot counts, and layout configs
import { ImageSlot } from '../interfaces/types';

// IMPORTANT: When changing slot counts or adding sections, keep backward compatibility
// by ensuring loadProjectData (useProjectPageState) pads existing projects dynamically.
export const GRID_SECTION_CONFIGS: { [section: string]: { cols: number; slots: number } } = {
  'Close Up Head Rotations': { cols: 5, slots: 15 },
  'Close Up Head Emotions': { cols: 5, slots: 15 },
  'Close Up Lighting Variations': { cols: 5, slots: 10 },
  'Close Up Extremes': { cols: 5, slots: 10 },
  'Medium Head Shots': { cols: 5, slots: 30 }, // expanded from 15 -> 30
  'Wide Character Shots': { cols: 5, slots: 35 }, // expanded from 15 -> 35
  'Additional Images': { cols: 5, slots: 40 },
};

export const initialGrids: Record<string, (ImageSlot | null)[]> = Object.fromEntries(
  Object.entries(GRID_SECTION_CONFIGS).map(([section, { slots }]) => [section, Array(slots).fill(null)])
);
