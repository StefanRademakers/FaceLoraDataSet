import React, { useState, useEffect } from 'react';

interface LandingPageProps {
  onCreateProject: (projectName: string) => void;
  onLoadProject: (projectName: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onCreateProject, onLoadProject }) => {
  const [projectName, setProjectName] = useState('');
  const [existingProjects, setExistingProjects] = useState<string[]>([]);

  useEffect(() => {
    // Fetch existing projects from the root directory
    window.electronAPI.getProjects().then((projects) => {
      setExistingProjects(projects);
    });
  }, []);

  const handleCreateProject = () => {
    if (projectName.trim()) {
      onCreateProject(projectName.trim());
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold mb-4">Face Lora DataSet Manager</h1>

      <div className="mb-8">
        <label htmlFor="projectName" className="block text-lg font-medium mb-2">New Project:</label>
        <input
          type="text"
          id="projectName"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          className="bg-gray-800 border border-gray-600 rounded-lg w-full p-2 mb-4"
        />
        <button
          onClick={handleCreateProject}
          className="bg-blue-600 text-white rounded-lg px-4 py-2"
        >
          Create Project
        </button>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Load Existing Project:</h2>
        <ul className="list-disc pl-5">
          {existingProjects.map((project) => (
            <li key={project} className="mb-2">
              <button
                onClick={() => onLoadProject(project)}
                className="text-blue-400 hover:underline"
              >
                {project}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

interface ElectronAPI {
  getProjects: () => Promise<string[]>;
  onFileDrop: (callback: (filePath: string) => void) => () => void;
  onMenuSave: (callback: () => void) => () => void;
  onMenuLoad: (callback: () => void) => () => void;
  saveProject: (state: { projectName: string; grids: any; descriptions: Record<string, string> }) => Promise<{ success: boolean; path?: string }>;
  loadProject: (name?: string) => Promise<{ success: boolean; data?: { projectName: string; grids: any; descriptions: Record<string, string> } }>; // Allow optional project name
  copyImage: (projectName: string, sourcePath: string, customFileName: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  copyImageToClipboard: (filePath: string) => Promise<{ success: boolean, error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export default LandingPage;
