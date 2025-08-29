export interface ImageMetadata {
  shotType: string; // extreme-close | close | medium | wide
  angle: string; // frontal | three-quarter | profile | back | low-angle | high-angle
  lighting: string; // daylight | indoor | night | sunset | studio
  environment: string; // neutral | indoor | outdoor | nature | city | sky
  mood: string; // neutral | smiling | serious | surprised | dreamy | stern | relaxed | contemplative
  action: string; // stand | sit | walk | gesture | hold-object | interact | none
  likeness: {
    score: number; // 0..1 (filled later by insightface, default 1.0)
    ref: string; // reference id (default 'none')
  };
}

export interface ImageSlot {
  path: string;
  caption: string;
  // Optional for backward compatibility with older saved projects; code will hydrate defaults.
  metadata?: ImageMetadata;
}

export const DEFAULT_IMAGE_METADATA: ImageMetadata = {
  shotType: '',
  angle: '',
  lighting: '',
  environment: '',
  mood: '',
  action: '',
  likeness: { score: 1.0, ref: 'none' },
};

export interface Descriptions {
  notes: string;
  faceImageDescription: string;
  clothesImageDescription: string;
  fullBodyClothesDescription: string;
  environmentDescription: string;
  loraTrigger: string;
  subjectAddition: string;
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
  resizeExportImages?: boolean;
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
