import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';

const loraDataRoot = 'D:\\LoraData';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Required to load file:// URLs
    },
  });

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Save Project',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            win.webContents.send('menu-save');
          },
        },
        {
          label: 'Load Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            win.webContents.send('menu-load');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // IPC handler to save project state
  ipcMain.handle('save-project', async (event, state: { projectName: string; grids: Record<string, (string | null)[]> }) => {
    const projectPath = path.join(loraDataRoot, state.projectName);
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const stateToSave = {
      projectName: state.projectName,
      grids: { ...state.grids },
    };

    // Convert absolute file URLs back to relative paths for saving
    for (const section in stateToSave.grids) {
      stateToSave.grids[section] = state.grids[section].map(imagePath => {
        if (imagePath && imagePath.startsWith('file://')) {
          const decodedPath = decodeURI(imagePath.substring(7));
          return path.basename(decodedPath);
        }
        return imagePath; // Already a relative path or null
      });
    }

    const savePath = path.join(projectPath, 'project.json');
    try {
      fs.writeFileSync(savePath, JSON.stringify(stateToSave, null, 2));
      return { success: true, path: savePath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to save project:', error);
      return { success: false, error: message };
    }
  });

  // IPC handler to load project state
  ipcMain.handle('load-project', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Load Lora DataSet Project',
      defaultPath: loraDataRoot,
      properties: ['openFile'],
      filters: [{ name: 'Project Files', extensions: ['json'] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false };
    }

    const projectFilePath = result.filePaths[0];
    try {
      const projectDir = path.dirname(projectFilePath);
      const data = JSON.parse(fs.readFileSync(projectFilePath, 'utf-8'));

      // Convert relative image names back to absolute paths for rendering
      for (const section in data.grids) {
        data.grids[section] = data.grids[section].map((imageName: string | null) => {
          if (imageName) {
            return path.join(projectDir, imageName);
          }
          return null;
        });
      }
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to load project:', error);
      return { success: false, error: message };
    }
  });

  // IPC handler to copy an image to the project folder
  ipcMain.handle('copy-image', async (event, projectName: string, sourcePath: string, customFileName: string) => {
    const projectPath = path.join(loraDataRoot, projectName);
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }
    const destFileName = `${customFileName}${path.extname(sourcePath)}`; // Use custom filename with original extension
    const destPath = path.join(projectPath, destFileName);

    try {
      fs.copyFileSync(sourcePath, destPath);
      return { success: true, path: destPath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to copy file from ${sourcePath} to ${destPath}:`, error);
      return { success: false, error: message };
    }
  });

  // IPC handler to fetch the list of projects
  ipcMain.handle('get-projects', async () => {
    try {
      const projects = fs.readdirSync(loraDataRoot).filter((item) => {
        const itemPath = path.join(loraDataRoot, item);
        return fs.statSync(itemPath).isDirectory();
      });
      return projects;
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      return [];
    }
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // Clean up IPC handlers on exit
  ipcMain.removeHandler('save-project');
  ipcMain.removeHandler('load-project');
  ipcMain.removeHandler('copy-image');
  ipcMain.removeHandler('get-projects');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
