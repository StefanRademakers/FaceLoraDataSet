"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const url_1 = __importDefault(require("url"));
const OpenAICaptioner_1 = require("../src/utils/OpenAICaptioner");
const settings_1 = require("./settings");
let settings = (0, settings_1.getSettings)();
// Function to get the current loraDataRoot
function getLoraDataRoot() {
    return settings.loraDataRoot;
}
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    electron_1.app.quit();
}
const createWindow = () => {
    // Preload script path (compiled into dist-electron root)
    const preloadPath = path_1.default.join(__dirname, 'preload.js');
    console.log('Loading preload script from:', preloadPath);
    const win = new electron_1.BrowserWindow({
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
    const menu = electron_1.Menu.buildFromTemplate([
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
    electron_1.Menu.setApplicationMenu(menu);
    if (process.env.VITE_DEV_SERVER_URL) {
        win.loadURL(process.env.VITE_DEV_SERVER_URL);
        win.webContents.openDevTools();
    }
    else {
        // Load built React app from dist folder (two levels up from dist-electron/electron)
        const indexPath = path_1.default.join(__dirname, '..', '..', 'dist', 'index.html');
        console.log('Loading React index.html from:', indexPath);
        win.loadFile(indexPath);
    }
    // IPC handler to save project state
    electron_1.ipcMain.handle('save-project', async (event, projectData) => {
        const projectPath = path_1.default.join(getLoraDataRoot(), projectData.projectName);
        if (!fs_1.default.existsSync(projectPath)) {
            fs_1.default.mkdirSync(projectPath, { recursive: true });
        }
        // When saving, convert image paths to be relative to the project folder
        const relativePathGrids = JSON.parse(JSON.stringify(projectData.grids)); // Deep copy
        for (const section in relativePathGrids) {
            relativePathGrids[section] = relativePathGrids[section].map((imageSlot) => {
                if (imageSlot && imageSlot.path && imageSlot.path.startsWith('file://')) {
                    const filePath = url_1.default.fileURLToPath(imageSlot.path);
                    const relativePath = path_1.default.relative(projectPath, filePath);
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
        const savePath = path_1.default.join(projectPath, 'project.json');
        try {
            fs_1.default.writeFileSync(savePath, JSON.stringify(dataToSave, null, 2));
            return { success: true, path: savePath };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Failed to save project:', error);
            return { success: false, error: message };
        }
    });
    // IPC handler to load project state
    electron_1.ipcMain.handle('load-project', async (event, projectName) => {
        if (projectName) {
            try {
                const projectFilePath = path_1.default.join(getLoraDataRoot(), projectName, 'project.json');
                const projectDir = path_1.default.dirname(projectFilePath);
                const data = JSON.parse(fs_1.default.readFileSync(projectFilePath, 'utf-8'));
                // Convert relative image names back to absolute paths for rendering
                for (const section in data.grids) {
                    data.grids[section] = data.grids[section].map((imageSlot) => {
                        if (imageSlot && imageSlot.path) {
                            const absolutePath = path_1.default.join(projectDir, imageSlot.path);
                            return { ...imageSlot, path: absolutePath };
                        }
                        return imageSlot;
                    });
                }
                return { success: true, data };
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error('Failed to load project:', error);
                return { success: false, error: message };
            }
        }
        // Fallback to opening a file dialog if no project name is provided
        const result = await electron_1.dialog.showOpenDialog({
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
            const projectDir = path_1.default.dirname(projectFilePath);
            const data = JSON.parse(fs_1.default.readFileSync(projectFilePath, 'utf-8'));
            // Convert relative image names back to absolute paths for rendering
            for (const section in data.grids) {
                data.grids[section] = data.grids[section].map((imageName) => {
                    if (imageName) {
                        return path_1.default.join(projectDir, imageName);
                    }
                    return null;
                });
            }
            return { success: true, data };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Failed to load project:', error);
            return { success: false, error: message };
        }
    });
    // IPC handler to copy an image to the project folder
    electron_1.ipcMain.handle('copy-image', async (event, projectName, sourcePath, customFileName) => {
        const projectPath = path_1.default.join(getLoraDataRoot(), projectName);
        if (!fs_1.default.existsSync(projectPath)) {
            fs_1.default.mkdirSync(projectPath, { recursive: true });
        }
        const destFileName = `${customFileName}${path_1.default.extname(sourcePath)}`; // Use custom filename with original extension
        const destPath = path_1.default.join(projectPath, destFileName);
        try {
            fs_1.default.copyFileSync(sourcePath, destPath);
            return { success: true, path: destPath };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Failed to copy file from ${sourcePath} to ${destPath}:`, error);
            return { success: false, error: message };
        }
    });
    // IPC handler to fetch the list of projects
    electron_1.ipcMain.handle('get-projects', async () => {
        try {
            const loraDataRoot = getLoraDataRoot();
            if (!fs_1.default.existsSync(loraDataRoot)) {
                fs_1.default.mkdirSync(loraDataRoot, { recursive: true });
                console.log(`Created data directory: ${loraDataRoot}`);
            }
            const projects = fs_1.default.readdirSync(loraDataRoot).filter((item) => {
                const itemPath = path_1.default.join(loraDataRoot, item);
                return fs_1.default.statSync(itemPath).isDirectory();
            });
            return projects;
        }
        catch (error) {
            console.error('Failed to fetch projects:', error);
            return [];
        }
    });
    // IPC handler to copy an image to the clipboard
    electron_1.ipcMain.handle('copy-image-to-clipboard', async (event, fileUrl) => {
        try {
            const url = new URL(fileUrl);
            let filePath = decodeURI(url.pathname);
            // On Windows, pathname starts with a slash, like /C:/...
            // We need to remove the leading slash.
            if (process.platform === 'win32' && filePath.startsWith('/')) {
                filePath = filePath.substring(1);
            }
            const image = electron_1.nativeImage.createFromPath(filePath);
            if (image.isEmpty()) {
                console.error('Failed to create nativeImage from path:', filePath);
                return { success: false, error: 'Image is empty or path is invalid.' };
            }
            electron_1.clipboard.writeImage(image);
            return { success: true };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Failed to copy image to clipboard:', error);
            return { success: false, error: message };
        }
    });
    // IPC handler to open an image in the file explorer
    electron_1.ipcMain.handle('open-image-in-explorer', async (_, filePath) => {
        try {
            const { shell } = require('electron');
            await shell.showItemInFolder(filePath);
            return { success: true };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Failed to open image in explorer:', error);
            return { success: false, error: message };
        }
    });
    // IPC handler to delete an image file
    electron_1.ipcMain.handle('delete-image', async (_, fileUrl) => {
        try {
            const { fileURLToPath } = require('url');
            const filePath = fileURLToPath(fileUrl);
            // Strip query parameters from the file path
            const sanitizedPath = filePath.split('?')[0];
            // Check if the file exists before attempting to delete
            if (fs_1.default.existsSync(sanitizedPath)) {
                fs_1.default.unlinkSync(sanitizedPath);
                console.log('File deleted:', sanitizedPath);
                return { success: true };
            }
            else {
                console.error('File does not exist:', sanitizedPath);
                return { success: false, error: 'File does not exist.' };
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error('Failed to delete file:', error);
            return { success: false, error: message };
        }
    });
    // IPC handlers for app settings
    electron_1.ipcMain.handle('get-settings', async () => {
        return (0, settings_1.getSettings)();
    });
    electron_1.ipcMain.handle('set-settings', async (event, newSettings) => {
        (0, settings_1.saveSettings)(newSettings);
        settings = newSettings;
        return { success: true };
    });
    electron_1.ipcMain.handle('select-directory', async () => {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Lora Data Root Directory',
        });
        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }
        return result.filePaths[0];
    });
    // IPC handlers for OpenAI API key
    electron_1.ipcMain.handle('get-openai-key', async () => {
        return await (0, settings_1.getOpenAIKey)();
    });
    electron_1.ipcMain.handle('set-openai-key', async (event, key) => {
        await (0, settings_1.setOpenAIKey)(key);
        return true;
    });
    // IPC handler for auto-generating captions via OpenAI
    electron_1.ipcMain.handle('auto-generate-caption', async (event, imagePath, token, subjectAddition) => {
        // Ensure API key is set
        const key = await (0, settings_1.getOpenAIKey)();
        if (!key)
            throw new Error('OpenAI API key not set');
        const captioner = new OpenAICaptioner_1.OpenAICaptioner(key);
        // Normalize file path: strip file:// or file: prefix if present
        let filePathArg = imagePath;
        try {
            if (filePathArg.startsWith('file://')) {
                filePathArg = url_1.default.fileURLToPath(filePathArg);
            }
            else if (filePathArg.startsWith('file:')) {
                filePathArg = filePathArg.replace(/^file:[\\/]+/, '');
            }
        }
        catch (e) {
            console.warn('Could not parse file URL, using original path:', imagePath, e);
        }
        console.log('Main: auto-generate-caption received:', { imagePath, token, subjectAddition });
        // Generate caption
        const caption = await captioner.generateLoraCaption(filePathArg, token, subjectAddition);
        return caption;
    });
    // IPC handler for exporting to AI Toolkit datasets folder
    electron_1.ipcMain.handle('export-to-ai-toolkit', async (event, projectName, grids) => {
        // Load updated settings
        settings = (0, settings_1.getSettings)();
        const toolkitRoot = settings.aiToolkitDatasetsPath;
        const targetDir = path_1.default.join(toolkitRoot, projectName);
        // Create target directory
        await fs_1.default.promises.mkdir(targetDir, { recursive: true });
        // Copy each image and write captions
        for (const images of Object.values(grids)) {
            for (const img of images) {
                if (!img || !img.path)
                    continue;
                let src = img.path;
                try {
                    if (src.startsWith('file://')) {
                        src = url_1.default.fileURLToPath(src);
                    }
                    const filename = path_1.default.basename(src);
                    const destImage = path_1.default.join(targetDir, filename);
                    await fs_1.default.promises.copyFile(src, destImage);
                    if (img.caption && img.caption.trim()) {
                        const txtName = filename.replace(/\.[^.]+$/, '.txt');
                        const destText = path_1.default.join(targetDir, txtName);
                        await fs_1.default.promises.writeFile(destText, img.caption.trim(), 'utf-8');
                    }
                }
                catch (err) {
                    console.error('Error exporting file to ai-toolkit:', err);
                }
            }
        }
        // Open the exported folder in the system file explorer (Windows / cross-platform)
        try {
            await electron_1.shell.openPath(targetDir);
        }
        catch (e) {
            console.warn('Could not auto-open exported folder:', e);
        }
        return { success: true, folderPath: targetDir };
    });
};
electron_1.app.on('ready', createWindow);
electron_1.app.on('window-all-closed', () => {
    // Clean up IPC handlers on exit
    electron_1.ipcMain.removeHandler('save-project');
    electron_1.ipcMain.removeHandler('load-project');
    electron_1.ipcMain.removeHandler('copy-image');
    electron_1.ipcMain.removeHandler('get-projects');
    electron_1.ipcMain.removeHandler('copy-image-to-clipboard');
    electron_1.ipcMain.removeHandler('open-image-in-explorer');
    electron_1.ipcMain.removeHandler('delete-image');
    electron_1.ipcMain.removeHandler('get-settings');
    electron_1.ipcMain.removeHandler('set-settings');
    electron_1.ipcMain.removeHandler('select-directory');
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// Handler to open a folder in the system file explorer
electron_1.ipcMain.handle('open-folder-in-explorer', async (event, folderPath) => {
    try {
        await electron_1.shell.openPath(folderPath);
        return { success: true };
    }
    catch (error) {
        console.error('Error opening folder in explorer:', error);
        return { success: false, error: String(error) };
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
