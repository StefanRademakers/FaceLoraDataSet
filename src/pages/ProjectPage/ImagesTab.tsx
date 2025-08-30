import React from 'react';
import Button from '@mui/material/Button';
import { AppState } from '../../interfaces/AppState';
import { GRID_SECTION_CONFIGS } from '../../config/gridConfig';
import GridSection from '../../components/GridSection';
import FullscreenViewer from '../../components/FullscreenViewer';

interface ImagesTabProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  showCaptions: boolean;
  setShowCaptions: (show: boolean) => void;
  showMetadata: boolean;
  setShowMetadata: (show: boolean) => void;
  showEmptySlots: boolean;
  fullscreenImage: string | null;
  setFullscreenImage: (img: string | null) => void;
  allImages: string[];
  setAllImages: (imgs: string[]) => void;
  currentImageIndex: number | null;
  setCurrentImageIndex: (idx: number | null) => void;
  handleDropImage: (section: string, slotIndex: number, filePath: string) => void;
  handleClickImage: (imagePath: string) => void;
  handleCaptionChange: (section: string, index: number, caption: string) => void;
  handleCloseFullscreen: () => void;
  handleNextImage: () => void;
  handlePrevImage: () => void;
  handleDeleteImage: (imagePath: string) => void;
}

const ImagesTab: React.FC<ImagesTabProps> = ({
  appState,
  setAppState,
  showCaptions,
  setShowCaptions,
  showMetadata,
  setShowMetadata,
  showEmptySlots,
  fullscreenImage,
  setFullscreenImage,
  allImages,
  setAllImages,
  currentImageIndex,
  setCurrentImageIndex,
  handleDropImage,
  handleClickImage,
  handleCaptionChange,
  handleCloseFullscreen,
  handleNextImage,
  handlePrevImage,
  handleDeleteImage,
}) => {
  return (
    <>
      <div className="mb-4">
        {/* Project stats */}
        <div className="mb-4 text-sm text-gray-300">
          {(() => {
            let total = 0; let withCaption = 0;
            for (const arr of Object.values(appState.grids)) {
              for (const slot of arr) {
                if (slot && slot.path) {
                  total++;
                  if (slot.caption && slot.caption.trim().length > 0) withCaption++;
                }
              }
            }
            return `Images: ${withCaption}/${total} captioned`;
          })()}
        </div>
        <div>
          {/* ...Switch, TextFields, etc. can be added here or in parent */}
          {showCaptions && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={() => {
                if (!window.confirm('Clear ALL captions in every section? This cannot be undone. Continue?')) return;
                setAppState(prev => {
                  const newGrids: typeof prev.grids = {} as any;
                  for (const [section, slots] of Object.entries(prev.grids)) {
                    newGrids[section] = slots.map(slot => slot ? { ...slot, caption: '' } : slot);
                  }
                  const updated = { ...prev, grids: newGrids };
                  window.electronAPI.saveProject(updated);
                  return updated;
                });
              }}
              sx={{ mb: 2, borderColor: '#f44336', color: '#f44336', ml: 1 }}
            >
              Clear Captions
            </Button>
          )}
          {showMetadata && (
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={() => {
                if (!window.confirm('Clear ALL metadata in every section? This cannot be undone. Continue?')) return;
                setAppState(prev => {
                  const newGrids: typeof prev.grids = {} as any;
                  for (const [section, slots] of Object.entries(prev.grids)) {
                    newGrids[section] = slots.map(slot => slot ? { ...slot, metadata: { ...slot.metadata, shotType: '', angle: '', lighting: '', environment: '', mood: '', action: '', likeness: { score: 1.0, ref: 'none' } } } : slot);
                  }
                  const updated = { ...prev, grids: newGrids };
                  window.electronAPI.saveProject(updated);
                  return updated;
                });
              }}
              sx={{ mb: 2, borderColor: '#f44336', color: '#f44336', ml: 1 }}
            >
              Clear Metadata
            </Button>
          )}
        </div>
      </div>
      {Object.entries(appState.grids).map(([sectionTitle, images]) => {
        let total = 0; let withCaption = 0;
        for (const slot of images) {
          if (slot && slot.path) {
            total++;
            if (slot.caption && slot.caption.trim().length > 0) withCaption++;
          }
        }
        const displayTitle = `${sectionTitle}: Images: ${withCaption}/${total} captioned`;
        return (
          <div key={sectionTitle} data-section-title={sectionTitle}>
            <GridSection
              title={displayTitle}
              cols={GRID_SECTION_CONFIGS[sectionTitle].cols}
              loraTrigger={appState.descriptions.loraTrigger}
              subjectAddition={appState.descriptions.subjectAddition}
              promptTemplate={appState.promptTemplate}
              images={images}
              showEmptySlots={showEmptySlots}
              onDropImage={(slotIndex: number, filePath: string) => handleDropImage(sectionTitle, slotIndex, filePath)}
              onClickImage={handleClickImage}
              onCaptionChange={(index, caption) => handleCaptionChange(sectionTitle, index, caption)}
              showCaptions={showCaptions}
              showMetadata={showMetadata}
              onMetadataChange={(index, metadata) => {
                setAppState(prev => {
                  const newGrids = { ...prev.grids };
                  const newImages = [...newGrids[sectionTitle]];
                  const imageSlot = newImages[index];
                  if (imageSlot) {
                    newImages[index] = { ...imageSlot, metadata: { ...imageSlot.metadata, ...metadata } } as any;
                    newGrids[sectionTitle] = newImages;
                    const updated = { ...prev, grids: newGrids };
                    window.electronAPI.saveProject(updated);
                    return updated;
                  }
                  return prev;
                });
              }}
            />
          </div>
        );
      })}
      <FullscreenViewer 
        image={fullscreenImage || ''} 
        onClose={handleCloseFullscreen}
        onNext={handleNextImage}
        onPrev={handlePrevImage}
        onDeleteImage={handleDeleteImage}
      />
    </>
  );
};

export default ImagesTab;
