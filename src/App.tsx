import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import ProjectPage from './pages/ProjectPage';
import SettingsPage from './pages/SettingsPage';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'landing' | 'project' | 'settings'>('landing');
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

  const handleOpenSettings = () => {
    setCurrentPage('settings');
  };

  if (currentPage === 'settings') {
    return <SettingsPage onGoBack={handleGoToLanding} />;
  }

  if (currentPage === 'landing') {
    return <LandingPage onCreateProject={handleCreateProject} onLoadProject={handleLoadProject} onOpenSettings={handleOpenSettings} />;
  }

  return <ProjectPage projectName={projectName} onGoToLanding={handleGoToLanding} />;
};

export default App;

import './electron.d.ts';
