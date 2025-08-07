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
  const [openAIKey, setOpenAIKey] = useState<string>('');

  useEffect(() => {
    window.electronAPI.getSettings().then((s) => setSettings(s));
    window.electronAPI.getOpenAIKey().then((key: string | null) => {
      if (key) setOpenAIKey(key);
    });
  }, []);
  
  const handleSelectAiToolkit = async () => {
    const newPath = await window.electronAPI.selectDirectory();
    if (newPath && settings) {
      const newSettings = { ...settings, aiToolkitDatasetsPath: newPath };
      setSettings(newSettings);
      window.electronAPI.setSettings(newSettings);
    }
  };

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
        <Paper elevation={6} sx={(theme) => ({ width: '100%', p: 4, bgcolor: theme.palette.background.paper, borderRadius: 3, textAlign: 'center' })}>
          <Typography variant="h6" sx={(theme) => ({ color: theme.palette.text.primary })}>
            Loading...
          </Typography>
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
        <Paper elevation={2} sx={{ p: 3, mb: 4, bgcolor: '#282c34', borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ color: 'white', mb: 2 }}>
            AI Toolkit Datasets Directory
          </Typography>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <TextField
              fullWidth
              label="AI Toolkit Datasets Path"
              value={settings.aiToolkitDatasetsPath}
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
              onClick={handleSelectAiToolkit}
              sx={{ fontWeight: 600 }}
            >
              Browse
            </Button>
          </div>
        </Paper>
        <div style={{ marginBottom: 16 }}>
          <TextField
            fullWidth
            label="OpenAI API Key"
            variant="outlined"
            type="password"
            value={openAIKey}
            onChange={(e) => setOpenAIKey(e.target.value)}
            sx={(theme) => ({
              mb: 2,
              input: { color: theme.palette.text.primary },
              label: { color: theme.palette.primary.main }
            })}
            InputLabelProps={{ style: { color: '#90caf9' } }}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => window.electronAPI.setOpenAIKey(openAIKey)}
            sx={{ fontWeight: 600 }}
          >
            Save API Key
          </Button>
        </div>
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
