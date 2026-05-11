import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'

let db: Database.Database | null = null

function getPortablePath(): string {
  const exePath = app.getPath('exe')
  const exeDir = path.dirname(exePath)

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    return path.join(process.cwd(), 'voicehub-data')
  }

  return path.join(exeDir, 'voicehub-data')
}

export function getDatabase(): Database.Database {
  if (db) return db

  const dataDir = getPortablePath()
  const fs = require('fs')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  const dbPath = path.join(dataDir, 'voicehub.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initializeTables(db)

  return db
}

function initializeTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_name TEXT NOT NULL,
      provider_slug TEXT NOT NULL,
      api_key TEXT NOT NULL,
      label TEXT,
      quota_total REAL DEFAULT 0,
      quota_used REAL DEFAULT 0,
      quota_unit TEXT DEFAULT 'characters',
      is_active BOOLEAN DEFAULT 1,
      is_primary BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      api_key_id INTEGER REFERENCES api_keys(id),
      action TEXT NOT NULL,
      input_text TEXT,
      characters_used INTEGER DEFAULT 0,
      duration_seconds REAL DEFAULT 0,
      status TEXT DEFAULT 'success',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS voice_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_key_id INTEGER REFERENCES api_keys(id),
      voice_id TEXT,
      reference_audio_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  // Insert default settings if not present
  const defaults: Record<string, string> = {
    theme: 'dark',
    language: 'id',
    save_history: 'true',
    history_retention: 'forever',
    audio_format: 'mp3',
    audio_quality: 'standard',
    auto_save_audio: 'true',
    auto_switch_api: 'true',
    request_timeout: '30',
    auto_retry: 'true',
    retry_count: '2',
  }

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value)
  }
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}
