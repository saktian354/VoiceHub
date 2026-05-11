import { useRef, useState, useEffect, useCallback } from 'react'
import { Play, Pause, Download } from 'lucide-react'
import { Button } from './button'

interface AudioPlayerProps {
  audioUrl: string
  providerName: string
  charactersUsed: number
  durationSeconds: number
  onDownload: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function AudioPlayer({
  audioUrl,
  providerName,
  charactersUsed,
  durationSeconds,
  onDownload,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [bars] = useState(() =>
    Array.from({ length: 32 }, () => 0.2 + Math.random() * 0.8)
  )

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onEnded = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [audioUrl])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    audio.currentTime = pct * duration
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Waveform */}
      <div className="flex items-end gap-0.5 h-16 px-1">
        {bars.map((height, i) => {
          const barPct = (i / bars.length) * 100
          const isActive = barPct <= progress
          return (
            <div
              key={i}
              className={`flex-1 rounded-sm transition-colors duration-150 ${
                isActive ? 'bg-accent-500' : 'bg-gray-700'
              } ${isPlaying && isActive ? 'animate-pulse' : ''}`}
              style={{ height: `${height * 100}%` }}
            />
          )
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlay}
          className="h-10 w-10 rounded-full"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>

        <div className="flex-1">
          <div
            className="w-full h-1.5 bg-gray-800 rounded-full cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-accent-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || 0)}</span>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={onDownload}>
          <Download className="w-4 h-4 mr-1.5" />
          Save
        </Button>
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 flex gap-3">
        <span>Provider: {providerName}</span>
        <span>Karakter: {charactersUsed}</span>
        <span>Waktu: {durationSeconds.toFixed(1)}s</span>
      </div>
    </div>
  )
}
