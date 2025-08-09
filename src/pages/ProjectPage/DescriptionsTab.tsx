import React from 'react';
import { AppState } from '../../interfaces/AppState';
import DescriptionsComponent from '../../components/Descriptions';

interface DescriptionsTabProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  handleDescriptionChange: (field: string, value: string) => void;
  saveProject: () => void;
}

const DescriptionsTab: React.FC<DescriptionsTabProps> = ({
  appState,
  setAppState,
  handleDescriptionChange,
  saveProject,
}) => {
  return (
    <DescriptionsComponent
      descriptions={appState.descriptions as any}
      onDescriptionChange={handleDescriptionChange}
      onBlur={saveProject}
      promptTemplate={appState.promptTemplate}
      onPromptTemplateChange={(val) => {
        setAppState(prev => ({ ...prev, promptTemplate: val }));
      }}
    />
  );
};

export default DescriptionsTab;
