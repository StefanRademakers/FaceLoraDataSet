import { app, BrowserWindow, Menu, ipcMain, dialog, clipboard, nativeImage, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import url from 'url';
import { OpenAICaptioner } from '../src/utils/OpenAICaptioner';
import { getSettings, saveSettings, getOpenAIKey, setOpenAIKey } from './settings';

let settings = getSettings();

// Function to get the current loraDataRoot
function getLoraDataRoot() {
  return settings.loraDataRoot;
}


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Preload script path (compiled into dist-electron root)
  const preloadPath = path.join(__dirname, 'preload.js');
  console.log('Loading preload script from:', preloadPath);
  const win = new BrowserWindow({
    width: 1830,
    height: 1000,
      webPreferences: {
        // Preload script (compiled into dist-electron folder)
        preload: preloadPath,
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
    // Load built React app from dist folder (two levels up from dist-electron/electron)
    const indexPath = path.join(__dirname, '..', '..', 'dist', 'index.html');
    console.log('Loading React index.html from:', indexPath);
    win.loadFile(indexPath);
  }

  // IPC handler to save project state
  ipcMain.handle('save-project', async (event, projectData: { projectName: string; grids: Record<string, (any | null)[]>; descriptions: Record<string, string> }) => {
    const projectPath = path.join(getLoraDataRoot(), projectData.projectName);
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // When saving, convert image paths to be relative to the project folder
    const relativePathGrids = JSON.parse(JSON.stringify(projectData.grids)); // Deep copy
    for (const section in relativePathGrids) {
      relativePathGrids[section] = relativePathGrids[section].map((imageSlot: { path: string; caption: string } | null) => {
        if (imageSlot && imageSlot.path && imageSlot.path.startsWith('file://')) {
          const filePath = url.fileURLToPath(imageSlot.path);
          const relativePath = path.relative(projectPath, filePath);
          return { ...imageSlot, path: relativePath.replace(/\\/g, '/') };
        }
        // If it's already a relative path or some other format, keep it as is
        return imageSlot;
      });
    }

    const dataToSave = {
      ...projectData,
      grids: relativePathGrids,
    };

    const savePath = path.join(projectPath, 'project.json');
    try {
      fs.writeFileSync(savePath, JSON.stringify(dataToSave, null, 2));
      return { success: true, path: savePath };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to save project:', error);
      return { success: false, error: message };
    }
  });

  // IPC handler to load project state
  ipcMain.handle('load-project', async (event, projectName) => {
    if (projectName) {
      try {
        const projectFilePath = path.join(getLoraDataRoot(), projectName, 'project.json');
        const projectDir = path.dirname(projectFilePath);
        const data = JSON.parse(fs.readFileSync(projectFilePath, 'utf-8'));

        // Convert relative image names back to absolute paths for rendering
        for (const section in data.grids) {
          data.grids[section] = data.grids[section].map((imageSlot: { path: string; caption: string } | null) => {
            if (imageSlot && imageSlot.path) {
              const absolutePath = path.join(projectDir, imageSlot.path);
              return { ...imageSlot, path: absolutePath };
            }
            return imageSlot;
          });
        }
        return { success: true, data };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Failed to load project:', error);
        return { success: false, error: message };
      }
    }

    // Fallback to opening a file dialog if no project name is provided
    const result = await dialog.showOpenDialog({
      title: 'Load Lora DataSet Project',
      defaultPath: getLoraDataRoot(),
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
    const projectPath = path.join(getLoraDataRoot(), projectName);
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
      const loraDataRoot = getLoraDataRoot();
      if (!fs.existsSync(loraDataRoot)) {
        fs.mkdirSync(loraDataRoot, { recursive: true });
        console.log(`Created data directory: ${loraDataRoot}`);
      }
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

  // IPC handler to copy an image to the clipboard
  ipcMain.handle('copy-image-to-clipboard', async (event, fileUrl: string) => {
    try {
      const url = new URL(fileUrl);
      let filePath = decodeURI(url.pathname);

      // On Windows, pathname starts with a slash, like /C:/...
      // We need to remove the leading slash.
      if (process.platform === 'win32' && filePath.startsWith('/')) {
        filePath = filePath.substring(1);
      }
      
      const image = nativeImage.createFromPath(filePath);
      if (image.isEmpty()) {
        console.error('Failed to create nativeImage from path:', filePath);
        return { success: false, error: 'Image is empty or path is invalid.' };
      }
      clipboard.writeImage(image);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to copy image to clipboard:', error);
      return { success: false, error: message };
    }
  });

  // IPC handler to open an image in the file explorer
  ipcMain.handle('open-image-in-explorer', async (_, filePath) => {
    try {
      const { shell } = require('electron');
      await shell.showItemInFolder(filePath);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to open image in explorer:', error);
      return { success: false, error: message };
    }
  });

  // IPC handler to delete an image file
  ipcMain.handle('delete-image', async (_, fileUrl) => {
    try {
      const { fileURLToPath } = require('url');
      const filePath = fileURLToPath(fileUrl);

      // Strip query parameters from the file path
      const sanitizedPath = filePath.split('?')[0];

      // Check if the file exists before attempting to delete
      if (fs.existsSync(sanitizedPath)) {
        fs.unlinkSync(sanitizedPath);
        console.log('File deleted:', sanitizedPath);
        return { success: true };
      } else {
        console.error('File does not exist:', sanitizedPath);
        return { success: false, error: 'File does not exist.' };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to delete file:', error);
      return { success: false, error: message };
    }
  });

  // IPC handlers for app settings
  ipcMain.handle('get-settings', async () => {
    return getSettings();
  });

  ipcMain.handle('set-settings', async (event, newSettings) => {
    saveSettings(newSettings);
    settings = newSettings;
    return { success: true };
  });

  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Lora Data Root Directory',
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

// IPC handlers for OpenAI API key
ipcMain.handle('get-openai-key', async () => {
  return await getOpenAIKey();
});
ipcMain.handle('set-openai-key', async (event, key: string) => {
  await setOpenAIKey(key);
  return true;
});
// IPC handler for auto-generating captions via OpenAI
ipcMain.handle('auto-generate-caption', async (event, imagePath: string, token: string, subjectAddition: string) => {
  // Ensure API key is set
  const key = await getOpenAIKey();
  if (!key) throw new Error('OpenAI API key not set');
  const captioner = new OpenAICaptioner(key);
  // Normalize file path: strip file:// or file: prefix if present
  let filePathArg = imagePath;
  try {
    if (filePathArg.startsWith('file://')) {
      filePathArg = url.fileURLToPath(filePathArg);
    } else if (filePathArg.startsWith('file:')) {
      filePathArg = filePathArg.replace(/^file:[\\/]+/, '');
    }
  } catch (e) {
    console.warn('Could not parse file URL, using original path:', imagePath, e);
  }
  console.log('Main: auto-generate-caption received:', { imagePath, token, subjectAddition });
  // Generate caption
  const caption = await captioner.generateLoraCaption(filePathArg, token, subjectAddition);
  return caption;
});
  // IPC handler for exporting to AI Toolkit datasets folder
  ipcMain.handle('export-to-ai-toolkit', async (event, projectName: string, grids: Record<string, { path: string; caption: string }[]>) => {
    // Load updated settings
    settings = getSettings();
    const toolkitRoot = settings.aiToolkitDatasetsPath;
    const targetDir = path.join(toolkitRoot, projectName);
    // Create target directory
    await fs.promises.mkdir(targetDir, { recursive: true });
    // Copy each image and write captions
    for (const images of Object.values(grids)) {
      for (const img of images) {
        if (!img || !img.path) continue;
        let src = img.path;
        try {
          if (src.startsWith('file://')) {
            src = url.fileURLToPath(src);
          }
          const filename = path.basename(src);
          const destImage = path.join(targetDir, filename);
          await fs.promises.copyFile(src, destImage);
          if (img.caption && img.caption.trim()) {
            const txtName = filename.replace(/\.[^.]+$/, '.txt');
            const destText = path.join(targetDir, txtName);
            await fs.promises.writeFile(destText, img.caption.trim(), 'utf-8');
          }
        } catch (err) {
          console.error('Error exporting file to ai-toolkit:', err);
        }
      }
    }
    // Open the exported folder in the system file explorer (Windows / cross-platform)
    try {
      await shell.openPath(targetDir);
    } catch (e) {
      console.warn('Could not auto-open exported folder:', e);
    }
    return { success: true, folderPath: targetDir };
  });
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  // Clean up IPC handlers on exit
  ipcMain.removeHandler('save-project');
  ipcMain.removeHandler('load-project');
  ipcMain.removeHandler('copy-image');
  ipcMain.removeHandler('get-projects');
  ipcMain.removeHandler('copy-image-to-clipboard');
  ipcMain.removeHandler('open-image-in-explorer');
  ipcMain.removeHandler('delete-image');
  ipcMain.removeHandler('get-settings');
  ipcMain.removeHandler('set-settings');
  ipcMain.removeHandler('select-directory');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
// Handler to open a folder in the system file explorer
ipcMain.handle('open-folder-in-explorer', async (event, folderPath: string) => {
  try {
    await shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    console.error('Error opening folder in explorer:', error);
    return { success: false, error: String(error) };
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
