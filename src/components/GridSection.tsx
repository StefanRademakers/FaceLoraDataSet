import React from 'react';
import { ImageSlot } from '../interfaces/types';

interface GridSectionProps {
  title: string;
  cols: number;
  images: (ImageSlot | null)[];
  onDropImage: (slotIndex: number, filePath: string) => void;
  onClickImage: (imagePath: string) => void;
  onCaptionChange: (index: number, caption: string) => void;
  showCaptions: boolean;
}

const GridSection: React.FC<GridSectionProps> = ({ title, cols, images, onClickImage, onCaptionChange, showCaptions }) => {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const gridCols = `grid-cols-${cols}`;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className={`grid ${gridCols} gap-4`}>
        {images.map((imageSlot, index) => (
          <div key={index} className="flex flex-col">
            <div
              data-tile-index={index}
              className="relative w-64 h-64 bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer"
              onDragOver={handleDragOver}
              onClick={() => imageSlot && onClickImage(imageSlot.path)}
            >
              {imageSlot ? (
                <img src={imageSlot.path} alt="" className="object-cover w-full h-full rounded-lg" />
              ) : (
                <span className="text-4xl text-gray-500">+</span>
              )}
            </div>
            {showCaptions && imageSlot && (
              <textarea
                value={imageSlot.caption}
                onChange={(e) => onCaptionChange(index, e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2 mt-2"
                rows={3}
                placeholder="Enter caption..."
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GridSection;
