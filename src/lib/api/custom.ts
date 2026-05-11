import axios from 'axios'
import type {
  TTSProvider,
  TTSRequest,
  TTSResponse,
  VoiceListResponse,
  QuotaResponse,
} from './types'
import { handleApiError } from './errors'

const TIMEOUT = 30000

function createClient(apiKey: string, baseUrl: string) {
  return axios.create({
    baseURL: baseUrl,
    timeout: TIMEOUT,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
}

export function createCustomProvider(baseUrl: string): TTSProvider {
  return {
    async getVoices(apiKey: string): Promise<VoiceListResponse> {
      try {
        const client = createClient(apiKey, baseUrl)

        let voices: VoiceListResponse['voices'] = []
        try {
          const response = await client.get('/v1/voices')
          const data = response.data
          const items = Array.isArray(data.voices) ? data.voices : Array.isArray(data) ? data : []
          voices = items.map((v: Record<string, unknown>) => ({
            id: String(v.id ?? v.voice_id ?? ''),
            name: String(v.name ?? 'Unknown'),
            language: String(v.language ?? 'en'),
            gender: 'neutral' as const,
            preview_url: v.preview_url ? String(v.preview_url) : undefined,
          }))
        } catch {
          const response = await client.get('/v1/models')
          const data = response.data
          const items = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : []
          voices = items.map((v: Record<string, unknown>) => ({
            id: String(v.id ?? ''),
            name: String(v.id ?? 'Unknown'),
            language: 'en',
            gender: 'neutral' as const,
          }))
        }

        return { success: true, voices }
      } catch (error) {
        return { success: false, voices: [], error: handleApiError(error) }
      }
    },

    async generateSpeech(apiKey: string, req: TTSRequest): Promise<TTSResponse> {
      try {
        const client = createClient(apiKey, baseUrl)
        const response = await client.post(
          '/v1/audio/speech',
          {
            model: 'tts-1',
            input: req.text,
            voice: req.voiceId,
            speed: req.speed ?? 1.0,
            response_format: req.outputFormat ?? 'mp3',
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
        const client = createClient(apiKey, baseUrl)
        const response = await client.get('/v1/usage')
        const data = response.data

        return {
          success: true,
          quota: {
            used: Number(data.used ?? data.total_usage ?? 0),
            total: Number(data.total ?? data.hard_limit ?? 0),
            unit: String(data.unit ?? 'credits'),
          },
        }
      } catch {
        return {
          success: true,
          quota: { used: 0, total: 0, unit: 'credits' },
        }
      }
    },
  }
}
