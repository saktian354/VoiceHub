import { app, BrowserWindow, ipcMain, dialog, net } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import axios from 'axios'
import FormData from 'form-data'
import { getDatabase, closeDatabase } from './db'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function getDataPath(): string {
  const exePath = app.getPath('exe')
  const exeDir = path.dirname(exePath)
  if (!app.isPackaged) {
    return path.join(process.cwd(), 'voicehub-data')
  }
  return path.join(exeDir, 'voicehub-data')
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
    const result = db.prepare('DELETE FROM api_keys WHERE id = ?').run(id)
    const wasPrimary = db.prepare('SELECT COUNT(*) as cnt FROM api_keys WHERE is_primary = 1').get() as { cnt: number }
    if (wasPrimary.cnt === 0) {
      const firstActive = db.prepare('SELECT id FROM api_keys WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1').get() as { id: number } | undefined
      if (firstActive) {
        db.prepare('UPDATE api_keys SET is_primary = 1 WHERE id = ?').run(firstActive.id)
      }
    }
    return result
  })

  ipcMain.handle('db:setPrimary', (_event, id: number) => {
    db.prepare('UPDATE api_keys SET is_primary = 0').run()
    db.prepare('UPDATE api_keys SET is_primary = 1 WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle('db:testConnection', async (_event, provider: string, apiKey: string, baseUrl?: string) => {
    try {
      let url: string
      const headers: Record<string, string> = {}

      switch (provider) {
        case 'ttsai':
          url = 'https://api.tts.ai/v1/voices'
          headers['Authorization'] = `Bearer ${apiKey}`
          break
        case 'fishaudio':
          url = 'https://api.fish.audio/model'
          headers['Authorization'] = `Bearer ${apiKey}`
          break
        case 'elevenlabs':
          url = 'https://api.elevenlabs.io/v1/user'
          headers['xi-api-key'] = apiKey
          break
        case 'custom':
          if (!baseUrl) return { success: false, message: 'Base URL is required for custom provider' }
          url = baseUrl
          headers['Authorization'] = `Bearer ${apiKey}`
          break
        default:
          return { success: false, message: `Unknown provider: ${provider}` }
      }

      return new Promise<{ success: boolean; message: string }>((resolve) => {
        const request = net.request({ url, method: 'GET' })
        Object.entries(headers).forEach(([key, value]) => {
          request.setHeader(key, value)
        })

        request.on('response', (response) => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            resolve({ success: true, message: 'Connection successful' })
          } else {
            resolve({ success: false, message: `HTTP ${response.statusCode}: ${response.statusMessage || 'Request failed'}` })
          }
        })

        request.on('error', (error) => {
          resolve({ success: false, message: error.message })
        })

        request.end()
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, message }
    }
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

  // Dashboard
  ipcMain.handle('dashboard:getStats', () => {
    const today = new Date().toISOString().slice(0, 10)
    const now = new Date()
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

    const todayGenerates = db.prepare(
      `SELECT COUNT(*) as count FROM usage_logs WHERE DATE(timestamp) = ? AND status = 'success'`
    ).get(today) as { count: number }

    const monthChars = db.prepare(
      `SELECT COALESCE(SUM(characters_used), 0) as total FROM usage_logs WHERE DATE(timestamp) >= ? AND status = 'success'`
    ).get(firstOfMonth) as { total: number }

    const activeKeys = db.prepare(
      `SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1`
    ).get() as { count: number }

    const profileCount = db.prepare(
      `SELECT COUNT(*) as count FROM voice_profiles`
    ).get() as { count: number }

    const recentLogs = db.prepare(
      `SELECT ul.*, ak.provider_name, ak.label as api_label
       FROM usage_logs ul
       LEFT JOIN api_keys ak ON ul.api_key_id = ak.id
       ORDER BY ul.timestamp DESC
       LIMIT 5`
    ).all()

    const apiKeysStatus = db.prepare(
      `SELECT id, label, provider_name, provider_slug, quota_total, quota_used, quota_unit, is_active
       FROM api_keys ORDER BY created_at DESC`
    ).all()

    return {
      todayGenerates: todayGenerates.count,
      monthCharacters: monthChars.total,
      activeApiKeys: activeKeys.count,
      voiceProfileCount: profileCount.count,
      recentLogs,
      apiKeysStatus,
    }
  })

  ipcMain.handle('dashboard:getChartData', () => {
    const days: Array<{ date: string; dayLabel: string; characters: number; generates: number }> = []
    const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayLabel = dayLabels[d.getDay()]

      const row = db.prepare(
        `SELECT COALESCE(SUM(characters_used), 0) as characters, COUNT(*) as generates
         FROM usage_logs WHERE DATE(timestamp) = ? AND status = 'success'`
      ).get(dateStr) as { characters: number; generates: number }

      days.push({
        date: dateStr,
        dayLabel,
        characters: row.characters,
        generates: row.generates,
      })
    }

    return days
  })

  // Settings
  ipcMain.handle('settings:getAll', () => {
    const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
    const result: Record<string, string> = {}
    for (const row of rows) {
      result[row.key] = row.value
    }
    return result
  })

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    return { success: true }
  })

  ipcMain.handle('settings:clearHistory', (_event) => {
    db.prepare('DELETE FROM usage_logs').run()
    return { success: true }
  })

  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory'],
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  // Auto-Switch: get next available API
  ipcMain.handle('tts:getNextAvailableApi', (_event, currentApiId: number) => {
    const candidates = db.prepare(
      `SELECT * FROM api_keys
       WHERE is_active = 1 AND id != ?
       AND (quota_total = 0 OR quota_used < quota_total)
       ORDER BY is_primary DESC, quota_used ASC`
    ).all(currentApiId)
    return candidates.length > 0 ? candidates[0] : null
  })

  // App info
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion()
  })

  ipcMain.handle('app:getDataPath', () => {
    return getDataPath()
  })

  // TTS Operations
  ipcMain.handle('tts:generate', async (_event, apiKeyRecord, ttsRequest) => {
    const provider = apiKeyRecord.provider_slug as string
    const apiKey = apiKeyRecord.api_key as string
    const baseUrl = apiKeyRecord.base_url as string | undefined

    try {
      const startTime = Date.now()

      let url: string
      let headers: Record<string, string> = {}
      let body: Record<string, unknown>
      let responseType = 'arraybuffer'

      switch (provider) {
        case 'ttsai':
          url = 'https://api.tts.ai/v1/tts'
          headers = { Authorization: `Bearer ${apiKey}` }
          body = {
            text: ttsRequest.text,
            voice_id: ttsRequest.voiceId,
            speed: ttsRequest.speed ?? 1.0,
            output_format: ttsRequest.outputFormat ?? 'mp3',
            language: ttsRequest.language,
          }
          break
        case 'fishaudio':
          url = 'https://api.fish.audio/v1/tts'
          headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
          body = {
            text: ttsRequest.text,
            reference_id: ttsRequest.voiceId,
            format: ttsRequest.outputFormat ?? 'mp3',
            latency: 'normal',
          }
          break
        case 'elevenlabs':
          url = `https://api.elevenlabs.io/v1/text-to-speech/${ttsRequest.voiceId}`
          headers = { 'xi-api-key': apiKey, Accept: 'audio/mpeg' }
          body = {
            text: ttsRequest.text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
          }
          break
        default:
          url = `${baseUrl || ''}/v1/audio/speech`
          headers = { Authorization: `Bearer ${apiKey}` }
          body = {
            model: 'tts-1',
            input: ttsRequest.text,
            voice: ttsRequest.voiceId,
            speed: ttsRequest.speed ?? 1.0,
            response_format: ttsRequest.outputFormat ?? 'mp3',
          }
          break
      }

      const response = await axios.post(url, body, {
        headers,
        responseType,
        timeout: 30000,
      })

      const durationSeconds = (Date.now() - startTime) / 1000
      const audioArray = Array.from(new Uint8Array(response.data))

      // Log usage
      db.prepare(`
        INSERT INTO usage_logs (api_key_id, action, input_text, characters_used, duration_seconds, status)
        VALUES (?, 'tts', ?, ?, ?, 'success')
      `).run(apiKeyRecord.id, ttsRequest.text, ttsRequest.text.length, durationSeconds)

      // Update quota
      const currentKey = db.prepare('SELECT quota_used FROM api_keys WHERE id = ?').get(apiKeyRecord.id) as { quota_used: number } | undefined
      if (currentKey) {
        db.prepare('UPDATE api_keys SET quota_used = ? WHERE id = ?').run(
          (currentKey.quota_used || 0) + ttsRequest.text.length,
          apiKeyRecord.id
        )
      }

      return {
        success: true,
        audioData: audioArray,
        charactersUsed: ttsRequest.text.length,
      }
    } catch (error: unknown) {
      const durationSeconds = 0
      db.prepare(`
        INSERT INTO usage_logs (api_key_id, action, input_text, characters_used, duration_seconds, status)
        VALUES (?, 'tts', ?, ?, ?, 'failed')
      `).run(apiKeyRecord.id, ttsRequest.text, ttsRequest.text.length, durationSeconds)

      const axiosError = error as { response?: { status?: number }; code?: string; message?: string }
      let errorMsg = 'Terjadi kesalahan yang tidak diketahui.'
      if (axiosError.code === 'ECONNABORTED') {
        errorMsg = 'Koneksi timeout. Periksa jaringan Anda dan coba lagi.'
      } else if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
        errorMsg = 'Gagal terhubung ke server. Periksa koneksi internet Anda.'
      } else {
        const status = axiosError.response?.status
        switch (status) {
          case 401: errorMsg = 'API key tidak valid. Periksa kembali API key Anda.'; break
          case 402: errorMsg = 'Kuota habis. Silakan upgrade paket atau tambah kredit.'; break
          case 429: errorMsg = 'Terlalu banyak permintaan. Tunggu beberapa saat dan coba lagi.'; break
          case 500: case 502: case 503: errorMsg = 'Server provider sedang bermasalah. Coba lagi nanti.'; break
          default: errorMsg = `Terjadi kesalahan (HTTP ${status}). Coba lagi nanti.`
        }
      }

      return {
        success: false,
        charactersUsed: ttsRequest.text.length,
        error: errorMsg,
      }
    }
  })

  ipcMain.handle('tts:getVoices', async (_event, apiKeyRecord) => {
    const provider = apiKeyRecord.provider_slug as string
    const apiKey = apiKeyRecord.api_key as string
    const baseUrl = apiKeyRecord.base_url as string | undefined

    try {
      let url: string
      const headers: Record<string, string> = {}

      switch (provider) {
        case 'ttsai':
          url = 'https://api.tts.ai/v1/voices'
          headers['Authorization'] = `Bearer ${apiKey}`
          break
        case 'fishaudio':
          url = 'https://api.fish.audio/model'
          headers['Authorization'] = `Bearer ${apiKey}`
          break
        case 'elevenlabs':
          url = 'https://api.elevenlabs.io/v1/voices'
          headers['xi-api-key'] = apiKey
          break
        default:
          url = `${baseUrl || ''}/v1/voices`
          headers['Authorization'] = `Bearer ${apiKey}`
          break
      }

      const response = await axios.get(url, { headers, timeout: 30000 })
      const data = response.data

      let voices: Array<{ id: string; name: string; language: string; gender: string; preview_url?: string }> = []

      if (provider === 'elevenlabs') {
        const items = Array.isArray(data.voices) ? data.voices : []
        voices = items.map((v: Record<string, unknown>) => {
          const labels = (v.labels ?? {}) as Record<string, string>
          return {
            id: String(v.voice_id ?? ''),
            name: String(v.name ?? 'Unknown'),
            language: String(labels.language ?? labels.accent ?? 'en'),
            gender: String(labels.gender ?? 'neutral'),
            preview_url: v.preview_url ? String(v.preview_url) : undefined,
          }
        })
      } else if (provider === 'fishaudio') {
        const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []
        voices = items.map((v: Record<string, unknown>) => ({
          id: String(v._id ?? v.id ?? ''),
          name: String(v.title ?? v.name ?? 'Unknown'),
          language: String(Array.isArray(v.languages) && v.languages.length > 0 ? v.languages[0] : (v.language ?? 'en')),
          gender: 'neutral',
          preview_url: v.cover_image ? String(v.cover_image) : undefined,
        }))
      } else {
        const items = Array.isArray(data.voices) ? data.voices : Array.isArray(data) ? data : []
        voices = items.map((v: Record<string, unknown>) => ({
          id: String(v.id ?? v.voice_id ?? ''),
          name: String(v.name ?? 'Unknown'),
          language: String(v.language ?? 'en'),
          gender: String(v.gender ?? 'neutral'),
          preview_url: v.preview_url ? String(v.preview_url) : undefined,
        }))
      }

      return { success: true, voices }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number }; code?: string; message?: string }
      let errorMsg = 'Gagal mengambil daftar suara.'
      if (axiosError.response?.status === 401) {
        errorMsg = 'API key tidak valid.'
      } else if (axiosError.code === 'ERR_NETWORK') {
        errorMsg = 'Gagal terhubung ke server.'
      }
      return { success: false, voices: [], error: errorMsg }
    }
  })

  ipcMain.handle('api:checkQuota', async (_event, apiKeyRecord) => {
    const provider = apiKeyRecord.provider_slug as string
    const apiKey = apiKeyRecord.api_key as string
    const baseUrl = apiKeyRecord.base_url as string | undefined

    try {
      let url: string
      const headers: Record<string, string> = {}

      switch (provider) {
        case 'ttsai':
          url = 'https://api.tts.ai/v1/account'
          headers['Authorization'] = `Bearer ${apiKey}`
          break
        case 'fishaudio':
          url = 'https://api.fish.audio/wallet/self/api-credit'
          headers['Authorization'] = `Bearer ${apiKey}`
          break
        case 'elevenlabs':
          url = 'https://api.elevenlabs.io/v1/user/subscription'
          headers['xi-api-key'] = apiKey
          break
        default:
          url = `${baseUrl || ''}/v1/usage`
          headers['Authorization'] = `Bearer ${apiKey}`
          break
      }

      const response = await axios.get(url, { headers, timeout: 30000 })
      const data = response.data

      let used = 0
      let total = 0
      let unit = 'characters'

      if (provider === 'elevenlabs') {
        used = Number(data.character_count ?? 0)
        total = Number(data.character_limit ?? 0)
        unit = 'characters'
      } else if (provider === 'fishaudio') {
        used = Number(data.used ?? 0)
        total = Number(data.total ?? 0)
        unit = 'credits'
      } else if (provider === 'ttsai') {
        used = Number(data.characters_used ?? data.usage ?? 0)
        total = Number(data.characters_limit ?? data.quota ?? 0)
        unit = 'characters'
      } else {
        used = Number(data.used ?? data.total_usage ?? 0)
        total = Number(data.total ?? data.hard_limit ?? 0)
        unit = String(data.unit ?? 'credits')
      }

      // Update DB
      db.prepare('UPDATE api_keys SET quota_used = ?, quota_total = ?, quota_unit = ? WHERE id = ?').run(
        used, total, unit, apiKeyRecord.id
      )

      return { success: true, quota: { used, total, unit } }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number }; message?: string }
      return {
        success: false,
        error: axiosError.response?.status === 401
          ? 'API key tidak valid.'
          : 'Gagal mengambil informasi kuota.',
      }
    }
  })

  // Audio file operations
  ipcMain.handle('audio:saveTempAudio', (_event, audioData: number[], format: string) => {
    try {
      const dataPath = getDataPath()
      const tempDir = path.join(dataPath, 'temp_audio')
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }
      const filename = `${Date.now()}.${format}`
      const filePath = path.join(tempDir, filename)
      const buffer = Buffer.from(audioData)
      fs.writeFileSync(filePath, buffer)
      return { success: true, filePath }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('audio:saveToFile', async (_event, audioData: number[], defaultName: string) => {
    try {
      const result = await dialog.showSaveDialog(mainWindow!, {
        defaultPath: defaultName,
        filters: [
          { name: 'MP3 Audio', extensions: ['mp3'] },
          { name: 'WAV Audio', extensions: ['wav'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      if (result.canceled || !result.filePath) return { success: false, canceled: true }

      const buffer = Buffer.from(audioData)
      fs.writeFileSync(result.filePath, buffer)
      return { success: true, filePath: result.filePath }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('audio:readFile', (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' }
      const buffer = fs.readFileSync(filePath)
      return { success: true, audioData: Array.from(new Uint8Array(buffer)) }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('audio:cleanupTemp', () => {
    try {
      const dataPath = getDataPath()
      const tempDir = path.join(dataPath, 'temp_audio')
      if (!fs.existsSync(tempDir)) return { success: true, deleted: 0 }

      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000
      const files = fs.readdirSync(tempDir)
      let deleted = 0

      for (const file of files) {
        const filePath = path.join(tempDir, file)
        const stat = fs.statSync(filePath)
        if (now - stat.mtimeMs > maxAge) {
          fs.unlinkSync(filePath)
          deleted++
        }
      }

      return { success: true, deleted }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('db:deleteUsageLog', (_event, id: number) => {
    return db.prepare('DELETE FROM usage_logs WHERE id = ?').run(id)
  })

  // Voice Cloning Operations
  ipcMain.handle('voice:copyReferenceAudio', (_event, sourcePath: string) => {
    try {
      const dataPath = getDataPath()
      const refDir = path.join(dataPath, 'voice_references')
      if (!fs.existsSync(refDir)) {
        fs.mkdirSync(refDir, { recursive: true })
      }
      const ext = path.extname(sourcePath)
      const baseName = path.basename(sourcePath, ext)
      const destFilename = `${Date.now()}_${baseName}${ext}`
      const destPath = path.join(refDir, destFilename)
      fs.copyFileSync(sourcePath, destPath)
      return { success: true, filePath: destPath }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('voice:getAudioInfo', (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) return { success: false, error: 'File tidak ditemukan' }
      const stat = fs.statSync(filePath)
      const sizeInMB = stat.size / (1024 * 1024)
      const ext = path.extname(filePath).toLowerCase().replace('.', '')
      return {
        success: true,
        info: {
          fileName: path.basename(filePath),
          sizeInMB: Math.round(sizeInMB * 100) / 100,
          format: ext,
          filePath,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('voice:clone', async (_event, apiKeyRecord, cloneRequest: { name: string; referenceAudioPath: string; description?: string }) => {
    const provider = apiKeyRecord.provider_slug as string
    const apiKey = apiKeyRecord.api_key as string

    if (provider !== 'fishaudio' && provider !== 'elevenlabs') {
      return { success: false, error: 'Provider ini tidak mendukung voice cloning. Gunakan Fish Audio atau ElevenLabs.' }
    }

    try {
      if (!fs.existsSync(cloneRequest.referenceAudioPath)) {
        return { success: false, error: 'File audio referensi tidak ditemukan.' }
      }

      const fileBuffer = fs.readFileSync(cloneRequest.referenceAudioPath)
      const fileName = path.basename(cloneRequest.referenceAudioPath)

      let voiceId = ''

      if (provider === 'fishaudio') {
        const form = new FormData()
        form.append('visibility', 'private')
        form.append('type', 'tts')
        form.append('title', cloneRequest.name)
        if (cloneRequest.description) {
          form.append('description', cloneRequest.description)
        }
        form.append('voices', fileBuffer, { filename: fileName, contentType: 'audio/mpeg' })

        const response = await axios.post('https://api.fish.audio/model', form, {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 120000,
        })

        voiceId = String(response.data._id || response.data.id || '')
      } else if (provider === 'elevenlabs') {
        const form = new FormData()
        form.append('name', cloneRequest.name)
        if (cloneRequest.description) {
          form.append('description', cloneRequest.description)
        }
        form.append('files', fileBuffer, { filename: fileName, contentType: 'audio/mpeg' })

        const response = await axios.post('https://api.elevenlabs.io/v1/voices/add', form, {
          headers: {
            ...form.getHeaders(),
            'xi-api-key': apiKey,
          },
          timeout: 120000,
        })

        voiceId = String(response.data.voice_id || '')
      }

      if (!voiceId) {
        return { success: false, error: 'Gagal mendapatkan voice ID dari provider.' }
      }

      // Save voice profile to DB
      const refResult = db.prepare(`
        INSERT INTO voice_profiles (name, api_key_id, voice_id, reference_audio_path)
        VALUES (?, ?, ?, ?)
      `).run(cloneRequest.name, apiKeyRecord.id, voiceId, cloneRequest.referenceAudioPath)

      // Log usage
      db.prepare(`
        INSERT INTO usage_logs (api_key_id, action, input_text, characters_used, duration_seconds, status)
        VALUES (?, 'clone', ?, 0, 0, 'success')
      `).run(apiKeyRecord.id, `Voice cloning: ${cloneRequest.name}`)

      return {
        success: true,
        voiceId,
        profileId: Number(refResult.lastInsertRowid),
      }
    } catch (error: unknown) {
      // Log failure
      db.prepare(`
        INSERT INTO usage_logs (api_key_id, action, input_text, characters_used, duration_seconds, status)
        VALUES (?, 'clone', ?, 0, 0, 'failed')
      `).run(apiKeyRecord.id, `Voice cloning: ${cloneRequest.name}`)

      const axiosError = error as { response?: { status?: number; data?: { detail?: { message?: string }; error?: string } }; code?: string; message?: string }
      let errorMsg = 'Terjadi kesalahan saat cloning suara.'
      if (axiosError.code === 'ECONNABORTED') {
        errorMsg = 'Koneksi timeout. Proses cloning memakan waktu terlalu lama.'
      } else if (axiosError.code === 'ERR_NETWORK' || !axiosError.response) {
        errorMsg = 'Gagal terhubung ke server. Periksa koneksi internet Anda.'
      } else {
        const status = axiosError.response?.status
        switch (status) {
          case 401: errorMsg = 'API key tidak valid. Periksa kembali API key Anda.'; break
          case 402: errorMsg = 'Kuota habis. Silakan upgrade paket atau tambah kredit.'; break
          case 429: errorMsg = 'Terlalu banyak permintaan. Tunggu beberapa saat dan coba lagi.'; break
          case 400: {
            const detail = axiosError.response?.data?.detail?.message || axiosError.response?.data?.error || ''
            errorMsg = `Request tidak valid: ${detail || 'Periksa file audio dan coba lagi.'}`
            break
          }
          default: errorMsg = `Terjadi kesalahan (HTTP ${status}). Coba lagi nanti.`
        }
      }

      return { success: false, error: errorMsg }
    }
  })

  ipcMain.handle('voice:deleteProfile', (_event, id: number) => {
    try {
      // Get the profile first to find reference audio path
      const profile = db.prepare('SELECT reference_audio_path FROM voice_profiles WHERE id = ?').get(id) as { reference_audio_path?: string } | undefined
      if (profile?.reference_audio_path && fs.existsSync(profile.reference_audio_path)) {
        try {
          fs.unlinkSync(profile.reference_audio_path)
        } catch {
          // Ignore file deletion errors
        }
      }
      db.prepare('DELETE FROM voice_profiles WHERE id = ?').run(id)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  })

  ipcMain.handle('voice:test', async (_event, apiKeyRecord, voiceId: string, text: string) => {
    try {
      const provider = apiKeyRecord.provider_slug as string
      const apiKey = apiKeyRecord.api_key as string
      const baseUrl = apiKeyRecord.base_url as string | undefined
      const startTime = Date.now()

      let url: string
      let headers: Record<string, string> = {}
      let body: Record<string, unknown>

      switch (provider) {
        case 'fishaudio':
          url = 'https://api.fish.audio/v1/tts'
          headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
          body = { text, reference_id: voiceId, format: 'mp3', latency: 'normal' }
          break
        case 'elevenlabs':
          url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`
          headers = { 'xi-api-key': apiKey, Accept: 'audio/mpeg' }
          body = { text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }
          break
        case 'ttsai':
          url = 'https://api.tts.ai/v1/tts'
          headers = { Authorization: `Bearer ${apiKey}` }
          body = { text, voice_id: voiceId, speed: 1.0, output_format: 'mp3' }
          break
        default:
          url = `${baseUrl || ''}/v1/audio/speech`
          headers = { Authorization: `Bearer ${apiKey}` }
          body = { model: 'tts-1', input: text, voice: voiceId, speed: 1.0, response_format: 'mp3' }
          break
      }

      const response = await axios.post(url, body, {
        headers,
        responseType: 'arraybuffer',
        timeout: 30000,
      })

      const durationSeconds = (Date.now() - startTime) / 1000
      const audioArray = Array.from(new Uint8Array(response.data))

      // Log usage
      db.prepare(`
        INSERT INTO usage_logs (api_key_id, action, input_text, characters_used, duration_seconds, status)
        VALUES (?, 'tts', ?, ?, ?, 'success')
      `).run(apiKeyRecord.id, text, text.length, durationSeconds)

      return { success: true, audioData: audioArray, charactersUsed: text.length }
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number }; code?: string; message?: string }
      let errorMsg = 'Gagal menghasilkan audio test.'
      if (axiosError.response?.status === 401) {
        errorMsg = 'API key tidak valid.'
      } else if (axiosError.code === 'ERR_NETWORK') {
        errorMsg = 'Gagal terhubung ke server.'
      } else if (axiosError.response?.status === 402) {
        errorMsg = 'Kuota habis.'
      }
      return { success: false, error: errorMsg }
    }
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
