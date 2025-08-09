// Grid configuration and initial state for ProjectPage
// This file centralizes grid section names, initial slot counts, and layout configs
import { ImageSlot } from '../interfaces/types';

export const GRID_SECTION_CONFIGS: { [section: string]: { cols: number; slots: number } } = {
  'Close Up Head Rotations': { cols: 5, slots: 15 },
  'Close Up Head Emotions': { cols: 5, slots: 15 },
  'Medium Head Shots': { cols: 5, slots: 15 },
  'Wide Character Shots': { cols: 5, slots: 15 },
  'Additional Images': { cols: 5, slots: 40 },
};

export const initialGrids: Record<string, (ImageSlot | null)[]> = Object.fromEntries(
  Object.entries(GRID_SECTION_CONFIGS).map(([section, { slots }]) => [section, Array(slots).fill(null)])
);
