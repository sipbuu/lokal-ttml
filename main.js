const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')

let win

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0a0a',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#0a0a0a', symbolColor: '#666', height: 36 },
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('index.html')
  Menu.setApplicationMenu(null)
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())

ipcMain.handle('dialog:openAudio', async () => {
  const result = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Audio', extensions: ['mp3', 'flac', 'm4a', 'ogg', 'wav', 'aac', 'opus'] }],
    properties: ['openFile']
  })
  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('dialog:openLyrics', async () => {
  const result = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Lyrics', extensions: ['lrc', 'txt', 'ttml', 'xml'] }],
    properties: ['openFile']
  })
  if (result.canceled) return null
  const fp = result.filePaths[0]
  return { path: fp, content: fs.readFileSync(fp, 'utf8'), ext: path.extname(fp).slice(1).toLowerCase() }
})

ipcMain.handle('dialog:saveTTML', async (_, content, suggestedName) => {
  const result = await dialog.showSaveDialog(win, {
    defaultPath: suggestedName || 'lyrics.ttml',
    filters: [{ name: 'TTML', extensions: ['ttml'] }]
  })
  if (result.canceled) return null
  fs.writeFileSync(result.filePath, content, 'utf8')
  return result.filePath
})

ipcMain.handle('file:readBinary', async (_, fp) => {
  return fs.readFileSync(fp).toString('base64')
})
