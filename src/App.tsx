import React, { useState, useEffect, useRef } from 'react';
import LandingPage from './LandingPage';
import GridSection from './GridSection';
import FullscreenViewer from './FullscreenViewer';

const initialGrids: Record<string, (string | null)[]> = {
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

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'landing' | 'project'>('landing');
  const [projectName, setProjectName] = useState('');
  const [grids, setGrids] = useState(initialGrids);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'descriptions' | 'export'>('images');
  const [descriptions, setDescriptions] = useState({
    notes: '',
    faceImageDescription: '',
    clothesImageDescription: '',
    fullBodyClothesDescription: '',
    environmentDescription: '',
    loraTrigger: '',
  });
  const [isProjectLoaded, setIsProjectLoaded] = useState(false);
  
  // Use a ref to hold the latest state for use in event handlers
  // This avoids stale closures without needing to re-register listeners
  const stateRef = useRef({ projectName, grids });
  stateRef.current = { projectName, grids };

  // Use a ref for the drop target to avoid re-renders on dragover
  const dropTargetRef = useRef<{ section: string; index: number } | null>(null);

  // Define loadProjectData before its usage
  const loadProjectData = async (projectName?: string) => {
    console.log('loadProjectData called with projectName:', projectName); // Debug log
    const result = await window.electronAPI.loadProject(projectName);
    if (result.success && result.data) {
      console.log('Loaded project data:', result.data); // Debug log
      setProjectName(result.data.projectName);

      const loadedDescriptions = {
        notes: result.data.descriptions?.notes || '',
        faceImageDescription: result.data.descriptions?.faceImageDescription || '',
        clothesImageDescription: result.data.descriptions?.clothesImageDescription || '',
        fullBodyClothesDescription: result.data.descriptions?.fullBodyClothesDescription || '',
        environmentDescription: result.data.descriptions?.environmentDescription || '',
        loraTrigger: result.data.descriptions?.loraTrigger || '',
      };
      console.log('Loaded descriptions:', loadedDescriptions); // Debug log
      setDescriptions(loadedDescriptions);

      const absolutePathGrids = { ...result.data.grids };
      for (const section in absolutePathGrids) {
        absolutePathGrids[section] = absolutePathGrids[section].map((imagePath: string | null) => {
          if (imagePath && !imagePath.startsWith('file://')) {
            return `file://${imagePath.replace(/\\/g, '/')}`;
          }
          return imagePath;
        });
      }
      setGrids(absolutePathGrids);
      setIsProjectLoaded(true); // Mark project as loaded
    } else {
      console.error('Failed to load project:', result);
    }
  };

  useEffect(() => {
    // These handlers now read from the ref, so they always have the latest state
    const handleSave = async () => {
      const result = await window.electronAPI.saveProject({
        projectName,
        grids,
        descriptions, // Include descriptions in the saved state
      });
      if (result.success) {
        console.log('Project saved to', result.path);
      }
    };
  
    const handleLoad = async () => {
      console.log('handleLoad called'); // Debug log
      await loadProjectData();
    };

    const handleGlobalDrop = async (filePath: string) => {
      const currentDropTarget = dropTargetRef.current;
      const currentProjectName = stateRef.current.projectName;

      if (currentDropTarget && currentProjectName) {
        const { section, index } = currentDropTarget;

        // Generate the new filename based on the section and index
        const newFileName = `${section} ${index + 1}`; // Add 1 to make it 1-based index

        // Copy the image to the project directory with the new filename
        const result = await window.electronAPI.copyImage(currentProjectName, filePath, newFileName);

        if (result.success && result.path) {
          // Update the grid state with the new path (of the copied image)
          setGrids((prevGrids) => {
            const newGrids = { ...prevGrids };
            const newImages = [...(newGrids[section] || [])];
            const finalUrl = result.path ? `file://${result.path.replace(/\\/g, '/')}?t=${new Date().getTime()}` : '';
            newImages[index] = finalUrl; // Replace the image at the current index
            newGrids[section] = newImages;

            // Auto-save the project with the new state
            const stateToSave = {
              projectName: currentProjectName,
              grids: newGrids,
              descriptions, // Include descriptions in the saved state
            };
            window.electronAPI.saveProject(stateToSave);

            return newGrids;
          });
        } else {
          console.error("Failed to copy image:", result.error);
        }
        dropTargetRef.current = null; // Reset drop target
      }
    };

    // This handler updates the ref, not state, so no re-renders
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

    // Set up listeners once on mount
    const api = window.electronAPI;
    const removeSaveListener = api.onMenuSave(handleSave);
    const removeLoadListener = api.onMenuLoad(handleLoad);
    const removeDropListener = api.onFileDrop(handleGlobalDrop);
    window.addEventListener('dragover', dragOverHandler);

    // Clean up listeners on unmount
    return () => {
        removeSaveListener();
        removeLoadListener();
        removeDropListener();
        window.removeEventListener('dragover', dragOverHandler);
    }
  }, [projectName, grids, descriptions]); // Empty dependency array means this effect runs only once

  const handleDropImage = (section: string, slotIndex: number, filePath: string) => {
    setGrids((prevGrids) => {
      const newGrids = { ...prevGrids };
      const newImages = [...(newGrids[section] || [])];
      newImages[slotIndex] = filePath;
      newGrids[section] = newImages;
      return newGrids;
    });
  };

  const handleClickImage = (imagePath: string) => {
    const flatImages = Object.values(grids).flat().filter((img): img is string => img !== null);
    const index = flatImages.findIndex(img => img === imagePath);

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

  const handleCreateProject = (name: string) => {
    setProjectName(name);
    setCurrentPage('project');
  };

  const handleLoadProject = async (name: string) => {
    setCurrentPage('project');
    await loadProjectData(name);
  };

  const handleGoToLanding = () => {
    setCurrentPage('landing');
    setProjectName('');
    setGrids(initialGrids);
  };

  const handleDescriptionChange = (field: keyof typeof descriptions, value: string) => {
    setDescriptions((prev) => {
      const updatedDescriptions = { ...prev, [field]: value };

      // Auto-save the project with the updated descriptions
      const stateToSave = {
        projectName,
        grids,
        descriptions: updatedDescriptions,
      };
      window.electronAPI.saveProject(stateToSave);

      return updatedDescriptions;
    });
  };

  const saveProject = () => {
    if (!isProjectLoaded) return; // Prevent saving before project is loaded

    const stateToSave = {
      projectName,
      grids,
      descriptions,
    };
    window.electronAPI.saveProject(stateToSave);
  };

  useEffect(() => {
    console.log('Descriptions state updated in useEffect:', descriptions); // Debug log to trace state updates
  }, [descriptions]);

  const handleExportToPDF = () => {
    console.log('Export to PDF triggered');
    // Add logic to export project to PDF
  };

  const handleExportToZip = () => {
    console.log('Export to Zip triggered');
    // Add logic to export project to Zip
  };

  const handleDeleteImage = (imagePath: string) => {
    // The imagePath from FullscreenViewer is a full file URL.
    // We need to extract the base name to compare with the relative paths in the state.
    const baseNameToDelete = imagePath.substring(imagePath.lastIndexOf('/') + 1).split('?')[0];

    setGrids((prevGrids) => {
      const newGrids = { ...prevGrids };
      let imageFound = false;
      for (const section in newGrids) {
        const imageIndex = newGrids[section].findIndex((img) => {
          if (!img) return false;
          // Compare the base name of the image in the state, stripping any query params
          const imgBaseName = img.split('?')[0];
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
        // Auto-save the project with the new state
        const stateToSave = {
          projectName,
          grids: newGrids,
          descriptions,
        };
        window.electronAPI.saveProject(stateToSave);
      }

      return newGrids;
    });

    // Also remove from the fullscreen image list by comparing base names
    setAllImages((prevImages) =>
      prevImages.filter((img) => {
        const imgBaseName = img.substring(img.lastIndexOf('/') + 1).split('?')[0];
        return imgBaseName !== baseNameToDelete;
      })
    );
  };

  if (currentPage === 'landing') {
    return <LandingPage onCreateProject={handleCreateProject} onLoadProject={handleLoadProject} />;
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Face Lora DataSet Manager</h1>

      <div className="mb-4">
        <button
          onClick={handleGoToLanding}
          className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 mr-2"
        >
          Home
        </button>
        <button
          onClick={() => setActiveTab('images')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'images' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-black'}`}
        >
          Images
        </button>
        <button
          onClick={() => setActiveTab('descriptions')}
          className={`ml-2 px-4 py-2 rounded-lg ${activeTab === 'descriptions' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-black'}`}
        >
          Descriptions
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`ml-2 px-4 py-2 rounded-lg ${activeTab === 'export' ? 'bg-blue-500 text-white' : 'bg-gray-500 text-black'}`}
        >
          Export
        </button>
      </div>

      {activeTab === 'images' ? (
        <>
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <label htmlFor="projectName" className="block text-lg font-medium mb-2">Project Name</label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2"
              />
            </div>
            <div>
              <label htmlFor="loraTrigger" className="block text-lg font-medium mb-2">Lora Trigger</label>
              <input
                type="text"
                id="loraTrigger"
                value={descriptions.loraTrigger}
                onChange={(e) => handleDescriptionChange('loraTrigger', e.target.value)}
                onBlur={() => saveProject()}
                className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2"
              />
            </div>
          </div>

          {Object.entries(grids).map(([title, images]) => (
            <div key={title} data-section-title={title}>
              <GridSection
                title={title}
                cols={gridConfigs[title].cols}
                images={images}
                onDropImage={(slotIndex, filePath) => handleDropImage(title, slotIndex, filePath)}
                onClickImage={handleClickImage}
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
        <div>
          <h2 className="text-2xl font-bold mb-4">Descriptions</h2>
          {Object.entries(descriptions).map(([key, value]) => (
            <div key={key} className="mb-4">
              <label htmlFor={key} className="block text-lg font-medium mb-2">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
              </label>
              <textarea
                id={key}
                value={descriptions[key as keyof typeof descriptions] || ''} // Debug log
                onChange={(e) => handleDescriptionChange(key as keyof typeof descriptions, e.target.value)}
                onBlur={() => saveProject()}
                className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2"
                rows={4}
              />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <h2 className="text-2xl font-bold mb-4">Export Options</h2>
          <button
            onClick={handleExportToPDF}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 mb-4"
          >
            Export to PDF
          </button>
          <button
            onClick={handleExportToZip}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Export to Zip
          </button>
        </div>
      )}
    </div>
  );
};

export default App;

declare global {
  interface Window {
    electronAPI: {
      onFileDrop: (callback: (filePath: string) => void) => () => void;
      onMenuSave: (callback: () => void) => () => void;
      onMenuLoad: (callback: () => void) => () => void;
      saveProject: (state: { projectName: string; grids: any; descriptions: Record<string, string> }) => Promise<{ success: boolean; path?: string }>;
      loadProject: (name?: string) => Promise<{ success: boolean; data?: { projectName: string; grids: any; descriptions: Record<string, string> } }>; // Allow optional project name
      copyImage: (projectName: string, sourcePath: string, newFileName: string) => Promise<{ success: boolean; path?: string, error?: string }>;
      getProjects: () => Promise<string[]>;
      copyImageToClipboard: (filePath: string) => Promise<{ success: boolean, error?: string }>;
      openImageInExplorer: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}
