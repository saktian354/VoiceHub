import axios from 'axios'
import type {
  TTSProvider,
  TTSRequest,
  TTSResponse,
  VoiceListResponse,
  QuotaResponse,
} from './types'
import { handleApiError } from './errors'

const BASE_URL = 'https://api.tts.ai/v1'
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

export const ttsaiProvider: TTSProvider = {
  async getVoices(apiKey: string): Promise<VoiceListResponse> {
    try {
      const client = createClient(apiKey)
      const response = await client.get('/voices')
      const data = response.data

      const voices = Array.isArray(data.voices)
        ? data.voices.map((v: Record<string, unknown>) => ({
            id: String(v.id ?? ''),
            name: String(v.name ?? 'Unknown'),
            language: String(v.language ?? 'en'),
            gender: (['male', 'female', 'neutral'].includes(String(v.gender ?? ''))
              ? String(v.gender)
              : 'neutral') as 'male' | 'female' | 'neutral',
            preview_url: v.preview_url ? String(v.preview_url) : undefined,
          }))
        : []

      return { success: true, voices }
    } catch (error) {
      return { success: false, voices: [], error: handleApiError(error) }
    }
  },

  async generateSpeech(apiKey: string, req: TTSRequest): Promise<TTSResponse> {
    try {
      const client = createClient(apiKey)
      const response = await client.post(
        '/tts',
        {
          text: req.text,
          voice_id: req.voiceId,
          speed: req.speed ?? 1.0,
          output_format: req.outputFormat ?? 'mp3',
          language: req.language,
        },
        { responseType: 'arraybuffer' }
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

  async checkQuota(apiKey: string): Promise<QuotaResponse> {
    try {
      const client = createClient(apiKey)
      const response = await client.get('/account')
      const data = response.data

      return {
        success: true,
        quota: {
          used: Number(data.characters_used ?? data.usage ?? 0),
          total: Number(data.characters_limit ?? data.quota ?? 0),
          unit: 'characters',
        },
      }
    } catch (error) {
      return { success: false, error: handleApiError(error) }
    }
  },
}
