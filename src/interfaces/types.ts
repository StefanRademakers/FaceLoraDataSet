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
  aiToolkitDatasetsPath: string;
}

export interface GridSectionProps {
  title: string;
  cols: number;
  images: (string | null)[];
  onDropImage: (slotIndex: number, filePath: string) => void;
  onClickImage: (imagePath: string) => void;
}

export interface FullscreenViewerProps {
  image: string | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onDeleteImage: (imagePath: string) => void;
}
