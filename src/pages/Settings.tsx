import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { showToast } from '@/components/ui/toast'
import {
  Settings2,
  Music,
  Wifi,
  Info,
  FolderOpen,
  Trash2,
  Loader2,
  ExternalLink,
  AudioLines,
} from 'lucide-react'
import type { AppSettings } from '@/types'

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (val: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm text-white font-medium">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-accent-500' : 'bg-gray-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (val: string) => void
}) {
  return (
    <div className="py-3">
      <label className="text-sm text-white font-medium mb-1.5 block">{label}</label>
      <select
        className="flex h-9 w-full max-w-xs rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Settings() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [dataPath, setDataPath] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const loadSettings = useCallback(async () => {
    if (!window.electronAPI) return
    const [s, dp, ver] = await Promise.all([
      window.electronAPI.settings.getAll(),
      window.electronAPI.getDataPath(),
      window.electronAPI.getAppVersion(),
    ])
    setSettings(s)
    setDataPath(dp)
    setAppVersion(ver)
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const updateSetting = useCallback(
    (key: string, value: string) => {
      if (!window.electronAPI || !settings) return
      setSettings((prev) => (prev ? { ...prev, [key]: value } : prev))

      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key])
      }
      debounceTimers.current[key] = setTimeout(() => {
        window.electronAPI.settings.set(key, value)
      }, 500)
    },
    [settings]
  )

  const handleClearHistory = async () => {
    if (!window.electronAPI) return
    setIsClearing(true)
    try {
      await window.electronAPI.settings.clearHistory()
      showToast('success', 'Semua riwayat aktivitas berhasil dihapus.')
    } catch {
      showToast('error', 'Gagal menghapus riwayat.')
    } finally {
      setIsClearing(false)
      setShowClearConfirm(false)
    }
  }

  const handleSelectFolder = async () => {
    if (!window.electronAPI) return
    const folder = await window.electronAPI.selectFolder()
    if (folder) {
      updateSetting('audio_output_folder', folder)
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Kelola pengaturan aplikasi VoiceHub.</p>
      </div>

      {/* SECTION 1: UMUM */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-accent-400" />
            <CardTitle className="text-base">Umum</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-gray-800">
          <SelectField
            label="Tema"
            value={settings.theme}
            options={[
              { value: 'dark', label: 'Dark Mode' },
              { value: 'light', label: 'Light Mode' },
            ]}
            onChange={(v) => updateSetting('theme', v)}
          />
          <SelectField
            label="Bahasa Antarmuka"
            value={settings.language}
            options={[
              { value: 'id', label: 'Indonesia' },
              { value: 'en', label: 'English' },
            ]}
            onChange={(v) => updateSetting('language', v)}
          />
          <ToggleSwitch
            label="Simpan riwayat aktivitas"
            description="Catat semua operasi TTS dan cloning ke log"
            checked={settings.save_history === 'true'}
            onChange={(v) => updateSetting('save_history', String(v))}
          />
          <SelectField
            label="Berapa lama simpan riwayat"
            value={settings.history_retention}
            options={[
              { value: '7', label: '7 hari' },
              { value: '30', label: '30 hari' },
              { value: '90', label: '90 hari' },
              { value: 'forever', label: 'Selamanya' },
            ]}
            onChange={(v) => updateSetting('history_retention', v)}
          />
          <div className="py-3">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearing}
            >
              {isClearing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Hapus Semua Riwayat
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: AUDIO */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-green-400" />
            <CardTitle className="text-base">Audio</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-gray-800">
          <SelectField
            label="Format output default"
            value={settings.audio_format}
            options={[
              { value: 'mp3', label: 'MP3' },
              { value: 'wav', label: 'WAV' },
            ]}
            onChange={(v) => updateSetting('audio_format', v)}
          />
          <SelectField
            label="Kualitas audio"
            value={settings.audio_quality}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'high', label: 'High' },
            ]}
            onChange={(v) => updateSetting('audio_quality', v)}
          />
          <div className="py-3">
            <label className="text-sm text-white font-medium mb-1.5 block">
              Folder simpan audio
            </label>
            <div className="flex items-center gap-3">
              <code className="text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-md truncate max-w-md block">
                {settings.audio_output_folder || `${dataPath}/output_audio/`}
              </code>
              <Button variant="outline" size="sm" onClick={handleSelectFolder}>
                <FolderOpen className="w-4 h-4 mr-1.5" />
                Ganti Folder
              </Button>
            </div>
          </div>
          <ToggleSwitch
            label="Auto-simpan setiap generate"
            description="Otomatis simpan file audio setiap kali generate berhasil"
            checked={settings.auto_save_audio === 'true'}
            onChange={(v) => updateSetting('auto_save_audio', String(v))}
          />
        </CardContent>
      </Card>

      {/* SECTION 3: API & PERFORMA */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-blue-400" />
            <CardTitle className="text-base">API & Performa</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="divide-y divide-gray-800">
          <ToggleSwitch
            label="Auto-switch API saat error"
            description="Otomatis pindah ke API lain jika API aktif bermasalah (quota habis, rate limit, dll)"
            checked={settings.auto_switch_api === 'true'}
            onChange={(v) => updateSetting('auto_switch_api', String(v))}
          />
          <div className="py-3">
            <label className="text-sm text-white font-medium mb-1.5 block">
              Timeout request (detik)
            </label>
            <Input
              type="number"
              className="max-w-[120px]"
              min={5}
              max={120}
              value={settings.request_timeout}
              onChange={(e) => updateSetting('request_timeout', e.target.value)}
            />
          </div>
          <ToggleSwitch
            label="Retry otomatis saat gagal"
            description="Coba ulang request secara otomatis jika terjadi error"
            checked={settings.auto_retry === 'true'}
            onChange={(v) => updateSetting('auto_retry', String(v))}
          />
          <div className="py-3">
            <label className="text-sm text-white font-medium mb-1.5 block">
              Jumlah retry
            </label>
            <Input
              type="number"
              className="max-w-[120px]"
              min={1}
              max={5}
              value={settings.retry_count}
              onChange={(e) => updateSetting('retry_count', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: TENTANG APLIKASI */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-purple-400" />
            <CardTitle className="text-base">Tentang Aplikasi</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-accent-500 flex items-center justify-center flex-shrink-0">
              <AudioLines className="w-8 h-8 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">VoiceHub</h3>
              <p className="text-sm text-gray-400 mt-0.5">
                Versi {appVersion || '1.0.0'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Aplikasi desktop portable untuk text-to-speech dan voice cloning.
                Mendukung multiple provider API: TTS.ai, Fish Audio, ElevenLabs, dan Custom.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <Button variant="outline" size="sm" disabled>
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Lihat Dokumentasi API
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Cek Update
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clear History Confirm */}
      <ConfirmDialog
        open={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearHistory}
        title="Hapus Semua Riwayat"
        message="Semua riwayat aktivitas (usage logs) akan dihapus permanen. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus Semua"
        isDestructive
      />
    </div>
  )
}
