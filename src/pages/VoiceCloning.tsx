import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, Trash2, AudioLines, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function VoiceCloning() {
  const { apiKeys, voiceProfiles, fetchApiKeys, loadVoiceProfiles } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null)
  const [audioPath, setAudioPath] = useState<string | null>(null)
  const [isCloning, setIsCloning] = useState(false)

  useEffect(() => {
    fetchApiKeys()
    loadVoiceProfiles()
  }, [fetchApiKeys, loadVoiceProfiles])

  const activeKeys = apiKeys.filter((k) => k.is_active)

  const handleSelectAudio = async () => {
    if (!window.electronAPI) return
    const path = await window.electronAPI.selectFile([
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac'] },
    ])
    if (path) setAudioPath(path)
  }

  const handleClone = async () => {
    if (!name.trim() || !selectedKeyId) return

    setIsCloning(true)
    try {
      // Placeholder: actual voice cloning integration will be implemented in future tasks
      await new Promise((resolve) => setTimeout(resolve, 3000))

      if (window.electronAPI) {
        await window.electronAPI.db.addVoiceProfile({
          name,
          api_key_id: selectedKeyId,
          voice_id: `voice_${Date.now()}`,
          reference_audio_path: audioPath || undefined,
        })
        await loadVoiceProfiles()
      }

      setShowForm(false)
      setName('')
      setAudioPath(null)
    } finally {
      setIsCloning(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.electronAPI) return
    await window.electronAPI.db.deleteVoiceProfile(id)
    await loadVoiceProfiles()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Voice Cloning</h1>
          <p className="text-gray-400 mt-1">Create and manage voice profiles</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <AudioLines className="w-4 h-4 mr-2" />
          New Voice Profile
        </Button>
      </div>

      {/* Clone Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Voice Profile</CardTitle>
            <CardDescription>Upload a reference audio to clone a voice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-1 block">Profile Name</label>
              <Input
                placeholder="e.g. My Voice, Narrator Voice"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">API Key</label>
              <select
                className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                value={selectedKeyId || ''}
                onChange={(e) => setSelectedKeyId(Number(e.target.value))}
              >
                <option value="">Select API Key</option>
                {activeKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.provider_name} {key.label ? `(${key.label})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-1 block">Reference Audio</label>
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleSelectAudio}>
                  <Upload className="w-4 h-4 mr-2" />
                  Select Audio File
                </Button>
                {audioPath && (
                  <span className="text-sm text-gray-400 truncate max-w-xs">
                    {audioPath.split(/[\\/]/).pop()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleClone} disabled={!name.trim() || !selectedKeyId || isCloning}>
                {isCloning ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <AudioLines className="w-4 h-4 mr-2" />
                )}
                {isCloning ? 'Cloning...' : 'Clone Voice'}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Profiles List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {voiceProfiles.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <AudioLines className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p className="text-gray-500">No voice profiles yet.</p>
              <p className="text-gray-600 text-sm mt-1">
                Create a new voice profile to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          voiceProfiles.map((profile) => (
            <Card key={profile.id}>
              <CardContent className="py-4 px-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-medium">{profile.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{profile.provider_name}</p>
                    {profile.voice_id && (
                      <code className="text-xs text-gray-600 mt-1 block">{profile.voice_id}</code>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => profile.id !== undefined && handleDelete(profile.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
