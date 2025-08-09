import React from 'react';
import { AppState } from '../../interfaces/AppState';
import { GRID_SECTION_CONFIGS } from '../../config/gridConfig';
import GridSection from '../../components/GridSection';
import FullscreenViewer from '../../components/FullscreenViewer';

interface ImagesTabProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  showCaptions: boolean;
  setShowCaptions: (show: boolean) => void;
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
              onDropImage={(slotIndex: number, filePath: string) => handleDropImage(sectionTitle, slotIndex, filePath)}
              onClickImage={handleClickImage}
              onCaptionChange={(index, caption) => handleCaptionChange(sectionTitle, index, caption)}
              showCaptions={showCaptions}
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
