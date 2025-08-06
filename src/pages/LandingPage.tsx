import React, { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import SettingsIcon from '@mui/icons-material/Settings';

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
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper elevation={6} sx={{ width: '100%', p: 4, bgcolor: '#23272b', borderRadius: 3 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <Tooltip title="Settings">
            <IconButton onClick={onOpenSettings} color="primary" size="large" sx={{ bgcolor: '#222', '&:hover': { bgcolor: '#333' } }}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </div>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ color: 'white', fontWeight: 700 }}>
          FaceLora Dataset Manager
        </Typography>
        <Paper elevation={2} sx={{ p: 3, mb: 4, bgcolor: '#282c34', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            New Project
          </Typography>
          <TextField
            fullWidth
            label="Project Name"
            variant="outlined"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            sx={{ mb: 2, input: { color: 'white' }, label: { color: '#90caf9' }, '.MuiOutlinedInput-root': { '& fieldset': { borderColor: '#444' }, '&:hover fieldset': { borderColor: '#90caf9' } } }}
            InputLabelProps={{ style: { color: '#90caf9' } }}
          />
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleCreateProject}
            sx={{ fontWeight: 600 }}
          >
            Create Project
          </Button>
        </Paper>
        <Paper elevation={2} sx={{ p: 3, bgcolor: '#282c34', borderRadius: 2 }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2 }}>
            Load Existing Project
          </Typography>
          <List>
            {existingProjects.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#aaa', textAlign: 'center' }}>
                No projects found.
              </Typography>
            ) : (
              existingProjects.map((project) => (
                <ListItem key={project} disablePadding>
                  <ListItemButton onClick={() => onLoadProject(project)} sx={{ borderRadius: 1 }}>
                    <ListItemText primary={project} primaryTypographyProps={{ sx: { color: '#90caf9', fontWeight: 500 } }} />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        </Paper>
      </Paper>
    </Container>
  );
};

import '../electron.d.ts';

export default LandingPage;
