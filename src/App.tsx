import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import ProjectPage from './pages/ProjectPage';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'landing' | 'project'>('landing');
  const [projectName, setProjectName] = useState('');

  const handleCreateProject = (name: string) => {
    setProjectName(name);
    setCurrentPage('project');
  };

  const handleLoadProject = (name: string) => {
    setProjectName(name);
    setCurrentPage('project');
  };

  const handleGoToLanding = () => {
    setCurrentPage('landing');
    setProjectName('');
  };

  if (currentPage === 'landing') {
    return <LandingPage onCreateProject={handleCreateProject} onLoadProject={handleLoadProject} />;
  }

  return <ProjectPage projectName={projectName} onGoToLanding={handleGoToLanding} />;
};

export default App;

import './electron.d.ts';
