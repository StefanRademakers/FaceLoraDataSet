# How to Enable Full File Path Access in Electron (for AI Agents)

This document provides explicit, step-by-step instructions for enabling reliable file path access in an Electron project. It is designed for AI agents or developers who need to implement this feature in a new or existing Electron app.

---

## 1. Electron Security and File Path Access

- **File paths from drag-and-drop** work on Windows/Linux, but **not on macOS** due to OS privacy restrictions.
- **File paths from `<input type="file">`** are not reliably available in the renderer for security reasons.
- **The only cross-platform, reliable way** to get file paths is to use Electron's native file dialog via IPC.

---

## 2. Main Process: Setup IPC and File Dialog

In your `main.js`:

```js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

app.whenReady().then(() => {
  const win = new BrowserWindow({
    webPreferences: {
      contextIsolation: true, // Required for security
      nodeIntegration: false, // Required for security
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,     // Required for file path access
      allowFileAccess: true   // Required for file path access
    }
  });
  win.loadFile('index.html');

  // Handle files sent from renderer (drag-and-drop or dialog)
  ipcMain.on('files-dropped', (event, files) => {
    console.log('Main Process Received Files:', files);
  });

  // Handle request to open native file dialog
  ipcMain.on('open-file-dialog', async (event) => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections']
    });
    if (!result.canceled) {
      const files = result.filePaths.map(filePath => ({
        name: path.basename(filePath),
        path: filePath
      }));
      event.sender.send('selected-files', files);
    }
  });
});
```

---

## 3. Preload Script: Expose Minimal API

In your `preload.js`:

```js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('fileBridge', {
  // Send files (from drag-and-drop or dialog) to the main process
  sendFiles: (files) => {
    const fileInfos = Array.from(files).map(file => ({
      name: file.name,
      path: file.path || 'undefined'
    }));
    ipcRenderer.send('files-dropped', fileInfos);
  },
  // Ask the main process to open the native file dialog
  openFileDialog: () => {
    ipcRenderer.send('open-file-dialog');
  },
  // Listen for files selected via the Electron dialog
  onFilesSelected: (callback) => {
    ipcRenderer.on('selected-files', (event, files) => {
      callback(files);
    });
  }
});

// Drag-and-drop support (file.path is undefined on macOS)
window.addEventListener('drop', (e) => {
  e.preventDefault();
  const files = Array.from(e.dataTransfer?.files || []);
  const fileData = files.map(file => ({
    name: file.name,
    path: file.path || '(missing)'
  }));
  ipcRenderer.send('files-dropped', fileData);
});
window.addEventListener('dragover', (e) => {
  e.preventDefault();
});
```

---

## 4. Renderer (index.html): Minimal UI Example

```html
<button id="electronFileDialog">Choose File (Electron Dialog)</button>
<div id="dropZone" style="width:100%;height:100px;border:2px dashed #888;display:flex;align-items:center;justify-content:center;margin:16px 0;">Drag & Drop files here</div>
<pre id="output"></pre>
<script>
  const output = document.getElementById('output');
  const dropZone = document.getElementById('dropZone');

  // Electron dialog
  document.getElementById('electronFileDialog').addEventListener('click', () => {
    window.fileBridge.openFileDialog();
  });
  window.fileBridge.onFilesSelected((files) => {
    output.textContent = 'Electron dialog selected files:\n' + files.map(f => `${f.name} (${f.path})`).join('\n');
    window.fileBridge.sendFiles(files);
  });

  // Drag-and-drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.background = '#eef';
  });
  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.background = '';
  });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.background = '';
    const files = e.dataTransfer.files;
    output.textContent = 'Dropped files:\n' + Array.from(files).map(f => `${f.name} (${f.path})`).join('\n');
    window.fileBridge.sendFiles(files);
  });
</script>
```

---

## 5. Key Points for AI Agents

- **Always use IPC and Electron's dialog for file path access.**
- **Do not rely on `<input type="file">` for file paths.**
- **Drag-and-drop is not reliable on macOS for file paths.**
- **Set `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: false`, and `allowFileAccess: true` in `webPreferences`.**
- **Expose only minimal, secure APIs via `contextBridge`.**

---

## 6. Troubleshooting

- If file paths are missing, check your Electron version and all `webPreferences` settings.
- Ensure your preload script is correctly loaded and contextIsolation is enabled.
- On macOS, file paths from drag-and-drop will always be missing due to OS restrictions—use the dialog.

---

**This approach is robust, secure, and works cross-platform (with noted macOS limitations for drag-and-drop).**
