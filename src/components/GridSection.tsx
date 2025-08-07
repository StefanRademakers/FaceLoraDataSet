import React from 'react';
import { ImageSlot } from '../interfaces/types';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface GridSectionProps {
  title: string;
  cols: number;
  // LoRA trigger token for auto captioning
  loraTrigger: string;
  images: (ImageSlot | null)[];
  onDropImage: (slotIndex: number, filePath: string) => void;
  onClickImage: (imagePath: string) => void;
  onCaptionChange: (index: number, caption: string) => void;
  showCaptions: boolean;
}

const GridSection: React.FC<GridSectionProps> = ({ title, cols, loraTrigger, images, onClickImage, onCaptionChange, showCaptions }) => {
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
                          window.electronAPI.autoGenerateCaption(imageSlot.path, loraTrigger)
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
