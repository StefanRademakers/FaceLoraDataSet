import React from 'react';
import { ImageSlot, DEFAULT_IMAGE_METADATA, ImageMetadata } from '../interfaces/types';
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
  showMetadata: boolean;
  onMetadataChange: (index: number, metadata: Partial<ImageMetadata>) => void;
  showEmptySlots?: boolean; // visual toggle only
}

const GridSection: React.FC<GridSectionProps> = ({ title, cols, loraTrigger, subjectAddition, promptTemplate, images, onClickImage, onCaptionChange, showCaptions, showMetadata, onMetadataChange, showEmptySlots = true }) => {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const gridCols = `grid-cols-${cols}`;

  const [bulkRunning, setBulkRunning] = React.useState(false);

  const missingCount = React.useMemo(() => {
    return images.reduce((acc, slot) => acc + (slot && (!slot.caption || slot.caption.trim().length === 0) ? 1 : 0), 0);
  }, [images]);

  const missingMetaCount = React.useMemo(() => {
    return images.reduce((acc, slot) => {
      if (!slot) return acc;
      const m = slot.metadata || DEFAULT_IMAGE_METADATA;
      const empty = !m.shotType || !m.angle || !m.lighting || !m.environment || !m.mood || !m.action;
      return acc + (empty ? 1 : 0);
    }, 0);
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
        {showMetadata && (
          <Button
            variant="contained"
            color="secondary"
            onClick={async () => {
              if (bulkRunning) return;
              setBulkRunning(true);
              try {
                for (let i = 0; i < images.length; i++) {
                  const slot = images[i];
                  if (!slot) continue;
                  const meta = slot.metadata || DEFAULT_IMAGE_METADATA;
                  const incomplete = !meta.shotType || !meta.angle || !meta.lighting || !meta.environment || !meta.mood || !meta.action;
                  if (!incomplete) continue;
                  try {
                    const generated: ImageMetadata = await (window as any).electronAPI.autoGenerateMetadata(slot.path);
                    onMetadataChange(i, generated);
                  } catch (e) {
                    console.error('Bulk metadata error', e);
                  }
                }
              } finally {
                setBulkRunning(false);
              }
            }}
            disabled={bulkRunning || missingMetaCount === 0}
            startIcon={!bulkRunning ? <AutoAwesomeIcon /> : undefined}
            sx={{ minWidth: 260 }}
          >
            {bulkRunning ? (
              <><CircularProgress size={18} sx={{ mr: 1 }} /> Annotating...</>
            ) : (
              missingMetaCount === 0 ? 'All metadata filled' : `Auto metadata ${missingMetaCount} missing`
            )}
          </Button>
        )}
      </div>
      <div className={`grid ${gridCols} gap-4`}>
        {images.map((imageSlot, index) => (
          <div key={index} className="flex flex-col" style={!showEmptySlots && !imageSlot ? { display: 'none' } : undefined}>
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
            {showMetadata && imageSlot && (
              <div className="mt-2 p-2 rounded bg-[#23272b] text-white text-xs space-y-2 border border-[#444]">
                {/* Dropdowns */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'shotType', label: 'Shot', options: ['','extreme-close','close','medium','wide'] },
                    { key: 'angle', label: 'Angle', options: ['','frontal','three-quarter','profile','back','low-angle','high-angle'] },
                    { key: 'lighting', label: 'Lighting', options: ['','daylight','indoor','night','sunset','studio'] },
                    { key: 'environment', label: 'Env', options: ['','neutral','indoor','outdoor','nature','city','sky'] },
                    { key: 'mood', label: 'Mood', options: ['','neutral','smiling','serious','surprised','dreamy','stern','relaxed','contemplative'] },
                    { key: 'action', label: 'Action', options: ['','stand','sit','walk','gesture','hold-object','interact','none'] },
                  ].map(field => (
                    <label key={field.key} className="flex flex-col text-[10px]">
                      <span className="mb-0.5 opacity-70">{field.label}</span>
                      <select
                        value={(imageSlot.metadata || DEFAULT_IMAGE_METADATA)[field.key as keyof ImageMetadata] as string || ''}
                        onChange={(e) => onMetadataChange(index, { [field.key]: e.target.value } as any)}
                        className="bg-[#1d2023] border border-[#555] rounded px-1 py-1 text-white text-xs focus:outline-none focus:border-[#90caf9]"
                      >
                        {field.options.map(opt => <option key={opt} value={opt}>{opt || '-'}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    className="text-[11px] px-2 py-1 bg-[#2d3135] hover:bg-[#3a4045] rounded border border-[#555] flex items-center gap-1"
                    onClick={() => {
                      (window as any).electronAPI.autoGenerateMetadata(imageSlot.path)
                        .then((m: ImageMetadata) => onMetadataChange(index, m))
                        .catch((e: any) => console.error('Auto metadata error', e));
                    }}
                  >
                    <AutoAwesomeIcon fontSize="inherit" /> Auto
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default GridSection;
