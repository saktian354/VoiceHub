import { ttsaiProvider } from './ttsai'
import { fishAudioProvider } from './fishaudio'
import { elevenLabsProvider } from './elevenlabs'
import { createCustomProvider } from './custom'
import type {
  TTSProvider,
  TTSRequest,
  TTSResponse,
  VoiceListResponse,
  QuotaResponse,
  CloneRequest,
  CloneResponse,
} from './types'
import type { ApiKey } from '@/types'

export type { TTSRequest, TTSResponse, VoiceListResponse, Voice, QuotaResponse, CloneRequest, CloneResponse } from './types'

export function getProvider(providerSlug: string, baseUrl?: string): TTSProvider {
  switch (providerSlug) {
    case 'ttsai':
      return ttsaiProvider
    case 'fishaudio':
      return fishAudioProvider
    case 'elevenlabs':
      return elevenLabsProvider
    default:
      return createCustomProvider(baseUrl || '')
  }
}

export async function generateTTS(
  apiKeyRecord: ApiKey,
  req: TTSRequest
): Promise<TTSResponse> {
  const provider = getProvider(apiKeyRecord.provider_slug, apiKeyRecord.base_url)
  const startTime = Date.now()

  const result = await provider.generateSpeech(apiKeyRecord.api_key, req)

  const durationSeconds = (Date.now() - startTime) / 1000

  if (window.electronAPI) {
    await window.electronAPI.db.addUsageLog({
      api_key_id: apiKeyRecord.id!,
      action: 'tts',
      input_text: req.text,
      characters_used: result.charactersUsed,
      duration_seconds: durationSeconds,
      status: result.success ? 'success' : 'failed',
    })

    if (result.success && apiKeyRecord.id !== undefined) {
      const currentUsed = Number(apiKeyRecord.quota_used ?? 0)
      await window.electronAPI.db.updateApiKey(apiKeyRecord.id, {
        quota_used: currentUsed + result.charactersUsed,
      })
    }
  }

  return result
}

export async function getVoices(apiKeyRecord: ApiKey): Promise<VoiceListResponse> {
  const provider = getProvider(apiKeyRecord.provider_slug, apiKeyRecord.base_url)
  return provider.getVoices(apiKeyRecord.api_key)
}

export async function checkQuota(apiKeyRecord: ApiKey): Promise<QuotaResponse> {
  const provider = getProvider(apiKeyRecord.provider_slug, apiKeyRecord.base_url)
  const result = await provider.checkQuota(apiKeyRecord.api_key)

  if (result.success && result.quota && apiKeyRecord.id !== undefined && window.electronAPI) {
    await window.electronAPI.db.updateApiKey(apiKeyRecord.id, {
      quota_used: result.quota.used,
      quota_total: result.quota.total,
      quota_unit: result.quota.unit,
    })
  }

  return result
}

export async function cloneVoice(
  apiKeyRecord: ApiKey,
  req: CloneRequest
): Promise<CloneResponse> {
  const provider = getProvider(apiKeyRecord.provider_slug, apiKeyRecord.base_url)

  if (!('cloneVoice' in provider) || typeof provider.cloneVoice !== 'function') {
    return {
      success: false,
      error: `Provider ${apiKeyRecord.provider_name} tidak mendukung voice cloning.`,
    }
  }

  const cloneableProvider = provider as TTSProvider & {
    cloneVoice(apiKey: string, req: CloneRequest): Promise<CloneResponse>
  }

  const startTime = Date.now()
  const result = await cloneableProvider.cloneVoice(apiKeyRecord.api_key, req)
  const durationSeconds = (Date.now() - startTime) / 1000

  if (window.electronAPI) {
    await window.electronAPI.db.addUsageLog({
      api_key_id: apiKeyRecord.id!,
      action: 'clone',
      input_text: req.name,
      characters_used: 0,
      duration_seconds: durationSeconds,
      status: result.success ? 'success' : 'failed',
    })
  }

  return result
}
