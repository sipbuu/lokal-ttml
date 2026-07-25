const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn, spawnSync } = require('child_process')

let win
let nativeWaveformDecoderAvailable
let audioMetadataProbeAvailable

function hasNativeWaveformDecoder() {
  if (typeof nativeWaveformDecoderAvailable === 'boolean') return nativeWaveformDecoderAvailable
  try {
    const result = spawnSync('ffmpeg', ['-version'], { windowsHide: true, encoding: 'utf8' })
    nativeWaveformDecoderAvailable = !result.error && result.status === 0
  } catch {
    nativeWaveformDecoderAvailable = false
  }
  return nativeWaveformDecoderAvailable
}

function hasAudioMetadataProbe() {
  if (typeof audioMetadataProbeAvailable === 'boolean') return audioMetadataProbeAvailable
  try {
    const result = spawnSync('ffprobe', ['-version'], { windowsHide: true, encoding: 'utf8' })
    audioMetadataProbeAvailable = !result.error && result.status === 0
  } catch {
    audioMetadataProbeAvailable = false
  }
  return audioMetadataProbeAvailable
}

function getTagValue(tags = {}, keys = []) {
  for (const key of keys) {
    const match = Object.keys(tags).find(tag => tag.toLowerCase() === key.toLowerCase())
    const value = match ? String(tags[match] || '').trim() : ''
    if (value) return value
  }
  return ''
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  win.loadFile('index.html')
  win.webContents.on('render-process-gone', (_, details) => {
    console.error('Renderer process gone:', details)
  })
  win.webContents.on('unresponsive', () => {
    console.error('Renderer became unresponsive')
  })
}

app.whenReady().then(createWindow)
app.on('window-all-closed', () => app.quit())

function sendWindowState() {
  if (!win || win.isDestroyed()) return
  win.webContents.send('window:maximized', win.isMaximized())
}

app.on('browser-window-created', (_, browserWindow) => {
  browserWindow.on('maximize', sendWindowState)
  browserWindow.on('unmaximize', sendWindowState)
})

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

ipcMain.handle('dialog:saveLRC', async (_, content, suggestedName) => {
  const result = await dialog.showSaveDialog(win, {
    defaultPath: suggestedName || 'lyrics.lrc',
    filters: [{ name: 'LRC', extensions: ['lrc'] }]
  })
  if (result.canceled) return null
  fs.writeFileSync(result.filePath, content, 'utf8')
  return result.filePath
})

ipcMain.handle('file:readBinary', async (_, fp) => {
  return fs.readFileSync(fp).toString('base64')
})

ipcMain.handle('audio:getMetadata', async (_, fp) => {
  if (!hasAudioMetadataProbe()) return null
  return await new Promise((resolve, reject) => {
    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      fp,
    ]
    const probe = spawn('ffprobe', args, { windowsHide: true })
    const chunks = []
    let stderr = ''
    probe.stdout.on('data', chunk => chunks.push(chunk))
    probe.stderr.on('data', chunk => { stderr += chunk.toString() })
    probe.on('error', err => reject(err))
    probe.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr || `ffprobe exited with code ${code}`))
        return
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        const formatTags = parsed?.format?.tags || {}
        const audioStream = Array.isArray(parsed?.streams) ? parsed.streams.find(stream => stream.codec_type === 'audio') : null
        const streamTags = audioStream?.tags || {}
        const mergedTags = { ...formatTags, ...streamTags }
        resolve({
          title: getTagValue(mergedTags, ['title']),
          artist: getTagValue(mergedTags, ['artist', 'album_artist', 'albumartist', 'composer']),
          album: getTagValue(mergedTags, ['album']),
        })
      } catch (err) {
        reject(err)
      }
    })
  })
})

ipcMain.handle('waveform:getPeaks', async (_, fp, points = 2400) => {
  if (!hasNativeWaveformDecoder()) {
    throw new Error('Native waveform decoder is unavailable')
  }
  const safePoints = Math.max(512, Math.min(50000, Number(points) || 50000))
  const targetRate = 2000
  return await new Promise((resolve, reject) => {
    const args = [
      '-hide_banner',
      '-loglevel', 'error',
      '-i', fp,
      '-ac', '1',
      '-ar', String(targetRate),
      '-f', 'f32le',
      'pipe:1',
    ]
    const ff = spawn('ffmpeg', args, { windowsHide: true })
    const chunks = []
    let stderr = ''
    ff.stdout.on('data', chunk => chunks.push(chunk))
    ff.stderr.on('data', chunk => { stderr += chunk.toString() })
    ff.on('error', err => reject(err))
    ff.on('close', code => {
      if (code !== 0) {
        reject(new Error(stderr || `ffmpeg exited with code ${code}`))
        return
      }
      const buf = Buffer.concat(chunks)
      const totalSamples = Math.floor(buf.length / 4)
      if (!totalSamples) {
        resolve({ peaks: [], source: 'ffmpeg' })
        return
      }
      const bucketSize = Math.max(1, Math.floor(totalSamples / safePoints))
      const peaks = []
      for (let start = 0; start < totalSamples; start += bucketSize) {
        const end = Math.min(totalSamples, start + bucketSize)
        let min = 1
        let max = -1
        let sumSquares = 0
        for (let i = start; i < end; i++) {
          const value = buf.readFloatLE(i * 4)
          if (value < min) min = value
          if (value > max) max = value
          sumSquares += value * value
        }
        const count = Math.max(1, end - start)
        peaks.push({
          min: Math.max(-1, Math.min(1, min)),
          max: Math.max(-1, Math.min(1, max)),
          rms: Math.max(0.001, Math.min(1, Math.sqrt(sumSquares / count))),
        })
      }
      resolve({ peaks, source: 'ffmpeg' })
    })
  })
})

ipcMain.handle('waveform:hasNativeDecoder', async () => {
  return hasNativeWaveformDecoder()
})

ipcMain.handle('window:minimize', () => {
  if (win) win.minimize()
})

ipcMain.handle('window:toggleMaximize', () => {
  if (!win) return false
  if (win.isMaximized()) win.unmaximize()
  else win.maximize()
  return win.isMaximized()
})

ipcMain.handle('window:close', () => {
  if (win) win.close()
})

ipcMain.handle('window:isMaximized', () => {
  return win ? win.isMaximized() : false
})