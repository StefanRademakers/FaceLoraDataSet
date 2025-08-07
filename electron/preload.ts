const { contextBridge, ipcRenderer } = require('electron');

let onFileDropCallback: ((filePath: string) => void) | null = null;

console.log('Custom Preload Loaded:', Object.keys({
  ...contextBridge ? {} : {}
}));

contextBridge.exposeInMainWorld('electronAPI', {
  onFileDrop: (callback: (filePath: string) => void) => {
    onFileDropCallback = callback;
    return () => {
      onFileDropCallback = null;
    };
  },
  onMenuSave: (callback: () => void) => {
    ipcRenderer.on('menu-save', callback);
    return () => ipcRenderer.removeListener('menu-save', callback);
  },
  onMenuLoad: (callback: () => void) => {
    ipcRenderer.on('menu-load', callback);
    return () => ipcRenderer.removeListener('menu-load', callback);
  },
  saveProject: (state: any) => ipcRenderer.invoke('save-project', state),
  loadProject: (projectName?: string) => ipcRenderer.invoke('load-project', projectName),
  copyImage: (projectName: string, sourcePath: string, customFileName: string) => ipcRenderer.invoke('copy-image', projectName, sourcePath, customFileName),
  getProjects: () => ipcRenderer.invoke('get-projects'),
  copyImageToClipboard: (filePath: string) => ipcRenderer.invoke('copy-image-to-clipboard', filePath),
  openImageInExplorer: (filePath: string) => ipcRenderer.invoke('open-image-in-explorer', filePath),
  deleteImage: (filePath: string) => ipcRenderer.invoke('delete-image', filePath),
  // Settings APIs
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: any) => ipcRenderer.invoke('set-settings', settings),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  autoGenerateCaption: (imagePath: string, token: string, subjectAddition: string) => {
    console.log('Preload: autoGenerateCaption args:', { imagePath, token, subjectAddition });
    return ipcRenderer.invoke('auto-generate-caption', imagePath, token, subjectAddition);
  },
  getOpenAIKey: () => ipcRenderer.invoke('get-openai-key'),
  setOpenAIKey: (key: string) => ipcRenderer.invoke('set-openai-key', key),
});


// Global drop listener now directly invokes the callback
window.addEventListener('drop', (e: DragEvent) => {
  e.preventDefault();
  if (e.dataTransfer) {
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const filePath = (files[0] as any).path;
      if (filePath && onFileDropCallback) {
        console.log('Preload: Invoking onFileDropCallback with path:', filePath);
        onFileDropCallback(filePath);
      }
    }
  }
});

// Global dragover listener
window.addEventListener('dragover', (e: DragEvent) => {
  e.preventDefault();
});
