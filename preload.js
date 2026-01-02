const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // File operations
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectOutputDir: () => ipcRenderer.invoke('select-output-dir'),
  getVideoInfo: (filePath) => ipcRenderer.invoke('get-video-info', filePath),
  
  // Get file path from File object (for drag & drop)
  // Electron adds 'path' property to File objects from drag & drop
  getFilePath: (file) => {
    // Use file.path directly (Electron exposes this for dragged files)
    if (file.path) {
      return file.path;
    }
    // Fallback to webUtils if available
    if (webUtils && webUtils.getPathForFile) {
      return webUtils.getPathForFile(file);
    }
    return null;
  },

  // Conversion
  convertToMp3: (options) => ipcRenderer.invoke('convert-to-mp3', options),
  onProgress: (callback) => {
    ipcRenderer.on('conversion-progress', (event, data) => callback(data));
  },

  // Utilities
  openOutputFolder: (path) => ipcRenderer.send('open-output-folder', path)
});
