export interface ImageSlot {
  path: string;
  caption: string;
}

export interface Descriptions {
  notes: string;
  faceImageDescription: string;
  clothesImageDescription: string;
  fullBodyClothesDescription: string;
  environmentDescription: string;
  loraTrigger: string;
}

export interface ProjectData {
  projectName: string;
  grids: Record<string, (ImageSlot | null)[]>;
  descriptions: Descriptions;
}

// Settings interface for app settings page
export interface AppSettings {
  loraDataRoot: string;
}
