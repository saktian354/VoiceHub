export interface TTSRequest {
  text: string
  voiceId: string
  speed?: number
  pitch?: number
  language?: string
  outputFormat?: 'mp3' | 'wav'
}

export interface TTSResponse {
  success: boolean
  audioBuffer?: ArrayBuffer
  audioUrl?: string
  charactersUsed: number
  error?: string
}

export interface VoiceListResponse {
  success: boolean
  voices: Voice[]
  error?: string
}

export interface Voice {
  id: string
  name: string
  language: string
  gender: 'male' | 'female' | 'neutral'
  preview_url?: string
}

export interface CloneRequest {
  name: string
  referenceAudioPath: string
  description?: string
}

export interface CloneResponse {
  success: boolean
  voiceId?: string
  error?: string
}

export interface QuotaInfo {
  used: number
  total: number
  unit: string
}

export interface QuotaResponse {
  success: boolean
  quota?: QuotaInfo
  error?: string
}

export interface TTSProvider {
  getVoices(apiKey: string): Promise<VoiceListResponse>
  generateSpeech(apiKey: string, req: TTSRequest): Promise<TTSResponse>
  checkQuota(apiKey: string): Promise<QuotaResponse>
  cloneVoice?(apiKey: string, req: CloneRequest): Promise<CloneResponse>
}
