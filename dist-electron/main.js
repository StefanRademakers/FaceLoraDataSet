"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const loraDataRoot = 'D:\\LoraData';
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    electron_1.app.quit();
}
const createWindow = () => {
    const win = new electron_1.BrowserWindow({
        width: 1700,
        height: 900,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
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
        win.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    // IPC handler to save project state
    electron_1.ipcMain.handle('save-project', async (event, state) => {
        const projectPath = path_1.default.join(loraDataRoot, state.projectName);
        if (!fs_1.default.existsSync(projectPath)) {
            fs_1.default.mkdirSync(projectPath, { recursive: true });
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
                    return path_1.default.basename(decodedPath);
                }
                return imagePath; // Already a relative path or null
            });
        }
        const savePath = path_1.default.join(projectPath, 'project.json');
        try {
            fs_1.default.writeFileSync(savePath, JSON.stringify(stateToSave, null, 2));
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
                const projectFilePath = path_1.default.join(loraDataRoot, projectName, 'project.json');
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
        }
        // Fallback to opening a file dialog if no project name is provided
        const result = await electron_1.dialog.showOpenDialog({
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
        const projectPath = path_1.default.join(loraDataRoot, projectName);
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
};
electron_1.app.on('ready', createWindow);
electron_1.app.on('window-all-closed', () => {
    // Clean up IPC handlers on exit
    electron_1.ipcMain.removeHandler('save-project');
    electron_1.ipcMain.removeHandler('load-project');
    electron_1.ipcMain.removeHandler('copy-image');
    electron_1.ipcMain.removeHandler('get-projects');
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
