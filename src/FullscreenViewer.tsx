import React, { useEffect } from 'react';
import { FullscreenViewerProps } from './types';

interface FullscreenViewerProps {
  image: string;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}

const FullscreenViewer: React.FC<FullscreenViewerProps> = ({ image, onClose, onNext, onPrev }) => {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.ctrlKey && e.key === 'c' && image) {
        e.preventDefault(); // Prevent default copy behavior
        const result = await window.electronAPI.copyImageToClipboard(image);
        if (result.success) {
          console.log('Image copied to clipboard');
        } else {
          console.error('Failed to copy image:', result.error);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNext, onPrev, onClose, image]);

  if (!image) return null;

  console.log("Fullscreen image path:", image); // Debug log

  const normalizedImage = image.startsWith("file://") ? image : `file://${image}`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <img src={normalizedImage} alt="fullscreen" className="max-w-full max-h-full" />
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white text-black p-2 rounded-full"
      >
        &lt;
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white text-black p-2 rounded-full"
      >
        &gt;
      </button>
    </div>
  );
};

export default FullscreenViewer;
