import React from 'react';
import { FullscreenViewerProps } from './types';

const FullscreenViewer: React.FC<FullscreenViewerProps> = ({ image, onClose }) => {
  if (!image) return null;

  console.log("Fullscreen image path:", image); // Debug log

  const normalizedImage = image.startsWith("file://") ? image : `file://${image}`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <img src={normalizedImage} alt="fullscreen" className="max-w-full max-h-full" />
    </div>
  );
};

export default FullscreenViewer;
