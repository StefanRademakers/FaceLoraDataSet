import React, { useEffect, useState } from 'react';
import { FullscreenViewerProps } from '../interfaces/types';

const FullscreenViewer: React.FC<FullscreenViewerProps> = ({ image, onClose, onNext, onPrev, onDeleteImage }) => {
  const [cacheBust, setCacheBust] = useState<number>(Date.now());
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && image && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        const direction = 'horizontal'; // Only horizontal flip for now (mirror)
        const target = image.split('?')[0];
        const result = await (window as any).electronAPI.flipImage(target, direction);
        if (result.success) {
          setCacheBust(Date.now());
          console.log('Image flipped');
        } else {
          console.error('Flip failed', result.error);
        }
      } else if (e.key === 'ArrowRight') {
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

  const base = image.split('?')[0];
  const normalizedImage = (base.startsWith('file://') ? base : `file://${base}`) + `?t=${cacheBust}`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1000] pt-4"
      onClick={onClose}
      style={{ backdropFilter: 'blur(2px)' }}
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
