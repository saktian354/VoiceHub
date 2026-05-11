import axios from 'axios'
import type {
  TTSProvider,
  TTSRequest,
  TTSResponse,
  VoiceListResponse,
  QuotaResponse,
  CloneRequest,
  CloneResponse,
} from './types'
import { handleApiError } from './errors'

const BASE_URL = 'https://api.fish.audio'
const TIMEOUT = 30000

function createClient(apiKey: string) {
  return axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
}

export const fishAudioProvider: TTSProvider & {
  cloneVoice(apiKey: string, req: CloneRequest): Promise<CloneResponse>
} = {
  async getVoices(apiKey: string): Promise<VoiceListResponse> {
    try {
      const client = createClient(apiKey)
      const response = await client.get('/model')
      const data = response.data

      const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []
      const voices = items.map((v: Record<string, unknown>) => ({
        id: String(v._id ?? v.id ?? ''),
        name: String(v.title ?? v.name ?? 'Unknown'),
        language: String(
          Array.isArray(v.languages) && v.languages.length > 0
            ? v.languages[0]
            : (v.language ?? 'en')
        ),
        gender: 'neutral' as const,
        preview_url: v.cover_image ? String(v.cover_image) : undefined,
      }))

      return { success: true, voices }
    } catch (error) {
      return { success: false, voices: [], error: handleApiError(error) }
    }
  },

  async generateSpeech(apiKey: string, req: TTSRequest): Promise<TTSResponse> {
    try {
      const client = createClient(apiKey)
      const response = await client.post(
        '/v1/tts',
        {
          text: req.text,
          reference_id: req.voiceId,
          format: req.outputFormat ?? 'mp3',
          latency: 'normal',
        },
        {
          responseType: 'arraybuffer',
          headers: { 'Content-Type': 'application/json' },
        }
      )

      return {
        success: true,
        audioBuffer: response.data as ArrayBuffer,
        charactersUsed: req.text.length,
      }
    } catch (error) {
      return {
        success: false,
        charactersUsed: req.text.length,
        error: handleApiError(error),
      }
    }
  },

  async cloneVoice(apiKey: string, req: CloneRequest): Promise<CloneResponse> {
    try {
      const client = createClient(apiKey)

      const fs = await import('fs')
      const path = await import('path')
      const FormData = (await import('form-data')).default

      const formData = new FormData()
      formData.append('title', req.name)
      if (req.description) {
        formData.append('description', req.description)
      }
      formData.append('visibility', 'private')
      formData.append(
        'voices',
        fs.createReadStream(req.referenceAudioPath),
        path.basename(req.referenceAudioPath)
      )

      const response = await client.post('/model', formData, {
        headers: formData.getHeaders(),
        timeout: 60000,
      })

      const data = response.data
      return {
        success: true,
        voiceId: String(data._id ?? data.id ?? ''),
      }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  async checkQuota(apiKey: string): Promise<QuotaResponse> {
    try {
      const client = createClient(apiKey)
      const response = await client.get('/wallet/self/api-credit')
      const data = response.data

      return {
        success: true,
        quota: {
          used: Number(data.used ?? 0),
          total: Number(data.total ?? 0),
          unit: 'credits',
        },
      }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },
}
