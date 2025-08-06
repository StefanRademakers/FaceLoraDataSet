import React, { useEffect } from 'react';
import { FullscreenViewerProps } from './types';

const FullscreenViewer: React.FC<FullscreenViewerProps> = ({ image, onClose, onNext, onPrev, onDeleteImage }) => {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        onNext();
      } else if (e.key === 'ArrowLeft') {
        onPrev();
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        // open the image in the file explorer and select it
        if (image) {
          const result = await window.electronAPI.openImageInExplorer(image);
          if (result.success) {
            console.log('Image opened in explorer');
          } else {
            console.error('Failed to open image in explorer:', result.error);
          }
        }
      } else if (e.ctrlKey && e.key === 'c' && image) {
        e.preventDefault(); // Prevent default copy behavior
        const result = await window.electronAPI.copyImageToClipboard(image);
        if (result.success) {
          console.log('Image copied to clipboard');
        } else {
          console.error('Failed to copy image:', result.error);
        }
      } else if (e.key === 'Delete' && image) {
        const userConfirmed = window.confirm('Are you sure you want to delete this image?');
        if (userConfirmed) {
          const result = await window.electronAPI.deleteImage(image);
          if (result.success) {
            console.log('Image deleted from filesystem:', image);
            onDeleteImage(image); // Call the onDeleteImage prop
            onClose(); // Close the fullscreen viewer
          } else {
            console.error('Failed to delete image:', result.error);
            console.error('File path:', image);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onNext, onPrev, onClose, image, onDeleteImage]);

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
