import React, { useEffect, useState } from 'react';
import { AppSettings } from '../interfaces/types';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

interface SettingsPageProps {
  onGoBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onGoBack }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings);
  }, []);

  const handleSelectDirectory = async () => {
    const newPath = await window.electronAPI.selectDirectory();
    if (newPath && settings) {
      const newSettings = { ...settings, loraDataRoot: newPath };
      setSettings(newSettings);
      window.electronAPI.setSettings(newSettings);
    }
  };

  const handleSave = () => {
    if (settings) {
      window.electronAPI.setSettings(settings);
    }
    onGoBack();
  };

  if (!settings) {
    return (
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Paper elevation={6} sx={{ width: '100%', p: 4, bgcolor: '#23272b', borderRadius: 3, textAlign: 'center' }}>
          <Typography variant="h6" sx={{ color: 'white' }}>Loading...</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={6} sx={{ width: '100%', p: 4, bgcolor: '#23272b', borderRadius: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <Tooltip title="Back">
            <IconButton onClick={onGoBack} color="primary" size="large" sx={{ bgcolor: '#222', mr: 2, '&:hover': { bgcolor: '#333' } }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
            Settings
          </Typography>
        </div>
        <Paper elevation={2} sx={{ p: 3, mb: 4, bgcolor: '#282c34', borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ color: 'white', mb: 2 }}>
            Lora Data Root Directory
          </Typography>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              fullWidth
              label="Lora Data Root"
              value={settings.loraDataRoot}
              InputProps={{ readOnly: true }}
              variant="outlined"
              sx={{
                mr: 2,
                input: { color: 'white' },
                label: { color: '#90caf9' },
                '.MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#90caf9' } }
              }}
              InputLabelProps={{ style: { color: '#90caf9' } }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSelectDirectory}
              sx={{ fontWeight: 600 }}
            >
              Browse
            </Button>
          </div>
        </Paper>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            onClick={onGoBack}
            variant="outlined"
            color="secondary"
            sx={{ mr: 2, fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            color="success"
            sx={{ fontWeight: 600 }}
          >
            Save and Go Back
          </Button>
        </div>
      </Paper>
    </Container>
  );
};

export default SettingsPage;
