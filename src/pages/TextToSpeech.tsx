import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Download, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function TextToSpeech() {
  const { apiKeys, loadApiKeys } = useAppStore()
  const [text, setText] = useState('')
  const [selectedKeyId, setSelectedKeyId] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  useEffect(() => {
    loadApiKeys()
  }, [loadApiKeys])

  useEffect(() => {
    const primary = apiKeys.find((k) => k.is_primary && k.is_active)
    if (primary?.id !== undefined) {
      setSelectedKeyId(primary.id)
    } else if (apiKeys.length > 0 && apiKeys[0].id !== undefined) {
      setSelectedKeyId(apiKeys[0].id)
    }
  }, [apiKeys])

  const activeKeys = apiKeys.filter((k) => k.is_active)

  const handleGenerate = async () => {
    if (!text.trim() || !selectedKeyId) return

    setIsGenerating(true)
    setAudioUrl(null)

    try {
      // Placeholder: actual TTS integration will be implemented in future tasks
      await new Promise((resolve) => setTimeout(resolve, 2000))

      if (window.electronAPI) {
        await window.electronAPI.db.addUsageLog({
          api_key_id: selectedKeyId,
          action: 'tts',
          input_text: text,
          characters_used: text.length,
          duration_seconds: 0,
          status: 'success',
        })
      }
    } catch {
      if (window.electronAPI) {
        await window.electronAPI.db.addUsageLog({
          api_key_id: selectedKeyId,
          action: 'tts',
          input_text: text,
          characters_used: text.length,
          duration_seconds: 0,
          status: 'failed',
        })
      }
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Text to Speech</h1>
        <p className="text-gray-400 mt-1">Convert text to natural-sounding speech</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Input Text</CardTitle>
              <CardDescription>Enter the text you want to convert to speech</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea
                className="w-full h-48 rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 resize-none"
                placeholder="Type or paste your text here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-500">{text.length} characters</span>
                <div className="flex gap-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={!text.trim() || !selectedKeyId || isGenerating}
                  >
                    {isGenerating ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    {isGenerating ? 'Generating...' : 'Generate Speech'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audio Player */}
          {audioUrl && (
            <Card>
              <CardHeader>
                <CardTitle>Generated Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <audio controls src={audioUrl} className="flex-1" />
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">API Key</label>
                <select
                  className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                  value={selectedKeyId || ''}
                  onChange={(e) => setSelectedKeyId(Number(e.target.value))}
                >
                  {activeKeys.length === 0 ? (
                    <option value="">No API keys available</option>
                  ) : (
                    activeKeys.map((key) => (
                      <option key={key.id} value={key.id}>
                        {key.provider_name} {key.label ? `(${key.label})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              {activeKeys.length === 0 && (
                <p className="text-xs text-yellow-400">
                  Please add an API key in the API Manager first.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
