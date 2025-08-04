import React from 'react';
import { FullscreenViewerProps } from './types';

const FullscreenViewer: React.FC<FullscreenViewerProps> = ({ image, onClose }) => {
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <img src={`file://${image}`} alt="fullscreen" className="max-w-full max-h-full" />
    </div>
  );
};

export default FullscreenViewer;
