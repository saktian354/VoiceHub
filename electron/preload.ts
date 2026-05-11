import { contextBridge, ipcRenderer } from 'electron'

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
}

export interface VoiceProfile {
  id?: number
  name: string
  api_key_id?: number
  voice_id?: string
  reference_audio_path?: string
  created_at?: string
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  db: {
    getApiKeys: () => ipcRenderer.invoke('db:getApiKeys'),
    addApiKey: (key: ApiKey) => ipcRenderer.invoke('db:addApiKey', key),
    updateApiKey: (id: number, key: Partial<ApiKey>) => ipcRenderer.invoke('db:updateApiKey', id, key),
    deleteApiKey: (id: number) => ipcRenderer.invoke('db:deleteApiKey', id),
    setPrimary: (id: number) => ipcRenderer.invoke('db:setPrimary', id),
    testConnection: (provider: string, apiKey: string, baseUrl?: string) =>
      ipcRenderer.invoke('db:testConnection', provider, apiKey, baseUrl),

    getUsageLogs: (limit?: number) => ipcRenderer.invoke('db:getUsageLogs', limit),
    addUsageLog: (log: UsageLog) => ipcRenderer.invoke('db:addUsageLog', log),

    deleteUsageLog: (id: number) => ipcRenderer.invoke('db:deleteUsageLog', id),
    getVoiceProfiles: () => ipcRenderer.invoke('db:getVoiceProfiles'),
    addVoiceProfile: (profile: VoiceProfile) => ipcRenderer.invoke('db:addVoiceProfile', profile),
    deleteVoiceProfile: (id: number) => ipcRenderer.invoke('db:deleteVoiceProfile', id),
  },

  // TTS Operations
  tts: {
    generate: (apiKeyRecord: ApiKey, ttsRequest: Record<string, unknown>) =>
      ipcRenderer.invoke('tts:generate', apiKeyRecord, ttsRequest),
    getVoices: (apiKeyRecord: ApiKey) =>
      ipcRenderer.invoke('tts:getVoices', apiKeyRecord),
    checkQuota: (apiKeyRecord: ApiKey) =>
      ipcRenderer.invoke('api:checkQuota', apiKeyRecord),
  },

  // Audio file operations
  audio: {
    saveTempAudio: (audioData: number[], format: string) =>
      ipcRenderer.invoke('audio:saveTempAudio', audioData, format),
    saveToFile: (audioData: number[], defaultName: string) =>
      ipcRenderer.invoke('audio:saveToFile', audioData, defaultName),
    readFile: (filePath: string) =>
      ipcRenderer.invoke('audio:readFile', filePath),
    cleanupTemp: () => ipcRenderer.invoke('audio:cleanupTemp'),
  },

  // Voice Cloning
  voice: {
    copyReferenceAudio: (sourcePath: string) =>
      ipcRenderer.invoke('voice:copyReferenceAudio', sourcePath),
    getAudioInfo: (filePath: string) =>
      ipcRenderer.invoke('voice:getAudioInfo', filePath),
    clone: (apiKeyRecord: ApiKey, cloneRequest: { name: string; referenceAudioPath: string; description?: string }) =>
      ipcRenderer.invoke('voice:clone', apiKeyRecord, cloneRequest),
    deleteProfile: (id: number) =>
      ipcRenderer.invoke('voice:deleteProfile', id),
    test: (apiKeyRecord: ApiKey, voiceId: string, text: string) =>
      ipcRenderer.invoke('voice:test', apiKeyRecord, voiceId, text),
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  getDataPath: () => ipcRenderer.invoke('app:getDataPath'),

  // File dialogs
  selectFile: (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('dialog:selectFile', filters),
  saveFile: (defaultName: string) => ipcRenderer.invoke('dialog:saveFile', defaultName),
})
