const { contextBridge, ipcRenderer } = require('electron');

let onFileDropCallback: ((filePath: string) => void) | null = null;

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
  loadProject: () => ipcRenderer.invoke('load-project'),
  copyImage: (projectName: string, sourcePath: string) => ipcRenderer.invoke('copy-image', projectName, sourcePath),
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
