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

const BASE_URL = 'https://api.elevenlabs.io/v1'
const TIMEOUT = 30000

function createClient(apiKey: string) {
  return axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    headers: {
      'xi-api-key': apiKey,
    },
  })
}

export const elevenLabsProvider: TTSProvider & {
  cloneVoice(apiKey: string, req: CloneRequest): Promise<CloneResponse>
} = {
  async getVoices(apiKey: string): Promise<VoiceListResponse> {
    try {
      const client = createClient(apiKey)
      const response = await client.get('/voices')
      const data = response.data

      const items = Array.isArray(data.voices) ? data.voices : []
      const voices = items.map((v: Record<string, unknown>) => {
        const labels = (v.labels ?? {}) as Record<string, string>
        return {
          id: String(v.voice_id ?? ''),
          name: String(v.name ?? 'Unknown'),
          language: String(labels.language ?? labels.accent ?? 'en'),
          gender: (['male', 'female', 'neutral'].includes(String(labels.gender ?? ''))
            ? String(labels.gender)
            : 'neutral') as 'male' | 'female' | 'neutral',
          preview_url: v.preview_url ? String(v.preview_url) : undefined,
        }
      })

      return { success: true, voices }
    } catch (error) {
      return { success: false, voices: [], error: handleApiError(error) }
    }
  },

  async generateSpeech(apiKey: string, req: TTSRequest): Promise<TTSResponse> {
    try {
      const client = createClient(apiKey)
      const response = await client.post(
        `/text-to-speech/${req.voiceId}`,
        {
          text: req.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          responseType: 'arraybuffer',
          headers: { Accept: 'audio/mpeg' },
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
      formData.append('name', req.name)
      if (req.description) {
        formData.append('description', req.description)
      }
      formData.append(
        'files',
        fs.createReadStream(req.referenceAudioPath),
        path.basename(req.referenceAudioPath)
      )

      const response = await client.post('/voices/add', formData, {
        headers: formData.getHeaders(),
        timeout: 60000,
      })

      const data = response.data
      return {
        success: true,
        voiceId: String(data.voice_id ?? ''),
      }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },

  async checkQuota(apiKey: string): Promise<QuotaResponse> {
    try {
      const client = createClient(apiKey)
      const response = await client.get('/user/subscription')
      const data = response.data

      return {
        success: true,
        quota: {
          used: Number(data.character_count ?? 0),
          total: Number(data.character_limit ?? 0),
          unit: 'characters',
        },
      }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },
}
