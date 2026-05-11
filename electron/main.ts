import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import { getDatabase, closeDatabase } from './db'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'VoiceHub',
    backgroundColor: '#030712',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Initialize database
function initDB(): void {
  getDatabase()
}

// IPC Handlers
function registerIpcHandlers(): void {
  const db = getDatabase()

  // API Keys
  ipcMain.handle('db:getApiKeys', () => {
    return db.prepare('SELECT * FROM api_keys ORDER BY created_at DESC').all()
  })

  ipcMain.handle('db:addApiKey', (_event, key) => {
    const stmt = db.prepare(`
      INSERT INTO api_keys (provider_name, provider_slug, api_key, label, quota_total, quota_used, quota_unit, is_active, is_primary)
      VALUES (@provider_name, @provider_slug, @api_key, @label, @quota_total, @quota_used, @quota_unit, @is_active, @is_primary)
    `)
    return stmt.run(key)
  })

  ipcMain.handle('db:updateApiKey', (_event, id: number, updates) => {
    const fields = Object.keys(updates)
      .map((key) => `${key} = @${key}`)
      .join(', ')
    const stmt = db.prepare(`UPDATE api_keys SET ${fields} WHERE id = @id`)
    return stmt.run({ ...updates, id })
  })

  ipcMain.handle('db:deleteApiKey', (_event, id: number) => {
    return db.prepare('DELETE FROM api_keys WHERE id = ?').run(id)
  })

  // Usage Logs
  ipcMain.handle('db:getUsageLogs', (_event, limit = 100) => {
    return db
      .prepare(
        `SELECT ul.*, ak.provider_name, ak.label as api_label
         FROM usage_logs ul
         LEFT JOIN api_keys ak ON ul.api_key_id = ak.id
         ORDER BY ul.timestamp DESC
         LIMIT ?`
      )
      .all(limit)
  })

  ipcMain.handle('db:addUsageLog', (_event, log) => {
    const stmt = db.prepare(`
      INSERT INTO usage_logs (api_key_id, action, input_text, characters_used, duration_seconds, status)
      VALUES (@api_key_id, @action, @input_text, @characters_used, @duration_seconds, @status)
    `)
    return stmt.run(log)
  })

  // Voice Profiles
  ipcMain.handle('db:getVoiceProfiles', () => {
    return db
      .prepare(
        `SELECT vp.*, ak.provider_name
         FROM voice_profiles vp
         LEFT JOIN api_keys ak ON vp.api_key_id = ak.id
         ORDER BY vp.created_at DESC`
      )
      .all()
  })

  ipcMain.handle('db:addVoiceProfile', (_event, profile) => {
    const stmt = db.prepare(`
      INSERT INTO voice_profiles (name, api_key_id, voice_id, reference_audio_path)
      VALUES (@name, @api_key_id, @voice_id, @reference_audio_path)
    `)
    return stmt.run(profile)
  })

  ipcMain.handle('db:deleteVoiceProfile', (_event, id: number) => {
    return db.prepare('DELETE FROM voice_profiles WHERE id = ?').run(id)
  })

  // App info
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:getDataPath', () => {
    const exePath = app.getPath('exe')
    const exeDir = path.dirname(exePath)
    if (!app.isPackaged) {
      return path.join(process.cwd(), 'voicehub-data')
    }
    return path.join(exeDir, 'voicehub-data')
  })

  // File dialogs
  ipcMain.handle('dialog:selectFile', async (_event, filters) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openFile'],
      filters: filters || [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac'] }],
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('dialog:saveFile', async (_event, defaultName: string) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: defaultName,
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav'] }],
    })
    if (result.canceled) return null
    return result.filePath
  })
}

app.whenReady().then(() => {
  initDB()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
