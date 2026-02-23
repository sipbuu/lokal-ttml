const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('api', {
  openAudio: () => ipcRenderer.invoke('dialog:openAudio'),
  openLyrics: () => ipcRenderer.invoke('dialog:openLyrics'),
  saveTTML: (content, name) => ipcRenderer.invoke('dialog:saveTTML', content, name),
  readBinary: (fp) => ipcRenderer.invoke('file:readBinary', fp),
})
