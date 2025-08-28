import React from 'react';
import { ImageSlot } from '../interfaces/types';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

interface GridSectionProps {
  title: string;
  cols: number;
  // LoRA trigger token for auto captioning
  loraTrigger: string;
  subjectAddition: string;
  promptTemplate?: string;
  images: (ImageSlot | null)[];
  onDropImage: (slotIndex: number, filePath: string) => void;
  onClickImage: (imagePath: string) => void;
  onCaptionChange: (index: number, caption: string) => void;
  showCaptions: boolean;
}

const GridSection: React.FC<GridSectionProps> = ({ title, cols, loraTrigger, subjectAddition, promptTemplate, images, onClickImage, onCaptionChange, showCaptions }) => {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const gridCols = `grid-cols-${cols}`;

  const [bulkRunning, setBulkRunning] = React.useState(false);

  const missingCount = React.useMemo(() => {
    return images.reduce((acc, slot) => acc + (slot && (!slot.caption || slot.caption.trim().length === 0) ? 1 : 0), 0);
  }, [images]);

  const handleBulkCaption = async () => {
    if (bulkRunning) return;
    setBulkRunning(true);
    try {
      for (let i = 0; i < images.length; i++) {
        const slot = images[i];
        if (!slot) continue;
        if (slot.caption && slot.caption.trim().length > 0) continue;
        try {
          const caption: string = await window.electronAPI.autoGenerateCaption(slot.path, loraTrigger, subjectAddition, promptTemplate);
          onCaptionChange(i, caption);
        } catch (err) {
          console.error('Bulk caption error for index', i, err);
        }
      }
    } finally {
      setBulkRunning(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <h2 className="text-2xl font-bold">{title}</h2>
        {showCaptions && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleBulkCaption}
            disabled={bulkRunning || missingCount === 0}
            startIcon={!bulkRunning ? <AutoAwesomeIcon /> : undefined}
            sx={{ minWidth: 220 }}
          >
            {bulkRunning ? (
              <><CircularProgress size={18} sx={{ mr: 1 }} /> Captioning...</>
            ) : (
              missingCount === 0 ? 'All captioned' : `Auto caption ${missingCount} missing`
            )}
          </Button>
        )}
      </div>
      <div className={`grid ${gridCols} gap-4`}>
        {images.map((imageSlot, index) => (
          <div key={index} className="flex flex-col">
            <div
              data-tile-index={index}
              className="relative w-64 h-64 bg-gray-800 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden"
              onDragOver={handleDragOver}
              onClick={() => imageSlot && onClickImage(imageSlot.path)}
            >
              {imageSlot ? (
                <img
                  src={imageSlot.path}
                  alt=""
                  className="max-w-full max-h-full object-contain select-none"
                  style={{
                    // Ensure image centers and respects aspect ratio with transparent padding around
                    objectPosition: 'center center',
                    pointerEvents: 'none'
                  }}
                />
              ) : (
                <span className="text-4xl text-gray-500">+</span>
              )}
            </div>
            {showCaptions && imageSlot && (
              <TextField
                value={imageSlot.caption}
                onChange={(e) => onCaptionChange(index, e.target.value)}
                fullWidth
                multiline
                minRows={3}
                variant="outlined"
                placeholder="Enter caption..."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => {
                          console.log('GridSection: autoGenerateCaption args:', { path: imageSlot.path, loraTrigger, subjectAddition });
                          window.electronAPI.autoGenerateCaption(imageSlot.path, loraTrigger, subjectAddition, promptTemplate)
                            .then((caption: string) => onCaptionChange(index, caption))
                            .catch((err: any) => console.error('Auto-generate error:', err));
                        }}
                        edge="end"
                      >
                        <AutoAwesomeIcon color="primary" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mt: 2,
                  bgcolor: '#23272b',
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#90caf9' },
                  },
                  '& .MuiInputLabel-root': { color: '#90caf9' },
                }}
                InputLabelProps={{ style: { color: '#90caf9' } }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GridSection;
