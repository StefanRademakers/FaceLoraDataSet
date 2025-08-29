import { ImageSlot, Descriptions, DEFAULT_IMAGE_METADATA } from './types';

// Canonical app state for a project
export interface AppState {
  version: number;
  projectName: string;
  grids: Record<string, (ImageSlot | null)[]>;
  descriptions: Descriptions;
  promptTemplate: string;
  // Add more fields as needed
}

export const DEFAULT_APP_STATE: AppState = {
  version: 1,
  projectName: '',
  grids: {},
  descriptions: {
    notes: '',
    faceImageDescription: '',
    clothesImageDescription: '',
    fullBodyClothesDescription: '',
    environmentDescription: '',
    loraTrigger: '',
    subjectAddition: '',
  },
  promptTemplate: '',
};

// Utility to ensure an ImageSlot has metadata (used during load/migration)
export function ensureImageSlotMetadata(slot: ImageSlot | null): ImageSlot | null {
  if (!slot) return slot;
  if (!slot.metadata) {
    return { ...slot, metadata: { ...DEFAULT_IMAGE_METADATA } };
  }
  // Ensure likeness sub-object exists
  if (!slot.metadata.likeness) {
    slot.metadata.likeness = { score: 1.0, ref: 'none' };
  }
  return slot;
}
