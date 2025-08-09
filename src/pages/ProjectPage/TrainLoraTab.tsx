import React from 'react';
import { AppState } from '../../interfaces/AppState';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';

interface TrainLoraTabProps {
  appState: AppState;
}

// Placeholder UI for future LoRA training integration
const TrainLoraTab: React.FC<TrainLoraTabProps> = ({ appState }) => {
  const [venvPath, setVenvPath] = React.useState('');
  const [yamlTemplatePath, setYamlTemplatePath] = React.useState('');

  return (
    <div>
      <h2 className="text-xl text-white mb-4">Train LoRA</h2>
      <Alert severity="info" sx={{ mb: 2 }}>
        This is a placeholder. We'll add YAML templating and Python process spawning next.
      </Alert>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <TextField
          fullWidth
          label=".venv path"
          value={venvPath}
          onChange={(e) => setVenvPath(e.target.value)}
          sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }}
          InputLabelProps={{ style: { color: '#90caf9' } }}
        />
        <TextField
          fullWidth
          label="YAML template path"
          value={yamlTemplatePath}
          onChange={(e) => setYamlTemplatePath(e.target.value)}
          sx={{ input: { color: 'white' }, label: { color: '#90caf9' } }}
          InputLabelProps={{ style: { color: '#90caf9' } }}
        />
      </div>
      <Button variant="contained" color="primary" disabled>
        Prepare & Train (coming soon)
      </Button>
    </div>
  );
};

export default TrainLoraTab;
