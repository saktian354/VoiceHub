import axios from 'axios'

const BASE_URL = 'https://api.tts.ai/v1'

export interface TTSRequest {
  text: string
  voice_id?: string
  language?: string
}

export interface TTSResponse {
  audio_url: string
  duration: number
  characters_used: number
}

export async function generateSpeech(apiKey: string, request: TTSRequest): Promise<TTSResponse> {
  const response = await axios.post<TTSResponse>(
    `${BASE_URL}/tts`,
    request,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  )
  return response.data
}

export async function getVoices(apiKey: string) {
  const response = await axios.get(`${BASE_URL}/voices`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return response.data
}
