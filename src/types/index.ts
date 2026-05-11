export interface ApiKey {
  id?: number
  provider_name: string
  provider_slug: string
  api_key: string
  label?: string
  quota_total?: number
  quota_used?: number
  quota_unit?: string
  is_active?: boolean
  is_primary?: boolean
  created_at?: string
}

export interface UsageLog {
  id?: number
  api_key_id: number
  action: string
  input_text?: string
  characters_used?: number
  duration_seconds?: number
  status?: string
  timestamp?: string
  provider_name?: string
  api_label?: string
}

export interface VoiceProfile {
  id?: number
  name: string
  api_key_id?: number
  voice_id?: string
  reference_audio_path?: string
  created_at?: string
  provider_name?: string
}

export interface ElectronAPI {
  db: {
    getApiKeys: () => Promise<ApiKey[]>
    addApiKey: (key: ApiKey) => Promise<{ changes: number; lastInsertRowid: number }>
    updateApiKey: (id: number, key: Partial<ApiKey>) => Promise<{ changes: number }>
    deleteApiKey: (id: number) => Promise<{ changes: number }>
    getUsageLogs: (limit?: number) => Promise<UsageLog[]>
    addUsageLog: (log: UsageLog) => Promise<{ changes: number; lastInsertRowid: number }>
    getVoiceProfiles: () => Promise<VoiceProfile[]>
    addVoiceProfile: (profile: VoiceProfile) => Promise<{ changes: number; lastInsertRowid: number }>
    deleteVoiceProfile: (id: number) => Promise<{ changes: number }>
  }
  getAppVersion: () => Promise<string>
  getDataPath: () => Promise<string>
  selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>
  saveFile: (defaultName: string) => Promise<string | null>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
