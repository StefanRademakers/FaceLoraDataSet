import TabBar from '../components/TabBar';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import { useProjectPageState } from './ProjectPage/useProjectPageState';
import ImagesTab from './ProjectPage/ImagesTab';
import DescriptionsTab from './ProjectPage/DescriptionsTab';
import ExportTab from './ProjectPage/ExportTab';
import TrainLoraTab from './ProjectPage/TrainLoraTab';
import HelpPage from './HelpPage';


interface ProjectPageProps {
  projectName: string;
  onGoToLanding: () => void;
}


import React, { useState } from 'react';
// ...existing imports...

const ProjectPage: React.FC<ProjectPageProps> = ({ projectName, onGoToLanding }) => {
  const state = useProjectPageState(projectName);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Wrap export handlers to show snackbar
  const handleExportToPDF = async () => {
    await state.handleExportToPDF();
    setSnackbarMessage('Exported to PDF');
    setSnackbarOpen(true);
  };
  const handleExportToZip = async () => {
    await state.handleExportToZip();
    setSnackbarMessage('Exported to Zip');
    setSnackbarOpen(true);
  };
  const handleExportToAiToolkit = async () => {
    await state.handleExportToAiToolkit();
    setSnackbarMessage('Exported to ai-toolkit');
    setSnackbarOpen(true);
  };
  const handleExportBackup = async () => {
    await state.handleExportBackup();
    setSnackbarMessage('Backup zip created');
    setSnackbarOpen(true);
  };
  const handleExportStaticHtml = async () => {
    await state.handleExportStaticHtml();
    setSnackbarMessage('Static HTML export created');
    setSnackbarOpen(true);
  };
  const handleSnackbarClose = () => setSnackbarOpen(false);

  return (
    <>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: '#222', paddingTop: 0 }}>
        <TabBar
          activeTab={state.activeTab}
          setActiveTab={state.setActiveTab}
          onGoToLanding={onGoToLanding}
        />
      </div>
      <div className="p-8">
        {/* Only show project stats and controls on Images tab */}
        {state.activeTab === 'images' && (
          <>
            <div className="mb-4 text-sm text-gray-300">
              {(() => {
                let total = 0; let withCaption = 0;
                for (const arr of Object.values(state.appState.grids)) {
                  for (const slot of arr) {
                    if (slot && slot.path) {
                      total++;
                      if (slot.caption && slot.caption.trim().length > 0) withCaption++;
                    }
                  }
                }
                return `Images: ${withCaption}/${total} captioned`;
              })()}
            </div>
            <div className="mb-4">
              <FormControlLabel
                control={
                  <Switch
                    checked={state.showCaptions}
                    onChange={() => state.setShowCaptions(!state.showCaptions)}
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
                  value={state.appState.projectName}
                  onChange={(e) => state.setAppState(prev => ({ ...prev, projectName: e.target.value }))}
                  sx={{ mb: 2, input: { color: 'white' }, label: { color: '#90caf9' }, '.MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#90caf9' } } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
              </div>
              <div>
                <TextField
                  fullWidth
                  label="Subject Addition"
                  variant="outlined"
                  value={state.appState.descriptions.subjectAddition}
                  onChange={(e) => state.handleDescriptionChange('subjectAddition', e.target.value)}
                  onBlur={() => state.saveProject()}
                  sx={{ mb: 2, input: { color: 'white' }, label: { color: '#90caf9' } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
              </div>
              <div>
                <TextField
                  fullWidth
                  label="Lora Trigger"
                  variant="outlined"
                  value={state.appState.descriptions.loraTrigger}
                  onChange={(e) => state.handleDescriptionChange('loraTrigger', e.target.value)}
                  onBlur={() => state.saveProject()}
                  sx={{ mb: 2, input: { color: 'white' }, label: { color: '#90caf9' }, '.MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#90caf9' } } }}
                  InputLabelProps={{ style: { color: '#90caf9' } }}
                />
              </div>
            </div>
          </>
        )}
        {/* Tab content below */}
        {state.activeTab === 'images' && (
          <ImagesTab
            appState={state.appState}
            setAppState={state.setAppState}
            showCaptions={state.showCaptions}
            setShowCaptions={state.setShowCaptions}
            fullscreenImage={state.fullscreenImage}
            setFullscreenImage={state.setFullscreenImage}
            allImages={state.allImages}
            setAllImages={state.setAllImages}
            currentImageIndex={state.currentImageIndex}
            setCurrentImageIndex={state.setCurrentImageIndex}
            handleDropImage={state.handleDropImage}
            handleClickImage={state.handleClickImage}
            handleCaptionChange={state.handleCaptionChange}
            handleCloseFullscreen={state.handleCloseFullscreen}
            handleNextImage={state.handleNextImage}
            handlePrevImage={state.handlePrevImage}
            handleDeleteImage={state.handleDeleteImage}
          />
        )}
        {state.activeTab === 'descriptions' && (
          <DescriptionsTab
            appState={state.appState}
            setAppState={state.setAppState}
            handleDescriptionChange={state.handleDescriptionChange}
            saveProject={state.saveProject}
          />
        )}
        {state.activeTab === 'train' && (
          <TrainLoraTab appState={state.appState} />
        )}
  {state.activeTab === 'export' && (
          <ExportTab
            appState={state.appState}
            handleExportToPDF={handleExportToPDF}
            handleExportToZip={handleExportToZip}
            handleExportToAiToolkit={handleExportToAiToolkit}
            handleExportBackup={handleExportBackup}
            handleExportStaticHtml={handleExportStaticHtml}
            snackbarOpen={snackbarOpen}
            snackbarMessage={snackbarMessage}
            onSnackbarClose={handleSnackbarClose}
          />
        )}
        {state.activeTab === 'help' && (
          <HelpPage />
        )}
      </div>
    </>
  );
};

export default ProjectPage;
