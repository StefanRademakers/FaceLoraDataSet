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
}
