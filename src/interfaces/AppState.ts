import { ImageSlot, Descriptions } from './types';

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
