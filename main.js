const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn, spawnSync } = require('child_process')

let win
let nativeWaveformDecoderAvailable
let audioMetadataProbeAvailable
let allowClose = false

const MAX_AUTOSAVES_PER_SONG = 20

function getProjectsDir() {
  const dir = path.join(app.getPath('documents'), 'Lokal TTML Editor', 'Projects')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getAutosavesDir() {
  const dir = path.join(getProjectsDir(), 'Autosaves')
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function sanitizeFileBase(name) {
  const safe = String(name || 'Untitled').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80)
  return safe || 'Untitled'
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/:/g, '-').replace(/\..+/, '')
}

function pruneOldAutosaves(base) {
  const dir = getAutosavesDir()
  let entries = []
  try {
    entries = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.autosave.ltproj') && f.startsWith(`${base} - `))
  } catch {
    return
  }
  if (entries.length <= MAX_AUTOSAVES_PER_SONG) return
  const withStats = entries.map(f => {
    const fp = path.join(dir, f)
    let mtimeMs = 0
    try { mtimeMs = fs.statSync(fp).mtimeMs } catch {}
    return { fp, mtimeMs }
  }).sort((a, b) => b.mtimeMs - a.mtimeMs)
  withStats.slice(MAX_AUTOSAVES_PER_SONG).forEach(({ fp }) => {
    try { fs.unlinkSync(fp) } catch {}
  })
}

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
  win.on('close', (e) => {
    if (allowClose) return
    e.preventDefault()
    win.webContents.send('app:confirm-close')
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

ipcMain.handle('dialog:saveTTML', async (_, content, suggestedName, defaultDir) => {
  const result = await dialog.showSaveDialog(win, {
    defaultPath: defaultDir ? path.join(defaultDir, suggestedName || 'lyrics.ttml') : (suggestedName || 'lyrics.ttml'),
    filters: [{ name: 'TTML', extensions: ['ttml'] }]
  })
  if (result.canceled) return null
  fs.writeFileSync(result.filePath, content, 'utf8')
  return result.filePath
})

ipcMain.handle('dialog:saveLRC', async (_, content, suggestedName, defaultDir) => {
  const result = await dialog.showSaveDialog(win, {
    defaultPath: defaultDir ? path.join(defaultDir, suggestedName || 'lyrics.lrc') : (suggestedName || 'lyrics.lrc'),
    filters: [{ name: 'LRC', extensions: ['lrc'] }]
  })
  if (result.canceled) return null
  fs.writeFileSync(result.filePath, content, 'utf8')
  return result.filePath
})

ipcMain.handle('file:writeDirect', async (_, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf8')
    return true
  } catch {
    return false
  }
})

ipcMain.handle('app:getVersion', () => app.getVersion())

ipcMain.handle('app:getPlatform', () => ({
  platform: process.platform,
  arch: process.arch,
}))

ipcMain.handle('app:openExternal', async (_, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url)
    return true
  }
  return false
})

ipcMain.handle('file:readBinary', async (_, fp) => {
  return fs.readFileSync(fp).toString('base64')
})

ipcMain.handle('file:exists', async (_, fp) => {
  try { return fs.existsSync(fp) } catch { return false }
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

ipcMain.handle('window:confirmCloseResult', (_, shouldClose) => {
  if (shouldClose && win) {
    allowClose = true
    win.close()
  }
})

ipcMain.handle('window:isMaximized', () => {
  return win ? win.isMaximized() : false
})

ipcMain.handle('project:getDir', async () => getProjectsDir())

ipcMain.handle('project:autosave', async (_, name, jsonContent) => {
  const dir = getAutosavesDir()
  const base = sanitizeFileBase(name)
  const fp = path.join(dir, `${base} - ${timestampSlug()}.autosave.ltproj`)
  fs.writeFileSync(fp, jsonContent, 'utf8')
  pruneOldAutosaves(base)
  return fp
})

ipcMain.handle('project:save', async (_, filePath, jsonContent) => {
  fs.writeFileSync(filePath, jsonContent, 'utf8')
  return filePath
})

ipcMain.handle('project:saveAs', async (_, jsonContent, suggestedName) => {
  const dir = getProjectsDir()
  const result = await dialog.showSaveDialog(win, {
    defaultPath: path.join(dir, suggestedName || 'project.ltproj'),
    filters: [{ name: 'Lokal TTML Project', extensions: ['ltproj'] }, { name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled) return null
  fs.writeFileSync(result.filePath, jsonContent, 'utf8')
  return result.filePath
})

ipcMain.handle('project:openDialog', async () => {
  const dir = getProjectsDir()
  const result = await dialog.showOpenDialog(win, {
    defaultPath: dir,
    filters: [{ name: 'Lokal TTML Project', extensions: ['ltproj', 'json'] }],
    properties: ['openFile']
  })
  if (result.canceled) return null
  const fp = result.filePaths[0]
  return { path: fp, content: fs.readFileSync(fp, 'utf8') }
})

ipcMain.handle('theme:saveAs', async (_, jsonContent, suggestedName) => {
  const result = await dialog.showSaveDialog(win, {
    defaultPath: suggestedName || 'theme.lttheme',
    filters: [{ name: 'Lokal TTML Theme', extensions: ['lttheme'] }, { name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled) return null
  fs.writeFileSync(result.filePath, jsonContent, 'utf8')
  return result.filePath
})

ipcMain.handle('theme:openDialog', async () => {
  const result = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Lokal TTML Theme', extensions: ['lttheme', 'json'] }],
    properties: ['openFile']
  })
  if (result.canceled) return null
  const fp = result.filePaths[0]
  return { path: fp, content: fs.readFileSync(fp, 'utf8') }
})

function readProjectFileMeta(fp) {
  let stat
  try { stat = fs.statSync(fp) } catch { return null }
  let meta = { name: path.basename(fp).replace(/\.ltproj$/i, '') }
  try {
    const parsed = JSON.parse(fs.readFileSync(fp, 'utf8'))
    const linesArr = Array.isArray(parsed.snapshot?.lines) ? parsed.snapshot.lines : []
    let totalWords = 0, timedWords = 0
    for (const line of linesArr) {
      for (const bucket of [line.words, line.bgWords, line.duoWords]) {
        if (!Array.isArray(bucket)) continue
        for (const w of bucket) {
          totalWords++
          if (w && w.timingEdited && w.time != null && w.end != null) timedWords++
        }
      }
    }
    meta = {
      name: parsed.name || meta.name,
      audioFileName: parsed.snapshot?.audioFileName || '',
      lineCount: linesArr.length,
      totalWords,
      timedWords,
      progressPct: totalWords ? Math.round(100 * timedWords / totalWords) : 0,
      tapTimingCompleted: !!parsed.snapshot?.tapTimingCompleted,
      savedAt: parsed.savedAt || stat.mtimeMs,
    }
  } catch {}
  return { path: fp, mtimeMs: stat.mtimeMs, ...meta }
}

ipcMain.handle('project:list', async () => {
  const dir = getProjectsDir()
  let entries = []
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.ltproj'))
      .map(e => e.name)
  } catch {
    return []
  }
  return entries.map(f => readProjectFileMeta(path.join(dir, f))).filter(Boolean).sort((a, b) => b.mtimeMs - a.mtimeMs)
})

ipcMain.handle('project:listAutosaves', async () => {
  const dir = getAutosavesDir()
  let entries = []
  try {
    entries = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.autosave.ltproj'))
  } catch {
    return []
  }
  return entries.map(f => readProjectFileMeta(path.join(dir, f))).filter(Boolean).sort((a, b) => b.mtimeMs - a.mtimeMs)
})

ipcMain.handle('project:load', async (_, filePath) => {
  return { path: filePath, content: fs.readFileSync(filePath, 'utf8') }
})

ipcMain.handle('project:delete', async (_, filePath) => {
  try { fs.unlinkSync(filePath) } catch {}
  return true
})

ipcMain.handle('project:deleteAutosavesForSong', async (_, name) => {
  const dir = getAutosavesDir()
  const base = sanitizeFileBase(name)
  let entries = []
  try {
    entries = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.autosave.ltproj') && f.startsWith(`${base} - `))
  } catch {
    return 0
  }
  entries.forEach(f => {
    try { fs.unlinkSync(path.join(dir, f)) } catch {}
  })
  return entries.length
})

ipcMain.handle('shell:showInFolder', async (_, filePath) => {
  try {
    shell.showItemInFolder(filePath)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('shell:openProjectsFolder', async () => {
  try {
    await shell.openPath(getProjectsDir())
    return true
  } catch {
    return false
  }
})