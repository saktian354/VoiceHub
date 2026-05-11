import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, Star, Eye, EyeOff } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ApiKey } from '@/types'

const providers = [
  { name: 'TTS.ai', slug: 'ttsai' },
  { name: 'Fish Audio', slug: 'fishaudio' },
  { name: 'ElevenLabs', slug: 'elevenlabs' },
  { name: 'Custom', slug: 'custom' },
]

export function ApiManager() {
  const { apiKeys, loadApiKeys } = useAppStore()
  const [showForm, setShowForm] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set())
  const [form, setForm] = useState<ApiKey>({
    provider_name: 'TTS.ai',
    provider_slug: 'ttsai',
    api_key: '',
    label: '',
    quota_total: 0,
    quota_used: 0,
    quota_unit: 'characters',
    is_active: true,
    is_primary: false,
  })

  useEffect(() => {
    loadApiKeys()
  }, [loadApiKeys])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.electronAPI || !form.api_key) return

    await window.electronAPI.db.addApiKey(form)
    await loadApiKeys()
    setShowForm(false)
    setForm({
      provider_name: 'TTS.ai',
      provider_slug: 'ttsai',
      api_key: '',
      label: '',
      quota_total: 0,
      quota_used: 0,
      quota_unit: 'characters',
      is_active: true,
      is_primary: false,
    })
  }

  const handleDelete = async (id: number) => {
    if (!window.electronAPI) return
    await window.electronAPI.db.deleteApiKey(id)
    await loadApiKeys()
  }

  const handleTogglePrimary = async (id: number) => {
    if (!window.electronAPI) return
    for (const key of apiKeys) {
      if (key.id !== undefined) {
        await window.electronAPI.db.updateApiKey(key.id, { is_primary: key.id === id })
      }
    }
    await loadApiKeys()
  }

  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const maskKey = (key: string) => {
    if (key.length <= 8) return '•'.repeat(key.length)
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Manager</h1>
          <p className="text-gray-400 mt-1">Manage your API keys and quotas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Add API Key
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New API Key</CardTitle>
            <CardDescription>Configure a new provider API key</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Provider</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    value={form.provider_slug}
                    onChange={(e) => {
                      const provider = providers.find((p) => p.slug === e.target.value)
                      if (provider) {
                        setForm({ ...form, provider_name: provider.name, provider_slug: provider.slug })
                      }
                    }}
                  >
                    {providers.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Label</label>
                  <Input
                    placeholder="e.g. API Utama"
                    value={form.label || ''}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">API Key</label>
                <Input
                  type="password"
                  placeholder="Paste your API key here"
                  value={form.api_key}
                  onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Total Quota</label>
                  <Input
                    type="number"
                    placeholder="0 = unlimited"
                    value={form.quota_total || ''}
                    onChange={(e) => setForm({ ...form, quota_total: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Quota Unit</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
                    value={form.quota_unit}
                    onChange={(e) => setForm({ ...form, quota_unit: e.target.value })}
                  >
                    <option value="characters">Characters</option>
                    <option value="minutes">Minutes</option>
                    <option value="credits">Credits</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="checkbox"
                      checked={form.is_primary || false}
                      onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                      className="rounded bg-gray-800 border-gray-700"
                    />
                    Set as Primary
                  </label>
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit">Save API Key</Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <div className="space-y-3">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500">No API keys configured yet.</p>
              <p className="text-gray-600 text-sm mt-1">
                Click &quot;Add API Key&quot; to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id} className={key.is_primary ? 'border-accent-500/50' : ''}>
              <CardContent className="flex items-center justify-between py-4 px-6">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">{key.provider_name}</span>
                      {key.label && (
                        <span className="text-xs text-gray-500">({key.label})</span>
                      )}
                      {key.is_primary ? (
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded">
                        {key.id !== undefined && visibleKeys.has(key.id) ? key.api_key : maskKey(key.api_key)}
                      </code>
                      <button
                        onClick={() => key.id !== undefined && toggleKeyVisibility(key.id)}
                        className="text-gray-500 hover:text-gray-300"
                      >
                        {key.id !== undefined && visibleKeys.has(key.id) ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    {key.quota_total ? (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            {key.quota_used || 0} / {key.quota_total} {key.quota_unit}
                          </span>
                        </div>
                        <div className="w-48 h-1.5 bg-gray-800 rounded-full mt-1">
                          <div
                            className="h-full bg-accent-500 rounded-full"
                            style={{
                              width: `${Math.min(((key.quota_used || 0) / key.quota_total) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!key.is_primary && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => key.id !== undefined && handleTogglePrimary(key.id)}
                      title="Set as primary"
                    >
                      <Star className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => key.id !== undefined && handleDelete(key.id)}
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
