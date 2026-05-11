import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AudioPlayer } from '@/components/ui/audio-player'
import { showToast } from '@/components/ui/toast'
import {
  Mic,
  Loader2,
  RefreshCw,
  X,
  AlertTriangle,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ApiKey, UsageLog, TTSVoice } from '@/types'

const providerBadges: Record<string, string> = {
  ttsai: 'bg-blue-500/10 text-blue-400',
  fishaudio: 'bg-green-500/10 text-green-400',
  elevenlabs: 'bg-orange-500/10 text-orange-400',
  custom: 'bg-gray-500/10 text-gray-400',
}

const languages = [
  { value: '', label: 'Auto-detect' },
  { value: 'id', label: 'Indonesia' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
]

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

export function TextToSpeech() {
  const { apiKeys, fetchApiKeys, usageLogs, loadUsageLogs } = useAppStore()

  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null)
  const [voices, setVoices] = useState<TTSVoice[]>([])
  const [selectedVoiceId, setSelectedVoiceId] = useState('')
  const [voiceSearch, setVoiceSearch] = useState('')
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)

  const [text, setText] = useState('')
  const [speed, setSpeed] = useState(1.0)
  const [pitch, setPitch] = useState(0)
  const [outputFormat, setOutputFormat] = useState<'mp3' | 'wav'>('mp3')
  const [language, setLanguage] = useState('')

  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<number[] | null>(null)
  const [generateInfo, setGenerateInfo] = useState<{
    provider: string
    chars: number
    duration: number
  } | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const activeKeys = useMemo(() => apiKeys.filter((k) => k.is_active), [apiKeys])
  const selectedKey = useMemo(
    () => activeKeys.find((k) => k.id === selectedKeyId),
    [activeKeys, selectedKeyId]
  )

  const ttsLogs = useMemo(
    () =>
      usageLogs
        .filter((l) => l.action === 'tts')
        .slice(0, 10),
    [usageLogs]
  )

  const quotaRemaining = useMemo(() => {
    if (!selectedKey || !selectedKey.quota_total || selectedKey.quota_total <= 0) return null
    const used = Number(selectedKey.quota_used ?? 0)
    const total = Number(selectedKey.quota_total)
    const remaining = total - used
    const pct = total > 0 ? (remaining / total) * 100 : 100
    return { remaining, total, pct }
  }, [selectedKey])

  const showQuotaWarning = quotaRemaining !== null && quotaRemaining.pct < 10

  useEffect(() => {
    fetchApiKeys()
    loadUsageLogs()
    if (window.electronAPI) {
      window.electronAPI.audio.cleanupTemp()
    }
  }, [fetchApiKeys, loadUsageLogs])

  useEffect(() => {
    const primary = activeKeys.find((k) => k.is_primary)
    if (primary?.id !== undefined) {
      setSelectedKeyId(primary.id)
    } else if (activeKeys.length > 0 && activeKeys[0].id !== undefined) {
      setSelectedKeyId(activeKeys[0].id)
    }
  }, [activeKeys])

  const loadVoices = useCallback(
    async (key?: ApiKey) => {
      const apiKey = key || selectedKey
      if (!apiKey || !window.electronAPI) return

      setIsLoadingVoices(true)
      setVoices([])
      setSelectedVoiceId('')

      try {
        const result = await window.electronAPI.tts.getVoices(apiKey)
        if (result.success) {
          setVoices(result.voices)
          if (result.voices.length > 0) {
            setSelectedVoiceId(result.voices[0].id)
          }
        } else {
          showToast('error', result.error || 'Gagal memuat daftar suara.')
        }
      } catch {
        showToast('error', 'Gagal memuat daftar suara.')
      } finally {
        setIsLoadingVoices(false)
      }
    },
    [selectedKey]
  )

  useEffect(() => {
    if (selectedKey) {
      loadVoices(selectedKey)
    }
  }, [selectedKeyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleApiChange = (id: number) => {
    setSelectedKeyId(id)
  }

  const filteredVoices = useMemo(() => {
    if (!voiceSearch.trim()) return voices
    const q = voiceSearch.toLowerCase()
    return voices.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.language.toLowerCase().includes(q) ||
        v.gender.toLowerCase().includes(q)
    )
  }, [voices, voiceSearch])

  const handleGenerate = async () => {
    if (!text.trim() || !selectedKey || !selectedVoiceId) return

    setIsGenerating(true)
    setAudioUrl(null)
    setAudioData(null)
    setGenerateInfo(null)

    try {
      const result = await window.electronAPI.tts.generate(selectedKey, {
        text: text.trim(),
        voiceId: selectedVoiceId,
        speed,
        pitch,
        outputFormat,
        language: language || undefined,
      })

      if (result.success && result.audioData) {
        setAudioData(result.audioData)
        const blob = new Blob([new Uint8Array(result.audioData)], {
          type: outputFormat === 'wav' ? 'audio/wav' : 'audio/mpeg',
        })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setGenerateInfo({
          provider: selectedKey.provider_name,
          chars: result.charactersUsed,
          duration: 0,
        })

        window.electronAPI.audio.saveTempAudio(result.audioData, outputFormat)
        showToast('success', `Audio berhasil dibuat! (${result.charactersUsed} karakter)`)
      } else {
        showToast('error', `Gagal: ${result.error || 'Terjadi kesalahan.'}`)
      }

      await loadUsageLogs()
      await fetchApiKeys()
    } catch {
      showToast('error', 'Gagal generate audio. Coba lagi.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!audioData) return
    const defaultName = `voicehub_${Date.now()}.${outputFormat}`
    await window.electronAPI.audio.saveToFile(audioData, defaultName)
  }

  const handleDeleteLog = async (logId: number) => {
    if (!window.electronAPI) return
    await window.electronAPI.db.deleteUsageLog(logId)
    await loadUsageLogs()
  }

  const handleAutoResize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(200, el.scrollHeight)}px`
  }

  const charCountColor =
    quotaRemaining && text.length > quotaRemaining.remaining ? 'text-red-400' : 'text-gray-500'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Text to Speech</h1>
        <p className="text-gray-400 mt-1">Konversi teks menjadi suara natural</p>
      </div>

      {/* Quota Warning Banner */}
      {showQuotaWarning && selectedKey && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
          <span className="text-sm text-yellow-400">
            Sisa quota API &quot;{selectedKey.label || selectedKey.provider_name}&quot; tinggal{' '}
            {Math.round(quotaRemaining!.pct)}%. Pertimbangkan mengganti ke API lain.
          </span>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* LEFT: Input & Controls (60%) */}
        <div className="lg:col-span-3 space-y-4">
          {/* API & Voice Selector */}
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* API Selector */}
              <div>
                <label className="text-sm text-gray-400 mb-1.5 block">Gunakan API</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  value={selectedKeyId ?? ''}
                  onChange={(e) => handleApiChange(Number(e.target.value))}
                >
                  {activeKeys.length === 0 ? (
                    <option value="">Tidak ada API Key aktif</option>
                  ) : (
                    activeKeys.map((key) => (
                      <option key={key.id} value={key.id}>
                        {key.label || key.provider_name} [{key.provider_name}]
                        {key.is_primary ? ' ★' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Voice Selector */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm text-gray-400">Pilih Suara</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadVoices()}
                    disabled={isLoadingVoices || !selectedKey}
                    className="h-7 px-2"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingVoices ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>

                {/* Voice search */}
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Cari suara..."
                    className="w-full h-8 rounded-lg border border-gray-700 bg-gray-800 pl-8 pr-3 text-xs text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    value={voiceSearch}
                    onChange={(e) => setVoiceSearch(e.target.value)}
                  />
                </div>

                <select
                  className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  value={selectedVoiceId}
                  onChange={(e) => setSelectedVoiceId(e.target.value)}
                  disabled={isLoadingVoices || voices.length === 0}
                >
                  {isLoadingVoices ? (
                    <option value="">Memuat suara...</option>
                  ) : filteredVoices.length === 0 ? (
                    <option value="">
                      {voices.length === 0
                        ? 'Tidak ada suara tersedia'
                        : 'Tidak ada hasil pencarian'}
                    </option>
                  ) : (
                    filteredVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.gender}) — {v.language}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Text Input */}
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  className="w-full min-h-[200px] rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 resize-none"
                  placeholder="Ketik atau paste teks di sini..."
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value)
                    handleAutoResize()
                  }}
                />
                {text && (
                  <button
                    onClick={() => setText('')}
                    className="absolute top-3 right-3 p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex justify-end mt-2">
                <span className={`text-xs ${charCountColor}`}>
                  {text.length} /{' '}
                  {quotaRemaining ? `${quotaRemaining.remaining} chars` : '∞'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Voice Settings */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Speed */}
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">
                    Kecepatan: {speed.toFixed(1)}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full accent-accent-500"
                  />
                </div>

                {/* Pitch */}
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">
                    Nada: {pitch > 0 ? `+${pitch}` : pitch}
                  </label>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="1"
                    value={pitch}
                    onChange={(e) => setPitch(Number(e.target.value))}
                    className="w-full accent-accent-500"
                  />
                </div>

                {/* Format */}
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Format</label>
                  <div className="flex rounded-lg border border-gray-700 overflow-hidden">
                    <button
                      className={`flex-1 h-8 text-xs font-medium transition-colors ${
                        outputFormat === 'mp3'
                          ? 'bg-accent-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                      onClick={() => setOutputFormat('mp3')}
                    >
                      MP3
                    </button>
                    <button
                      className={`flex-1 h-8 text-xs font-medium transition-colors ${
                        outputFormat === 'wav'
                          ? 'bg-accent-500 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                      onClick={() => setOutputFormat('wav')}
                    >
                      WAV
                    </button>
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Bahasa</label>
                  <select
                    className="flex h-8 w-full rounded-lg border border-gray-700 bg-gray-800 px-2 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                  >
                    {languages.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Generate Button */}
          <Button
            size="lg"
            className="w-full h-12 text-base"
            onClick={handleGenerate}
            disabled={!text.trim() || !selectedKey || !selectedVoiceId || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Mic className="w-5 h-5 mr-2" />
            )}
            {isGenerating ? 'Generating...' : 'Generate Audio'}
          </Button>
        </div>

        {/* RIGHT: Results & History (40%) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Audio Player */}
          {audioUrl && generateInfo && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Hasil Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <AudioPlayer
                  audioUrl={audioUrl}
                  providerName={generateInfo.provider}
                  charactersUsed={generateInfo.chars}
                  durationSeconds={generateInfo.duration}
                  onDownload={handleDownload}
                />
              </CardContent>
            </Card>
          )}

          {/* History */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">History Audio</CardTitle>
            </CardHeader>
            <CardContent>
              {ttsLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mic className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada history</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {ttsLogs.map((log) => (
                    <HistoryItem
                      key={log.id}
                      log={log}
                      onDelete={() => log.id !== undefined && handleDeleteLog(log.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function HistoryItem({
  log,
  onDelete,
}: {
  log: UsageLog
  onDelete: () => void
}) {
  const previewText = log.input_text
    ? log.input_text.length > 50
      ? log.input_text.slice(0, 50) + '...'
      : log.input_text
    : '(no text)'

  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors group">
      <div className="flex-shrink-0 mt-0.5">
        {log.status === 'success' ? (
          <CheckCircle2 className="w-4 h-4 text-green-400" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-300 truncate">{previewText}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          {log.timestamp && <span>{timeAgo(log.timestamp)}</span>}
          {log.provider_name && (
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] ${providerBadges[log.provider_name?.toLowerCase().replace(/[\s.]/g, '')] || providerBadges.custom}`}
            >
              {log.provider_name}
            </span>
          )}
          <span>{log.characters_used} chars</span>
        </div>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onDelete}
          className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-gray-700"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
