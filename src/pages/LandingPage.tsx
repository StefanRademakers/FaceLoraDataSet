import React, { useState, useEffect } from 'react';

interface LandingPageProps {
  onCreateProject: (projectName: string) => void;
  onLoadProject: (projectName: string) => void;
  onOpenSettings: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onCreateProject, onLoadProject, onOpenSettings }) => {
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
      <div className="flex justify-end mb-4">
        <button
          onClick={onOpenSettings}
          className="bg-gray-700 text-white rounded-lg px-4 py-2 hover:bg-gray-600"
        >
          Settings
        </button>
      </div>

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

import '../electron.d.ts';

export default LandingPage;
