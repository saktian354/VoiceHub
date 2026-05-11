import axios from 'axios'

const BASE_URL = 'https://api.elevenlabs.io/v1'

export interface ElevenLabsTTSRequest {
  text: string
  model_id?: string
  voice_settings?: {
    stability: number
    similarity_boost: number
  }
}

export async function generateSpeech(
  apiKey: string,
  voiceId: string,
  request: ElevenLabsTTSRequest
): Promise<ArrayBuffer> {
  const response = await axios.post(
    `${BASE_URL}/text-to-speech/${voiceId}`,
    request,
    {
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
    }
  )
  return response.data as ArrayBuffer
}

export async function getVoices(apiKey: string) {
  const response = await axios.get(`${BASE_URL}/voices`, {
    headers: { 'xi-api-key': apiKey },
  })
  return response.data
}

export async function getSubscription(apiKey: string) {
  const response = await axios.get(`${BASE_URL}/user/subscription`, {
    headers: { 'xi-api-key': apiKey },
  })
  return response.data
}
