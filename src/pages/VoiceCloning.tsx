import { useEffect, useState, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { showToast } from '@/components/ui/toast'
import {
  Upload,
  Trash2,
  Loader2,
  Play,
  Pause,
  X,
  Copy,
  FileAudio,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  Dna,
  Mic,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ApiKey, AudioFileInfo } from '@/types'

const SUPPORTED_FORMATS = ['mp3', 'wav', 'm4a', 'ogg', 'flac']
const MAX_FILE_SIZE_MB = 50
const MIN_DURATION_SECONDS = 5

const PROVIDER_COLORS: Record<string, string> = {
  ttsai: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  fishaudio: 'bg-green-500/20 text-green-400 border-green-500/30',
  elevenlabs: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  custom: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const AVATAR_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-green-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-yellow-500 to-amber-600',
  'from-violet-500 to-fuchsia-600',
  'from-emerald-500 to-green-600',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Mini audio player for reference preview & test results
function MiniPlayer({ audioUrl, small }: { audioUrl: string; small?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onEnd = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
    }
  }, [audioUrl])

  useEffect(() => {
    return () => {
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        setIsPlaying(false)
      }
    }
  }, [])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audio.currentTime = pct * duration
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`flex items-center gap-2 ${small ? '' : 'mt-2'}`}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        onClick={toggle}
        className="p-1.5 rounded-full bg-accent-500/20 hover:bg-accent-500/30 text-accent-400 transition-colors"
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div
          className="w-full h-1.5 bg-gray-800 rounded-full cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-accent-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">
        {formatTime(currentTime)} / {formatTime(duration || 0)}
      </span>
    </div>
  )
}

export function VoiceCloning() {
  const { apiKeys, voiceProfiles, fetchApiKeys, loadVoiceProfiles } = useAppStore()

  // Clone form state
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null)
  const [profileName, setProfileName] = useState('')
  const [description, setDescription] = useState('')
  const [audioFile, setAudioFile] = useState<AudioFileInfo | null>(null)
  const [audioSourcePath, setAudioSourcePath] = useState<string | null>(null)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null)
  const [isCloning, setIsCloning] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // Clone success state
  const [cloneSuccess, setCloneSuccess] = useState<{
    name: string
    voiceId: string
    profileId: number
    apiKeyRecord: ApiKey
  } | null>(null)
  const [testText, setTestText] = useState('Halo, ini adalah suara hasil kloning. Saya akan membantu Anda hari ini.')
  const [isTestingSuccess, setIsTestingSuccess] = useState(false)
  const [successTestAudioUrl, setSuccessTestAudioUrl] = useState<string | null>(null)

  // Profile list state
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [testModalProfile, setTestModalProfile] = useState<{
    id: number
    name: string
    voice_id: string
    api_key_id: number
  } | null>(null)
  const [modalTestText, setModalTestText] = useState(
    'Halo, ini adalah suara hasil kloning. Saya akan membantu Anda hari ini.'
  )
  const [isModalTesting, setIsModalTesting] = useState(false)
  const [modalTestAudioUrl, setModalTestAudioUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const profilesSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchApiKeys()
    loadVoiceProfiles()
  }, [fetchApiKeys, loadVoiceProfiles])

  const activeKeys = apiKeys.filter((k) => k.is_active)
  const selectedKey = apiKeys.find((k) => k.id === selectedKeyId)
  const isUnsupportedProvider =
    selectedKey && selectedKey.provider_slug !== 'fishaudio' && selectedKey.provider_slug !== 'elevenlabs'

  // Handle audio file selection (from file picker or drag)
  const processAudioFile = useCallback(async (filePath: string) => {
    if (!window.electronAPI) return

    const infoResult = await window.electronAPI.voice.getAudioInfo(filePath)
    if (!infoResult.success || !infoResult.info) {
      showToast('error', infoResult.error || 'Gagal membaca file audio.')
      return
    }

    const info = infoResult.info

    // Validate format
    if (!SUPPORTED_FORMATS.includes(info.format)) {
      showToast('error', `Format ${info.format} tidak didukung. Gunakan: ${SUPPORTED_FORMATS.join(', ')}`)
      return
    }

    // Validate size
    if (info.sizeInMB > MAX_FILE_SIZE_MB) {
      showToast('error', `File terlalu besar (${info.sizeInMB}MB). Maksimal ${MAX_FILE_SIZE_MB}MB.`)
      return
    }

    setAudioFile(info)
    setAudioSourcePath(filePath)

    // Read audio data for preview and duration detection
    const readResult = await window.electronAPI.audio.readFile(filePath)
    if (readResult.success && readResult.audioData) {
      const uint8 = new Uint8Array(readResult.audioData)
      const blob = new Blob([uint8], { type: `audio/${info.format}` })
      const url = URL.createObjectURL(blob)
      setAudioPreviewUrl(url)

      // Detect duration using HTML5 Audio
      const audio = new Audio(url)
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration)
      })
      audio.addEventListener('error', () => {
        setAudioDuration(null)
      })
    }
  }, [])

  const handleSelectAudio = async () => {
    if (!window.electronAPI) return
    const filePath = await window.electronAPI.selectFile([
      { name: 'Audio Files', extensions: SUPPORTED_FORMATS },
    ])
    if (filePath) {
      processAudioFile(filePath)
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const files = e.dataTransfer.files
      if (files.length > 0) {
        const file = files[0]
        const ext = file.name.split('.').pop()?.toLowerCase() || ''
        if (SUPPORTED_FORMATS.includes(ext)) {
          // Use the file path from the drag event
          const filePath = (file as unknown as { path?: string }).path
          if (filePath) {
            processAudioFile(filePath)
          }
        } else {
          showToast('error', `Format tidak didukung. Gunakan: ${SUPPORTED_FORMATS.join(', ')}`)
        }
      }
    },
    [processAudioFile]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const clearAudioFile = () => {
    if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl)
    setAudioFile(null)
    setAudioSourcePath(null)
    setAudioDuration(null)
    setAudioPreviewUrl(null)
  }

  const handleClone = async () => {
    if (!window.electronAPI || !selectedKey || !profileName.trim() || !audioSourcePath) return

    setIsCloning(true)
    try {
      // Copy reference audio to app data dir
      const copyResult = await window.electronAPI.voice.copyReferenceAudio(audioSourcePath)
      if (!copyResult.success || !copyResult.filePath) {
        showToast('error', copyResult.error || 'Gagal menyalin file audio referensi.')
        return
      }

      // Clone voice
      const result = await window.electronAPI.voice.clone(selectedKey, {
        name: profileName.trim(),
        referenceAudioPath: copyResult.filePath,
        description: description.trim() || undefined,
      })

      if (result.success && result.voiceId) {
        showToast('success', 'Voice profile berhasil dibuat!')
        setCloneSuccess({
          name: profileName.trim(),
          voiceId: result.voiceId,
          profileId: result.profileId || 0,
          apiKeyRecord: selectedKey,
        })
        // Reset form
        setProfileName('')
        setDescription('')
        clearAudioFile()
        setSelectedKeyId(null)
        await loadVoiceProfiles()
      } else {
        showToast('error', result.error || 'Gagal melakukan voice cloning.')
      }
    } catch {
      showToast('error', 'Terjadi kesalahan yang tidak terduga.')
    } finally {
      setIsCloning(false)
    }
  }

  const handleTestSuccess = async () => {
    if (!window.electronAPI || !cloneSuccess || !testText.trim()) return
    setIsTestingSuccess(true)
    try {
      const result = await window.electronAPI.voice.test(
        cloneSuccess.apiKeyRecord,
        cloneSuccess.voiceId,
        testText.trim()
      )
      if (result.success && result.audioData) {
        const uint8 = new Uint8Array(result.audioData)
        const blob = new Blob([uint8], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        if (successTestAudioUrl) URL.revokeObjectURL(successTestAudioUrl)
        setSuccessTestAudioUrl(url)
        showToast('success', `Audio test berhasil! (${result.charactersUsed} karakter)`)
      } else {
        showToast('error', result.error || 'Gagal menghasilkan audio test.')
      }
    } catch {
      showToast('error', 'Gagal menghasilkan audio test.')
    } finally {
      setIsTestingSuccess(false)
    }
  }

  const handleDeleteProfile = async (id: number) => {
    if (!window.electronAPI) return
    const result = await window.electronAPI.voice.deleteProfile(id)
    if (result.success) {
      showToast('success', 'Voice profile berhasil dihapus.')
      await loadVoiceProfiles()
    } else {
      showToast('error', result.error || 'Gagal menghapus voice profile.')
    }
    setDeleteConfirmId(null)
  }

  const handleModalTest = async () => {
    if (!window.electronAPI || !testModalProfile || !modalTestText.trim()) return

    const apiKeyRecord = apiKeys.find((k) => k.id === testModalProfile.api_key_id)
    if (!apiKeyRecord) {
      showToast('error', 'API key untuk profil ini tidak ditemukan.')
      return
    }

    setIsModalTesting(true)
    try {
      const result = await window.electronAPI.voice.test(
        apiKeyRecord,
        testModalProfile.voice_id,
        modalTestText.trim()
      )
      if (result.success && result.audioData) {
        const uint8 = new Uint8Array(result.audioData)
        const blob = new Blob([uint8], { type: 'audio/mpeg' })
        const url = URL.createObjectURL(blob)
        if (modalTestAudioUrl) URL.revokeObjectURL(modalTestAudioUrl)
        setModalTestAudioUrl(url)
        showToast('success', `Audio test berhasil! (${result.charactersUsed} karakter)`)
      } else {
        showToast('error', result.error || 'Gagal menghasilkan audio test.')
      }
    } catch {
      showToast('error', 'Gagal menghasilkan audio test.')
    } finally {
      setIsModalTesting(false)
    }
  }

  const handleCopyVoiceId = async (voiceId: string) => {
    try {
      await navigator.clipboard.writeText(voiceId)
      showToast('success', 'Voice ID berhasil disalin!')
    } catch {
      showToast('error', 'Gagal menyalin Voice ID.')
    }
  }

  const scrollToProfiles = () => {
    profilesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const canClone = profileName.trim() && selectedKeyId && audioFile && !isUnsupportedProvider && !isCloning

  return (
    <div className="space-y-8">
      {/* ========== SECTION ATAS: CLONE SUARA BARU ========== */}
      <div>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-white">Clone Suara Baru</h1>
          <p className="text-gray-400 mt-1">
            Upload audio referensi minimal 10 detik untuk membuat profil suara baru.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-5">
            {/* API Selector */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Pilih API untuk Cloning
              </label>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                value={selectedKeyId || ''}
                onChange={(e) => setSelectedKeyId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- Pilih API Key --</option>
                {activeKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.label || key.provider_name} ({key.provider_name})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                Provider yang mendukung cloning: Fish Audio dan ElevenLabs
              </p>
              {isUnsupportedProvider && (
                <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span className="text-sm text-yellow-400">
                    {selectedKey?.provider_name} tidak mendukung voice cloning. Pilih Fish Audio atau ElevenLabs.
                  </span>
                </div>
              )}
            </div>

            {/* Profile Name */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Nama Profil Suara
              </label>
              <Input
                placeholder="cth: Suara Narator Pria"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>

            {/* Audio Upload Drop Zone */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Upload Audio Referensi
              </label>

              {!audioFile ? (
                <div
                  className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    isDragOver
                      ? 'border-accent-500 bg-accent-500/10'
                      : 'border-gray-700 hover:border-gray-600 bg-gray-800/30'
                  }`}
                  onClick={handleSelectAudio}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={SUPPORTED_FORMATS.map((f) => `.${f}`).join(',')}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const filePath = (file as unknown as { path?: string }).path
                        if (filePath) processAudioFile(filePath)
                      }
                    }}
                  />
                  <Upload className="w-10 h-10 mx-auto mb-3 text-gray-500" />
                  <p className="text-gray-400 font-medium">
                    Drag & drop file audio di sini
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    atau klik untuk browse
                  </p>
                  <p className="text-gray-600 text-xs mt-3">
                    Format: {SUPPORTED_FORMATS.join(', ').toUpperCase()} | Maks: {MAX_FILE_SIZE_MB}MB
                  </p>
                </div>
              ) : (
                <div className="border border-gray-700 rounded-xl p-4 bg-gray-800/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-accent-500/20">
                        <FileAudio className="w-5 h-5 text-accent-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-white font-medium truncate">
                          {audioFile.fileName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{audioFile.format.toUpperCase()}</span>
                          <span>&middot;</span>
                          <span>{audioFile.sizeInMB} MB</span>
                          {audioDuration !== null && (
                            <>
                              <span>&middot;</span>
                              <span>{audioDuration.toFixed(1)}s</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={clearAudioFile}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Duration warning */}
                  {audioDuration !== null && audioDuration < MIN_DURATION_SECONDS && (
                    <div className="flex items-center gap-2 mt-3 p-2.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <span className="text-xs text-yellow-400">
                        Audio terlalu pendek ({audioDuration.toFixed(1)}s). Minimal {MIN_DURATION_SECONDS} detik untuk hasil optimal, direkomendasikan 15-30 detik.
                      </span>
                    </div>
                  )}

                  {/* Mini preview player */}
                  {audioPreviewUrl && <MiniPlayer audioUrl={audioPreviewUrl} />}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-300 mb-1.5 block">
                Deskripsi <span className="text-gray-600">(opsional)</span>
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 resize-none"
                placeholder="cth: Suara pria dewasa, nada rendah, logat Indonesia"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Clone Button */}
            <Button
              className="w-full h-12 text-base font-semibold"
              disabled={!canClone}
              onClick={handleClone}
            >
              {isCloning ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sedang memproses... (bisa memakan waktu 10-60 detik)
                </>
              ) : (
                <>
                  <Dna className="w-5 h-5 mr-2" />
                  Clone Suara Sekarang
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Clone Success Panel */}
        {cloneSuccess && (
          <Card className="mt-4 border-green-500/30">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-green-400">
                  Voice profile berhasil dibuat!
                </h3>
              </div>
              <p className="text-gray-300 mb-4">
                Profil: <span className="font-medium text-white">{cloneSuccess.name}</span>
              </p>

              {/* Test the cloned voice */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-300 block">Test Suara</label>
                <textarea
                  className="flex min-h-[60px] w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 resize-none"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="Masukkan teks untuk test suara..."
                />
                <div className="flex items-center gap-3">
                  <Button onClick={handleTestSuccess} disabled={isTestingSuccess || !testText.trim()}>
                    {isTestingSuccess ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isTestingSuccess ? 'Generating...' : 'Test Suara'}
                  </Button>
                  <Button variant="ghost" onClick={scrollToProfiles}>
                    Lihat di Voice Profiles <ArrowDown className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
                {successTestAudioUrl && <MiniPlayer audioUrl={successTestAudioUrl} />}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ========== SECTION BAWAH: DAFTAR VOICE PROFILES ========== */}
      <div ref={profilesSectionRef}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Voice Profiles Saya</h2>
            <p className="text-gray-400 text-sm mt-0.5">
              {voiceProfiles.length > 0
                ? `${voiceProfiles.length} profil tersimpan`
                : 'Belum ada profil'}
            </p>
          </div>
        </div>

        {voiceProfiles.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Mic className="w-14 h-14 mx-auto mb-4 text-gray-700" />
              <p className="text-gray-400 font-medium text-lg">Belum ada Voice Profile</p>
              <p className="text-gray-600 text-sm mt-1">
                Clone suara pertama Anda di atas.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {voiceProfiles.map((profile) => {
              const avatarColor = getAvatarColor(profile.name)
              const providerSlug =
                apiKeys.find((k) => k.id === profile.api_key_id)?.provider_slug || 'custom'
              const colorClass = PROVIDER_COLORS[providerSlug] || PROVIDER_COLORS.custom

              return (
                <Card key={profile.id} className="hover:border-gray-700 transition-colors">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3 mb-4">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center flex-shrink-0`}
                      >
                        <span className="text-white font-bold text-sm">
                          {profile.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-white font-medium truncate">{profile.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}
                          >
                            {profile.provider_name || providerSlug}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {formatDate(profile.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          if (profile.id !== undefined && profile.voice_id && profile.api_key_id) {
                            setTestModalProfile({
                              id: profile.id,
                              name: profile.name,
                              voice_id: profile.voice_id,
                              api_key_id: profile.api_key_id,
                            })
                            setModalTestText(
                              'Halo, ini adalah suara hasil kloning. Saya akan membantu Anda hari ini.'
                            )
                            setModalTestAudioUrl(null)
                          }
                        }}
                      >
                        <Play className="w-3.5 h-3.5 mr-1.5" />
                        Test
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => profile.voice_id && handleCopyVoiceId(profile.voice_id)}
                        title="Copy Voice ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => profile.id !== undefined && setDeleteConfirmId(profile.id)}
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ========== TEST VOICE MODAL ========== */}
      <Modal
        open={testModalProfile !== null}
        onClose={() => {
          setTestModalProfile(null)
          if (modalTestAudioUrl) URL.revokeObjectURL(modalTestAudioUrl)
          setModalTestAudioUrl(null)
        }}
        title={`Test Suara: ${testModalProfile?.name || ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-300 mb-1.5 block">
              Teks untuk test
            </label>
            <textarea
              className="flex min-h-[100px] w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 resize-none"
              value={modalTestText}
              onChange={(e) => setModalTestText(e.target.value)}
              placeholder="Masukkan teks..."
            />
          </div>
          <Button
            className="w-full"
            onClick={handleModalTest}
            disabled={isModalTesting || !modalTestText.trim()}
          >
            {isModalTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
          {modalTestAudioUrl && <MiniPlayer audioUrl={modalTestAudioUrl} />}
        </div>
      </Modal>

      {/* ========== DELETE CONFIRM DIALOG ========== */}
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId !== null && handleDeleteProfile(deleteConfirmId)}
        title="Hapus Voice Profile"
        message="Apakah Anda yakin ingin menghapus voice profile ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        isDestructive
      />
    </div>
  )
}
