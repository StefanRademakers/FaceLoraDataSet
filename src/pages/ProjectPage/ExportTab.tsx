
import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import { AppState } from '../../interfaces/AppState';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ArchiveIcon from '@mui/icons-material/Archive';
import FolderCopyIcon from '@mui/icons-material/FolderCopy';
import BackupIcon from '@mui/icons-material/Backup';

interface ExportTabProps {


  appState: AppState;
  handleExportToPDF: () => Promise<void>;
  handleExportToZip: () => Promise<void>;
  handleExportToAiToolkit: () => Promise<void>;
  handleExportBackup: () => Promise<void>;
  snackbarOpen: boolean;
  snackbarMessage: string;
  onSnackbarClose: () => void;
}


const ExportTab: React.FC<ExportTabProps> = ({
  appState,
  handleExportToPDF,
  handleExportToZip,
  handleExportToAiToolkit,
  handleExportBackup,
  snackbarOpen,
  snackbarMessage,
  onSnackbarClose,
}) => {
  return (
    <>
      <Paper elevation={2} sx={{ p: 4, bgcolor: '#282c34', borderRadius: 2, maxWidth: 480, margin: '0 auto' }}>
        <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 2 }}>
          Export Options
        </Typography>
        <Button
          onClick={handleExportToPDF}
          variant="contained"
          color="primary"
          startIcon={<PictureAsPdfIcon />}
          fullWidth
          sx={{ mb: 2, fontWeight: 600 }}
        >
          Export to PDF
        </Button>
        <Button
          onClick={handleExportToZip}
          variant="contained"
          color="primary"
          startIcon={<ArchiveIcon />}
          fullWidth
          sx={{ fontWeight: 600 }}
        >
          Export to Zip
        </Button>
        <Button
          onClick={handleExportToAiToolkit}
          variant="contained"
          color="primary"
          startIcon={<FolderCopyIcon />}
          fullWidth
          sx={{ mt: 2, fontWeight: 600 }}
        >
          Export to ai-toolkit
        </Button>
        <Button
          onClick={handleExportBackup}
          variant="contained"
          color="secondary"
          startIcon={<BackupIcon />}
          fullWidth
          sx={{ mt: 2, fontWeight: 600 }}
        >
          Export to Backup
        </Button>
      </Paper>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={onSnackbarClose}
        message={snackbarMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  );
};

export default ExportTab;
