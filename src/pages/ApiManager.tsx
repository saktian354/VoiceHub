import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { ToggleSwitch } from '@/components/ui/toggle-switch'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ApiKeyGuide } from '@/components/ui/api-key-guide'
import {
  Plus,
  Trash2,
  Star,
  Eye,
  EyeOff,
  Pencil,
  Loader2,
  CheckCircle2,
  XCircle,
  Key,
  Wifi,
  HelpCircle,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ApiKey } from '@/types'

const providers = [
  { name: 'TTS.ai', slug: 'ttsai', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { name: 'Fish Audio', slug: 'fishaudio', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  { name: 'ElevenLabs', slug: 'elevenlabs', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { name: 'Custom', slug: 'custom', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
]

function getProviderBadgeClass(slug: string): string {
  return providers.find((p) => p.slug === slug)?.color || providers[3].color
}

function getQuotaBarColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 70) return 'bg-yellow-500'
  return 'bg-green-500'
}

function maskApiKey(key: string): string {
  if (key.length <= 6) return key
  return key.slice(0, 6) + '••••••••'
}

const emptyForm: ApiKey = {
  provider_name: 'TTS.ai',
  provider_slug: 'ttsai',
  api_key: '',
  base_url: '',
  label: '',
  quota_total: 0,
  quota_used: 0,
  quota_unit: 'characters',
  is_active: true,
  is_primary: false,
}

export function ApiManager() {
  const {
    apiKeys,
    fetchApiKeys,
    addApiKey,
    updateApiKey,
    deleteApiKey,
    setPrimary,
    testConnection,
  } = useAppStore()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<ApiKey>({ ...emptyForm })
  const [showApiKey, setShowApiKey] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; label: string } | null>(null)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)

  useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  const openAddModal = useCallback(() => {
    setEditingId(null)
    setForm({ ...emptyForm })
    setShowApiKey(false)
    setTestResult(null)
    setModalOpen(true)
  }, [])

  const openEditModal = useCallback((key: ApiKey) => {
    setEditingId(key.id ?? null)
    setForm({
      ...key,
      is_active: !!key.is_active,
      is_primary: !!key.is_primary,
    })
    setShowApiKey(false)
    setTestResult(null)
    setModalOpen(true)
  }, [])

  const closeModal = useCallback(() => {
    setModalOpen(false)
    setEditingId(null)
    setTestResult(null)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.api_key || !form.label) return

    if (editingId !== null) {
      await updateApiKey(editingId, {
        provider_name: form.provider_name,
        provider_slug: form.provider_slug,
        api_key: form.api_key,
        label: form.label,
        quota_total: form.quota_total,
        quota_unit: form.quota_unit,
        is_active: form.is_active ? 1 : 0,
      })
    } else {
      await addApiKey({
        ...form,
        is_active: form.is_active ? 1 : 0,
        is_primary: form.is_primary ? 1 : 0,
      })
    }
    closeModal()
  }

  const handleTestConnection = async () => {
    if (!form.api_key) return
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await testConnection(
        form.provider_slug,
        form.api_key,
        form.provider_slug === 'custom' ? form.base_url : undefined
      )
      setTestResult(result)
    } catch {
      setTestResult({ success: false, message: 'Test failed unexpectedly' })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await deleteApiKey(deleteTarget.id)
    setDeleteTarget(null)
  }

  const handleToggleActive = async (key: ApiKey) => {
    if (key.id === undefined) return
    await updateApiKey(key.id, { is_active: key.is_active ? 0 : 1 })
  }

  const toggleKeyVisibility = (id: number) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleProviderChange = (slug: string) => {
    const provider = providers.find((p) => p.slug === slug)
    if (provider) {
      setForm((f) => ({ ...f, provider_name: provider.name, provider_slug: provider.slug }))
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">API Manager</h1>
          <p className="text-gray-400 mt-1">Manage your API keys and quotas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setGuideOpen(true)}>
            <HelpCircle className="w-4 h-4 mr-2" />
            Cara Dapat API Key
          </Button>
          <Button onClick={openAddModal}>
            <Plus className="w-4 h-4 mr-2" />
            Add API Key
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {apiKeys.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="inline-flex p-4 rounded-full bg-gray-800 mb-4">
              <Key className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Belum ada API Key</h3>
            <p className="text-gray-500 mb-6">
              Tambahkan API Key pertama Anda untuk mulai menggunakan VoiceHub.
            </p>
            <Button onClick={openAddModal}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Card Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {apiKeys.map((key) => {
            const quotaPercentage =
              key.quota_total && key.quota_total > 0
                ? Math.min(((key.quota_used || 0) / key.quota_total) * 100, 100)
                : -1
            const isVisible = key.id !== undefined && visibleKeys.has(key.id)

            return (
              <Card
                key={key.id}
                className={`transition-all ${key.is_primary ? 'border-accent-500/50 shadow-accent-500/5 shadow-lg' : ''}`}
              >
                <CardContent className="p-5">
                  {/* Top row: label + badges */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold">
                        {key.label || key.provider_name}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${getProviderBadgeClass(key.provider_slug)}`}
                      >
                        {key.provider_name}
                      </span>
                      {key.is_primary ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 font-medium">
                          PRIMARY
                        </span>
                      ) : null}
                    </div>
                    <ToggleSwitch
                      checked={!!key.is_active}
                      onChange={() => handleToggleActive(key)}
                    />
                  </div>

                  {/* API Key display */}
                  <div className="flex items-center gap-2 mb-4">
                    <code className="text-xs text-gray-400 bg-gray-800 px-2.5 py-1 rounded-md font-mono">
                      {isVisible ? key.api_key : maskApiKey(key.api_key)}
                    </code>
                    <button
                      onClick={() => key.id !== undefined && toggleKeyVisibility(key.id)}
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      {isVisible ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Quota Bar */}
                  <div className="mb-4">
                    {key.quota_total && key.quota_total > 0 ? (
                      <>
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                          <span>Quota Usage</span>
                          <span>
                            {Math.round(quotaPercentage)}% used ({key.quota_used || 0} {key.quota_unit} dari{' '}
                            {key.quota_total} {key.quota_unit})
                          </span>
                        </div>
                        <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${getQuotaBarColor(quotaPercentage)}`}
                            style={{ width: `${quotaPercentage}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-gray-500">
                        Quota: <span className="text-gray-400">Unlimited / Unknown</span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 border-t border-gray-800 pt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(key)}
                      className="text-gray-400"
                    >
                      <Pencil className="w-4 h-4 mr-1.5" />
                      Edit
                    </Button>
                    {!key.is_primary && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => key.id !== undefined && setPrimary(key.id)}
                        className="text-gray-400"
                      >
                        <Star className="w-4 h-4 mr-1.5" />
                        Set Primary
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      onClick={() =>
                        key.id !== undefined &&
                        setDeleteTarget({ id: key.id, label: key.label || key.provider_name })
                      }
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId !== null ? 'Edit API Key' : 'Add New API Key'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Label *</label>
            <Input
              placeholder='e.g. "API Utama"'
              value={form.label || ''}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">Provider</label>
            <select
              className="flex h-10 w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
              value={form.provider_slug}
              onChange={(e) => handleProviderChange(e.target.value)}
            >
              {providers.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {form.provider_slug === 'custom' && (
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Base URL Endpoint</label>
              <Input
                placeholder="https://api.example.com/v1"
                value={form.base_url || ''}
                onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              />
            </div>
          )}

          <div>
            <label className="text-sm text-gray-400 mb-1.5 block">API Key *</label>
            <div className="relative">
              <Input
                type={showApiKey ? 'text' : 'password'}
                placeholder="Paste your API key"
                value={form.api_key}
                onChange={(e) => setForm({ ...form, api_key: e.target.value })}
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Quota Total</label>
              <Input
                type="number"
                placeholder="0 = unlimited"
                value={form.quota_total || ''}
                onChange={(e) => setForm({ ...form, quota_total: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-1.5 block">Quota Unit</label>
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
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Status Aktif</label>
            <ToggleSwitch
              checked={!!form.is_active}
              onChange={(checked) => setForm({ ...form, is_active: checked })}
            />
          </div>

          {/* Test Connection */}
          <div className="border-t border-gray-800 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={!form.api_key || isTesting}
              className="w-full"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wifi className="w-4 h-4 mr-2" />
              )}
              {isTesting ? 'Testing...' : 'Test Connection'}
            </Button>
            {testResult && (
              <div
                className={`flex items-center gap-2 mt-3 text-sm ${
                  testResult.success ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 flex-shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 border-t border-gray-800 pt-4">
            <Button type="button" variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.api_key || !form.label}>
              {editingId !== null ? 'Save Changes' : 'Save API Key'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete API Key"
        message={`Are you sure you want to delete "${deleteTarget?.label}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
      />

      {/* API Key Guide */}
      <ApiKeyGuide open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  )
}
