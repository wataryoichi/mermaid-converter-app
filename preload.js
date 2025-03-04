const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  convertMermaid: (options) => ipcRenderer.invoke('convert-mermaid', options),
  selectOutputDirectory: () => ipcRenderer.invoke('select-output-directory'),
  getOutputDirectory: () => ipcRenderer.invoke('get-output-directory')
});