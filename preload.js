const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('api', {
  openAudio: () => ipcRenderer.invoke('dialog:openAudio'),
  openLyrics: () => ipcRenderer.invoke('dialog:openLyrics'),
  saveTTML: (content, name) => ipcRenderer.invoke('dialog:saveTTML', content, name),
  readBinary: (fp) => ipcRenderer.invoke('file:readBinary', fp),
  getAudioMetadata: (fp) => ipcRenderer.invoke('audio:getMetadata', fp),
  getWaveformPeaks: (fp, points) => ipcRenderer.invoke('waveform:getPeaks', fp, points),
  hasNativeWaveformDecoder: () => ipcRenderer.invoke('waveform:hasNativeDecoder'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggleMaximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onWindowMaximized: (fn) => ipcRenderer.on('window:maximized', (_, value) => fn(value)),
})
