import { useState, useRef, useEffect } from 'react';
import { AppState, DEFAULT_APP_STATE } from '../../interfaces/AppState';
import { ImageSlot } from '../../interfaces/types';
import { GRID_SECTION_CONFIGS, initialGrids } from '../../config/gridConfig';

export type ProjectTabs = 'images' | 'descriptions' | 'export' | 'train' | 'help';

export function useProjectPageState(initialProjectName: string) {
  const [appState, setAppState] = useState<AppState>({
    ...DEFAULT_APP_STATE,
    projectName: initialProjectName,
    grids: initialGrids,
  });
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<ProjectTabs>('images');
  const [showCaptions, setShowCaptions] = useState(true);
  const [isProjectLoaded, setIsProjectLoaded] = useState(false);

  const stateRef = useRef(appState);
  stateRef.current = appState;
  const dropTargetRef = useRef<{ section: string; index: number } | null>(null);


  // --- Logic migrated from ProjectPage.tsx ---
  const loadProjectData = async (name?: string) => {
    const result = await window.electronAPI.loadProject(name);
    if (result.success && result.data) {
      // Patch grids for absolute file:// paths and ensure correct slot count
      const absolutePathGrids: Record<string, (ImageSlot | null)[]> = { ...initialGrids };
      for (const section in result.data.grids) {
        const mapped = result.data.grids[section].map((image: ImageSlot | null) => {
          if (!image) return null;
          const path = image.path.startsWith('file://') ? image.path : `file://${image.path.replace(/\\/g, '/')}`;
          return { ...image, path };
        });
        const targetSize = section === 'Additional Images' ? 40 : 15;
        if (mapped.length < targetSize) {
          mapped.push(...Array(targetSize - mapped.length).fill(null));
        }
        absolutePathGrids[section] = mapped;
      }
      setAppState({
        ...result.data,
        grids: absolutePathGrids,
        promptTemplate: result.data.promptTemplate || DEFAULT_APP_STATE.promptTemplate,
      });
      setIsProjectLoaded(true);
    } else {
      console.error('Failed to load project:', result);
    }
  };

  useEffect(() => {
    loadProjectData(appState.projectName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState.projectName]);

  useEffect(() => {
    const handleSave = async () => {
      const result = await window.electronAPI.saveProject(appState);
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
          setAppState((prev) => {
            const newGrids = { ...prev.grids };
            const newImages = [...(newGrids[section] || [])];
            const finalUrl = result.path ? `file://${result.path.replace(/\\/g, '/')}` + `?t=${new Date().getTime()}` : '';
            newImages[index] = { path: finalUrl, caption: '' };
            newGrids[section] = newImages;
            const updated = { ...prev, grids: newGrids };
            window.electronAPI.saveProject(updated);
            return updated;
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
        if (section) {
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
    };
  }, [appState]);

  const handleDropImage = (section: string, slotIndex: number, filePath: string) => {
    setAppState((prev) => {
      const newGrids = { ...prev.grids };
      const newImages = [...(newGrids[section] || [])];
      newImages[slotIndex] = { path: filePath, caption: '' };
      newGrids[section] = newImages;
      return { ...prev, grids: newGrids };
    });
  };

  const handleClickImage = (imagePath: string) => {
    const flatImages = Object.values(appState.grids)
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
    setAppState(prev => {
      const newGrids = { ...prev.grids };
      const newImages = [...newGrids[section]];
      const imageSlot = newImages[index];
      if (imageSlot) {
        newImages[index] = { ...imageSlot, caption };
        newGrids[section] = newImages;
        const updated = { ...prev, grids: newGrids };
        window.electronAPI.saveProject(updated);
        return updated;
      }
      return prev;
    });
  };

  const handleDescriptionChange = (field: string, value: string) => {
    setAppState(prev => {
      const updatedDescriptions = { ...prev.descriptions, [field]: value };
      const updated = { ...prev, descriptions: updatedDescriptions };
      window.electronAPI.saveProject(updated);
      return updated;
    });
  };

  const saveProject = () => {
    if (!isProjectLoaded) return;
    window.electronAPI.saveProject(appState);
  };

  const handleExportToPDF = async () => {
    const { convertGridsForExport } = await import('../../utils/convertGridsForExport');
    const { exportImagesTabToPDF } = await import('../../utils/exportPdf');
    const exportGrids = convertGridsForExport(appState.grids);
    await exportImagesTabToPDF({
      projectName: appState.projectName,
      grids: exportGrids,
      gridConfigs: Object.fromEntries(
        Object.entries(GRID_SECTION_CONFIGS).map(([section, { cols }]) => [section, { cols }])
      ),
      showCaptions,
    });
  };

  const handleExportToZip = async () => {
    const { exportProjectToZip } = await import('../../utils/exportZip');
    await exportProjectToZip(appState);
  };

  const handleExportToAiToolkit = async () => {
    const { convertGridsForExport } = await import('../../utils/convertGridsForExport');
    const exportGrids = convertGridsForExport(appState.grids);
    try {
      await window.electronAPI.exportToAiToolkit(appState.projectName, exportGrids, appState);
      console.log('Export to ai-toolkit completed');
    } catch (err) {
      console.error('Export to ai-toolkit error:', err);
    }
  };

  const handleExportStaticHtml = async () => {
    const { exportStaticHtml } = await import('../../utils/exportStaticHtml');
    await exportStaticHtml(appState);
  };

  const handleExportBackup = async () => {
    try {
      const res = await window.electronAPI.exportBackupZip(appState);
      if (res.success) {
        console.log('Backup zip created at', res.path);
      } else {
        console.error('Backup export failed:', res.error);
      }
    } catch (e) {
      console.error('Backup export exception:', e);
    }
  };

  const handleDeleteImage = (imagePath: string) => {
    const baseNameToDelete = imagePath.substring(imagePath.lastIndexOf('/') + 1).split('?')[0];

    setAppState((prev) => {
      const newGrids = { ...prev.grids };
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
        const updated = { ...prev, grids: newGrids };
        window.electronAPI.saveProject(updated);
        return updated;
      }
      return prev;
    });

    setAllImages((prevImages) =>
      prevImages.filter((img) => {
        const imgBaseName = img.substring(img.lastIndexOf('/') + 1).split('?')[0];
        return imgBaseName !== baseNameToDelete;
      })
    );
  };

  return {
    appState,
    setAppState,
    fullscreenImage,
    setFullscreenImage,
    allImages,
    setAllImages,
    currentImageIndex,
    setCurrentImageIndex,
    activeTab,
    setActiveTab,
    showCaptions,
    setShowCaptions,
    isProjectLoaded,
    setIsProjectLoaded,
    stateRef,
    dropTargetRef,
    handleDropImage,
    handleClickImage,
    handleCaptionChange,
    handleCloseFullscreen,
    handleNextImage,
    handlePrevImage,
    handleDeleteImage,
    handleDescriptionChange,
    saveProject,
    handleExportToPDF,
    handleExportToZip,
    handleExportToAiToolkit,
    handleExportBackup,
  handleExportStaticHtml,
  };
}
