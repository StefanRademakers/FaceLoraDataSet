import React, { useState, useEffect, useRef } from 'react';
import GridSection from '../components/GridSection';
import FullscreenViewer from '../components/FullscreenViewer';
import TabBar from '../components/TabBar';
import Descriptions from '../components/Descriptions';
import { ImageSlot } from '../interfaces/types';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArchiveIcon from '@mui/icons-material/Archive';
import { exportImagesTabToPDF } from '../utils/exportPdf';
import { convertGridsForExport } from '../utils/convertGridsForExport';
import { exportProjectToZip } from '../utils/exportZip';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';

const initialGrids: Record<string, (ImageSlot | null)[]> = {
  'Close Up Head Rotations': Array(15).fill(null),
  'Close Up Head Emotions': Array(8).fill(null),
  'Medium Head Shots': Array(8).fill(null),
  'Wide Character Shots': Array(8).fill(null),
  'Additional Images': Array(20).fill(null),
};

const gridConfigs: Record<string, { cols: number }> = {
  'Close Up Head Rotations': { cols: 5 },
  'Close Up Head Emotions': { cols: 4 },
  'Medium Head Shots': { cols: 4 },
  'Wide Character Shots': { cols: 4 },
  'Additional Images': { cols: 5 },
};

interface ProjectPageProps {
  projectName: string;
  onGoToLanding: () => void;
}

const defaultPromptTemplate = `You are an AI assistant preparing training captions for a LoRA dataset.
This is a photo of {{token}}{{addition}}. Analyze it in detail and return a single, 
high-quality caption describing the visual features of the person, facial features, clothing, age and their setting - suitable for LoRA training. 
Use "{{token}}" as the subject placeholder.
Only return the caption. Do not include any explanation or punctuation outside the caption itself.`;

const ProjectPage: React.FC<ProjectPageProps> = ({ projectName: initialProjectName, onGoToLanding }) => {
  const [projectName, setProjectName] = useState(initialProjectName);
  const [grids, setGrids] = useState<Record<string, (ImageSlot | null)[]>>(initialGrids);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'descriptions' | 'export'>('images');
  const [showCaptions, setShowCaptions] = useState(true);
  const [descriptions, setDescriptions] = useState({
    notes: '',
    faceImageDescription: '',
    clothesImageDescription: '',
    fullBodyClothesDescription: '',
    environmentDescription: '',
    loraTrigger: '',
    subjectAddition: '',
  });
  const [promptTemplate, setPromptTemplate] = useState<string>(defaultPromptTemplate);
  const [isProjectLoaded, setIsProjectLoaded] = useState(false);

  const stateRef = useRef({ projectName, grids });
  stateRef.current = { projectName, grids };

  const dropTargetRef = useRef<{ section: string; index: number } | null>(null);

  const loadProjectData = async (name?: string) => {
    const result = await window.electronAPI.loadProject(name);
    if (result.success && result.data) {
      setProjectName(result.data.projectName);

      const loadedDescriptions = {
        notes: result.data.descriptions?.notes || '',
        faceImageDescription: result.data.descriptions?.faceImageDescription || '',
        clothesImageDescription: result.data.descriptions?.clothesImageDescription || '',
        fullBodyClothesDescription: result.data.descriptions?.fullBodyClothesDescription || '',
        environmentDescription: result.data.descriptions?.environmentDescription || '',
        loraTrigger: result.data.descriptions?.loraTrigger || '',
        subjectAddition: result.data.descriptions?.subjectAddition || '',
      };
      setDescriptions(loadedDescriptions);

      const absolutePathGrids: Record<string, (ImageSlot | null)[]> = { ...initialGrids };
      for (const section in result.data.grids) {
        absolutePathGrids[section] = result.data.grids[section].map((image: ImageSlot | null) => {
          if (!image) return null;
          
          // For new ImageSlot objects, just ensure the path is correct
          const path = image.path.startsWith('file://') ? image.path : `file://${image.path.replace(/\\/g, '/')}`;
          return { ...image, path };
        });
      }
      setGrids(absolutePathGrids);
  setPromptTemplate(result.data.promptTemplate || defaultPromptTemplate);
  setIsProjectLoaded(true);
    } else {
      console.error('Failed to load project:', result);
    }
  };

  useEffect(() => {
    loadProjectData(projectName);
  }, [projectName]);

  useEffect(() => {
    const handleSave = async () => {
      const result = await window.electronAPI.saveProject({
        projectName,
        grids,
        descriptions,
        promptTemplate,
      });
      if (result.success) {
        console.log('Project saved to', result.path);
      }
    };

    const handleGlobalDrop = async (filePath: string) => {
      const currentDropTarget = dropTargetRef.current;
      const currentProjectName = stateRef.current.projectName;

      if (currentDropTarget && currentProjectName) {
        const { section, index } = currentDropTarget;
        const newFileName = `${section} ${index + 1}`;
        const result = await window.electronAPI.copyImage(currentProjectName, filePath, newFileName);

        if (result.success && result.path) {
          setGrids((prevGrids) => {
            const newGrids = { ...prevGrids };
            const newImages = [...(newGrids[section] || [])];
            const finalUrl = result.path ? `file://${result.path.replace(/\\/g, '/')}?t=${new Date().getTime()}` : '';
            newImages[index] = { path: finalUrl, caption: '' }; // Create new ImageSlot
            newGrids[section] = newImages;

            const stateToSave = {
              projectName: currentProjectName,
              grids: newGrids,
              descriptions,
              promptTemplate,
            };
            window.electronAPI.saveProject(stateToSave);

            return newGrids;
          });
        } else {
          console.error("Failed to copy image:", result.error);
        }
        dropTargetRef.current = null;
      }
    };

    const dragOverHandler = (e: DragEvent) => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const sectionElement = target.closest('[data-section-title]');
        const tileElement = target.closest('[data-tile-index]');

        if (sectionElement && tileElement) {
            const section = sectionElement.getAttribute('data-section-title');
            const index = parseInt(tileElement.getAttribute('data-tile-index') || '0', 10);
            if(section) {
                dropTargetRef.current = { section, index };
            }
        }
    };

    const api = window.electronAPI;
    const removeSaveListener = api.onMenuSave(handleSave);
    const removeDropListener = api.onFileDrop(handleGlobalDrop);
    window.addEventListener('dragover', dragOverHandler);

    return () => {
        removeSaveListener();
        removeDropListener();
        window.removeEventListener('dragover', dragOverHandler);
    }
  }, [projectName, grids, descriptions]);

  const handleDropImage = (section: string, slotIndex: number, filePath: string) => {
    setGrids((prevGrids) => {
      const newGrids = { ...prevGrids };
      const newImages = [...(newGrids[section] || [])];
      newImages[slotIndex] = { path: filePath, caption: '' };
      newGrids[section] = newImages;
      return newGrids;
    });
  };

  const handleClickImage = (imagePath: string) => {
    const flatImages = Object.values(grids)
      .flat()
      .filter((img): img is ImageSlot => img !== null)
      .map(img => img.path);
    const index = flatImages.findIndex(path => path === imagePath);

    setAllImages(flatImages);
    setCurrentImageIndex(index);
    setFullscreenImage(imagePath);
  };

  const handleCloseFullscreen = () => {
    setFullscreenImage(null);
    setAllImages([]);
    setCurrentImageIndex(null);
  };

  const handleNextImage = () => {
    if (allImages.length > 0 && currentImageIndex !== null) {
      const nextIndex = (currentImageIndex + 1) % allImages.length;
      setCurrentImageIndex(nextIndex);
      setFullscreenImage(allImages[nextIndex]);
    }
  };

  const handlePrevImage = () => {
    if (allImages.length > 0 && currentImageIndex !== null) {
      const prevIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
      setCurrentImageIndex(prevIndex);
      setFullscreenImage(allImages[prevIndex]);
    }
  };

  const handleCaptionChange = (section: string, index: number, caption: string) => {
    setGrids(prevGrids => {
      const newGrids = { ...prevGrids };
      const newImages = [...newGrids[section]];
      const imageSlot = newImages[index];
      if (imageSlot) {
        newImages[index] = { ...imageSlot, caption };
        newGrids[section] = newImages;

        // Auto-save on caption change
        const stateToSave = {
          projectName,
          grids: newGrids,
          descriptions,
          promptTemplate,
        };
        window.electronAPI.saveProject(stateToSave);
      }
      return newGrids;
    });
  };

  const handleDescriptionChange = (field: string, value: string) => {
    setDescriptions((prev) => {
      const updatedDescriptions = { ...prev, [field]: value };
      const stateToSave = {
        projectName,
        grids,
        descriptions: updatedDescriptions,
        promptTemplate,
      };
      window.electronAPI.saveProject(stateToSave);
      return updatedDescriptions;
    });
  };

  const saveProject = () => {
    if (!isProjectLoaded) return;
    const stateToSave = {
      projectName,
      grids,
      descriptions,
      promptTemplate,
    };
    window.electronAPI.saveProject(stateToSave);
  };

  const handleExportToPDF = async () => {
    const exportGrids = convertGridsForExport(grids);
    await exportImagesTabToPDF({
      projectName,
      grids: exportGrids,
      gridConfigs,
      showCaptions,
    });
  };

  const handleExportToZip = async () => {
    // Convert grids to export format (reuse the same as for PDF)
    const exportGrids = convertGridsForExport(grids);
    await exportProjectToZip({
      projectName,
      grids: exportGrids,
      descriptions
    });
  };
  
  const handleExportToAiToolkit = async () => {
    const exportGrids = convertGridsForExport(grids);
    try {
  await window.electronAPI.exportToAiToolkit(projectName, exportGrids);
      console.log('Export to ai-toolkit completed');
    } catch (err) {
      console.error('Export to ai-toolkit error:', err);
    }
  };

  const handleDeleteImage = (imagePath: string) => {
    const baseNameToDelete = imagePath.substring(imagePath.lastIndexOf('/') + 1).split('?')[0];

    setGrids((prevGrids) => {
      const newGrids = { ...prevGrids };
      let imageFound = false;
      for (const section in newGrids) {
        const imageIndex = newGrids[section].findIndex((img) => {
          if (!img) return false;
          const imgBaseName = img.path.split('?')[0];
          const stateImgBaseName = imgBaseName.substring(imgBaseName.lastIndexOf('/') + 1);
          return stateImgBaseName === baseNameToDelete;
        });

        if (imageIndex !== -1) {
          newGrids[section][imageIndex] = null;
          imageFound = true;
          break;
        }
      }

      if (imageFound) {
        const stateToSave = {
          projectName,
          grids: newGrids,
          descriptions,
        };
        window.electronAPI.saveProject(stateToSave);
      }

      return newGrids;
    });

    setAllImages((prevImages) =>
      prevImages.filter((img) => {
        const imgBaseName = img.substring(img.lastIndexOf('/') + 1).split('?')[0];
        return imgBaseName !== baseNameToDelete;
      })
    );
  };

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#222', paddingTop: 0 }}>
        <TabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onGoToLanding={onGoToLanding}
        />
      </div>
      <div className="p-8">
        {activeTab === 'images' ? (
          <>
            <div className="mb-4">
              <FormControlLabel
                control={
                  <Switch
                    checked={showCaptions}
                    onChange={() => setShowCaptions(!showCaptions)}
                    color="primary"
                  />
                }
                label="Show Captions"
                sx={{
                  color: 'white',
                  '.MuiSwitch-thumb': { backgroundColor: '#90caf9' },
                  '.MuiSwitch-track': { backgroundColor: '#424242' }
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <TextField
                  fullWidth
                  label="Project Name"
                  variant="outlined"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  sx={{ mb: 2, input: { color: 'white' }, label: { color: '#90caf9' }, '.MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#90caf9' } } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
              </div>
              <div>
                <TextField
                  fullWidth
                  label="Subject Addition"
                  variant="outlined"
                  value={descriptions.subjectAddition}
                  onChange={(e) => handleDescriptionChange('subjectAddition', e.target.value)}
                  onBlur={() => saveProject()}
                  sx={{ mb: 2, input: { color: 'white' }, label: { color: '#90caf9' } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
              </div>
              <div>
                <TextField
                  fullWidth
                  label="Lora Trigger"
                  variant="outlined"
                  value={descriptions.loraTrigger}
                  onChange={(e) => handleDescriptionChange('loraTrigger', e.target.value)}
                  onBlur={() => saveProject()}
                  sx={{ mb: 2, input: { color: 'white' }, label: { color: '#90caf9' }, '.MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#90caf9' } } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
              </div>
            </div>
            {Object.entries(grids).map(([title, images]) => (
              <div key={title} data-section-title={title}>
                <GridSection
                  title={title}
                  cols={gridConfigs[title].cols}
                  loraTrigger={descriptions.loraTrigger}
                  subjectAddition={descriptions.subjectAddition}
                  promptTemplate={promptTemplate}
                  images={images}
                  onDropImage={(slotIndex: number, filePath: string) => handleDropImage(title, slotIndex, filePath)}
                  onClickImage={handleClickImage}
                  onCaptionChange={(index, caption) => handleCaptionChange(title, index, caption)}
                  showCaptions={showCaptions}
                />
              </div>
            ))}
            <FullscreenViewer 
              image={fullscreenImage || ''} 
              onClose={handleCloseFullscreen}
              onNext={handleNextImage}
              onPrev={handlePrevImage}
              onDeleteImage={handleDeleteImage}
            />
          </>
        ) : activeTab === 'descriptions' ? (
          <Descriptions
            descriptions={descriptions}
            onDescriptionChange={handleDescriptionChange}
            onBlur={saveProject}
            promptTemplate={promptTemplate}
            onPromptTemplateChange={(val) => {
              setPromptTemplate(val);
              // Immediate save with updated template
              window.electronAPI.saveProject({
                projectName,
                grids,
                descriptions,
                promptTemplate: val,
              });
            }}
          />
        ) : (
          // Export Section
          <Paper elevation={2} sx={{ p: 4, bgcolor: '#282c34', borderRadius: 2, maxWidth: 480, margin: '0 auto' }}>
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
              Export Options
            </Typography>
            {/* Global resize option now handled in Settings. Images will be limited to 1024x1024 when enabled there. */}
            <Button
              onClick={handleExportToPDF}
              variant="contained"
              color="primary"
              startIcon={<PictureAsPdfIcon />}
              fullWidth
              sx={{ mb: 2, fontWeight: 600 }}
            >
              Export to PDF
            </Button>
            <Button
              onClick={handleExportToZip}
              variant="contained"
              color="primary"
              startIcon={<ArchiveIcon />}
              fullWidth
              sx={{ fontWeight: 600 }}
            >
              Export to Zip
            </Button>
            <Button
              onClick={handleExportToAiToolkit}
              variant="contained"
              color="primary"
              startIcon={<FolderCopyIcon />}
              fullWidth
              sx={{ mt: 2, fontWeight: 600 }}
            >
              Export to ai-toolkit
            </Button>
          </Paper>
        )}
      </div>
    </>
  );
};

export default ProjectPage;
