import { create } from 'zustand'
import type { ApiKey, UsageLog, VoiceProfile, TestConnectionResult } from '@/types'

interface AppState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  // Active page
  activePage: string
  setActivePage: (page: string) => void

  // API Keys
  apiKeys: ApiKey[]
  setApiKeys: (keys: ApiKey[]) => void
  fetchApiKeys: () => Promise<void>
  addApiKey: (key: ApiKey) => Promise<void>
  updateApiKey: (id: number, data: Partial<ApiKey>) => Promise<void>
  deleteApiKey: (id: number) => Promise<void>
  setPrimary: (id: number) => Promise<void>
  testConnection: (provider: string, apiKey: string, baseUrl?: string) => Promise<TestConnectionResult>

  // Usage Logs
  usageLogs: UsageLog[]
  setUsageLogs: (logs: UsageLog[]) => void
  loadUsageLogs: () => Promise<void>

  // Voice Profiles
  voiceProfiles: VoiceProfile[]
  setVoiceProfiles: (profiles: VoiceProfile[]) => void
  loadVoiceProfiles: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Active page
  activePage: 'dashboard',
  setActivePage: (page: string) => set({ activePage: page }),

  // API Keys
  apiKeys: [],
  setApiKeys: (keys: ApiKey[]) => set({ apiKeys: keys }),

  fetchApiKeys: async () => {
    if (window.electronAPI) {
      const keys = await window.electronAPI.db.getApiKeys()
      set({ apiKeys: keys })
    }
  },

  addApiKey: async (key: ApiKey) => {
    if (window.electronAPI) {
      await window.electronAPI.db.addApiKey(key)
      await get().fetchApiKeys()
    }
  },

  updateApiKey: async (id: number, data: Partial<ApiKey>) => {
    if (window.electronAPI) {
      await window.electronAPI.db.updateApiKey(id, data)
      await get().fetchApiKeys()
    }
  },

  deleteApiKey: async (id: number) => {
    if (window.electronAPI) {
      await window.electronAPI.db.deleteApiKey(id)
      await get().fetchApiKeys()
    }
  },

  setPrimary: async (id: number) => {
    if (window.electronAPI) {
      await window.electronAPI.db.setPrimary(id)
      await get().fetchApiKeys()
    }
  },

  testConnection: async (provider: string, apiKey: string, baseUrl?: string) => {
    if (window.electronAPI) {
      return window.electronAPI.db.testConnection(provider, apiKey, baseUrl)
    }
    return { success: false, message: 'Electron API not available' }
  },

  // Usage Logs
  usageLogs: [],
  setUsageLogs: (logs: UsageLog[]) => set({ usageLogs: logs }),
  loadUsageLogs: async () => {
    if (window.electronAPI) {
      const logs = await window.electronAPI.db.getUsageLogs()
      set({ usageLogs: logs })
    }
  },

  // Voice Profiles
  voiceProfiles: [],
  setVoiceProfiles: (profiles: VoiceProfile[]) => set({ voiceProfiles: profiles }),
  loadVoiceProfiles: async () => {
    if (window.electronAPI) {
      const profiles = await window.electronAPI.db.getVoiceProfiles()
      set({ voiceProfiles: profiles })
    }
  },
}))
