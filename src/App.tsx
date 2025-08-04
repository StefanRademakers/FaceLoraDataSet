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
  
  // Use a ref to hold the latest state for use in event handlers
  // This avoids stale closures without needing to re-register listeners
  const stateRef = useRef({ projectName, grids });
  stateRef.current = { projectName, grids };

  // Use a ref for the drop target to avoid re-renders on dragover
  const dropTargetRef = useRef<{ section: string; index: number } | null>(null);

  useEffect(() => {
    // These handlers now read from the ref, so they always have the latest state
    const handleSave = async () => {
      const result = await window.electronAPI.saveProject(stateRef.current);
      if (result.success) {
        console.log('Project saved to', result.path);
      }
    };
  
    const handleLoad = async () => {
      const result = await window.electronAPI.loadProject();
      if (result.success && result.data) {
        setProjectName(result.data.projectName);
        // The loaded paths are now absolute, so we can use them directly
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
      }
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
            const finalUrl = result.path ? `file://${result.path.replace(/\\/g, '/')}` : '';
            newImages[index] = finalUrl; // Replace the image at the current index
            newGrids[section] = newImages;
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
  }, []); // Empty dependency array means this effect runs only once

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
    console.log("Clicked image path:", imagePath); // Debug log
    setFullscreenImage(imagePath); // Directly use the image path
  };

  const handleCloseFullscreen = () => {
    setFullscreenImage(null);
  };

  const handleCreateProject = (name: string) => {
    setProjectName(name);
    setCurrentPage('project');
  };

  const handleLoadProject = (name: string) => {
    setProjectName(name);
    setCurrentPage('project');
  };

  if (currentPage === 'landing') {
    return <LandingPage onCreateProject={handleCreateProject} onLoadProject={handleLoadProject} />;
  }

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Face Lora DataSet Manager</h1>
      <div className="mb-8">
        <label htmlFor="projectName" className="block text-lg font-medium mb-2">Project Name</label>
        <input
          type="text"
          id="projectName"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2"
        />
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
      <FullscreenViewer image={fullscreenImage} onClose={handleCloseFullscreen} />
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
        saveProject: (state: { projectName: string; grids: any }) => Promise<{ success: boolean; path?: string }>;
        loadProject: () => Promise<{ success: boolean; data?: any }>;
        copyImage: (projectName: string, sourcePath: string, newFileName: string) => Promise<{ success: boolean; path?: string, error?: string }>;
        getProjects: () => Promise<string[]>;
      };
    }
}
