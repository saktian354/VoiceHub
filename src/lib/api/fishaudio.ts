import axios from 'axios'

const BASE_URL = 'https://api.fish.audio/v1'

export interface FishTTSRequest {
  text: string
  reference_id?: string
  format?: string
}

export async function generateSpeech(apiKey: string, request: FishTTSRequest): Promise<ArrayBuffer> {
  const response = await axios.post(
    `${BASE_URL}/tts`,
    request,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
    }
  )
  return response.data as ArrayBuffer
}

export async function listModels(apiKey: string) {
  const response = await axios.get(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return response.data
}
