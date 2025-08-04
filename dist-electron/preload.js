"use strict";
const { contextBridge, ipcRenderer } = require('electron');
let onFileDropCallback = null;
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
    loadProject: () => ipcRenderer.invoke('load-project'),
    copyImage: (projectName, sourcePath) => ipcRenderer.invoke('copy-image', projectName, sourcePath),
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
