import React from 'react';
import { GridSectionProps } from './types';

const GridSection: React.FC<GridSectionProps> = ({ title, cols, images, onDropImage, onClickImage }) => {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  // The drop event is now handled globally by the preload script.
  // This component only needs to handle drag over and click.

  const gridCols = `grid-cols-${cols}`;

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold mb-4">{title}</h2>
      <div className={`grid ${gridCols} gap-4`}>
        {images.map((image, index) => (
          <div
            key={index}
            data-tile-index={index}
            className="relative w-64 h-64 bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer"
            onDragOver={handleDragOver}
            // onDrop is no longer needed here
            onClick={() => image && onClickImage(image)}
          >
            {image ? (
              <img src={image} alt="" className="object-cover w-full h-full rounded-lg" />
            ) : (
              <span className="text-4xl text-gray-500">+</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GridSection;
