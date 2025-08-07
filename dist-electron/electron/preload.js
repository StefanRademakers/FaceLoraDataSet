"use strict";
const { contextBridge, ipcRenderer } = require('electron');
let onFileDropCallback = null;
console.log('Custom Preload Loaded:', Object.keys({
    ...contextBridge ? {} : {}
}));
contextBridge.exposeInMainWorld('electronAPI', {
    onFileDrop: (callback) => {
        onFileDropCallback = callback;
        return () => {
            onFileDropCallback = null;
        };
    },
    onMenuSave: (callback) => {
        ipcRenderer.on('menu-save', callback);
        return () => ipcRenderer.removeListener('menu-save', callback);
    },
    onMenuLoad: (callback) => {
        ipcRenderer.on('menu-load', callback);
        return () => ipcRenderer.removeListener('menu-load', callback);
    },
    saveProject: (state) => ipcRenderer.invoke('save-project', state),
    loadProject: (projectName) => ipcRenderer.invoke('load-project', projectName),
    copyImage: (projectName, sourcePath, customFileName) => ipcRenderer.invoke('copy-image', projectName, sourcePath, customFileName),
    getProjects: () => ipcRenderer.invoke('get-projects'),
    copyImageToClipboard: (filePath) => ipcRenderer.invoke('copy-image-to-clipboard', filePath),
    openImageInExplorer: (filePath) => ipcRenderer.invoke('open-image-in-explorer', filePath),
    deleteImage: (filePath) => ipcRenderer.invoke('delete-image', filePath),
    // Settings APIs
    getSettings: () => ipcRenderer.invoke('get-settings'),
    setSettings: (settings) => ipcRenderer.invoke('set-settings', settings),
    selectDirectory: () => ipcRenderer.invoke('select-directory'),
    autoGenerateCaption: (imagePath, token) => ipcRenderer.invoke('auto-generate-caption', imagePath, token),
    getOpenAIKey: () => ipcRenderer.invoke('get-openai-key'),
    setOpenAIKey: (key) => ipcRenderer.invoke('set-openai-key', key),
});
// Global drop listener now directly invokes the callback
window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer) {
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            const filePath = files[0].path;
            if (filePath && onFileDropCallback) {
                console.log('Preload: Invoking onFileDropCallback with path:', filePath);
                onFileDropCallback(filePath);
            }
        }
    }
});
// Global dragover listener
window.addEventListener('dragover', (e) => {
    e.preventDefault();
});
