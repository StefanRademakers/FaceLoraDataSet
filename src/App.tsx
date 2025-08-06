import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import ProjectPage from './pages/ProjectPage';
import SettingsPage from './pages/SettingsPage';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

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
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SettingsPage onGoBack={handleGoToLanding} />
      </ThemeProvider>
    );
  }

  if (currentPage === 'landing') {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LandingPage onCreateProject={handleCreateProject} onLoadProject={handleLoadProject} onOpenSettings={handleOpenSettings} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ProjectPage projectName={projectName} onGoToLanding={handleGoToLanding} />
    </ThemeProvider>
  );
};

export default App;

import './electron.d.ts';
