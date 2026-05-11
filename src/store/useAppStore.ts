import { create } from 'zustand'
import type { ApiKey, UsageLog, VoiceProfile } from '@/types'

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
  loadApiKeys: () => Promise<void>

  // Usage Logs
  usageLogs: UsageLog[]
  setUsageLogs: (logs: UsageLog[]) => void
  loadUsageLogs: () => Promise<void>

  // Voice Profiles
  voiceProfiles: VoiceProfile[]
  setVoiceProfiles: (profiles: VoiceProfile[]) => void
  loadVoiceProfiles: () => Promise<void>
}

export const useAppStore = create<AppState>((set) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  // Active page
  activePage: 'dashboard',
  setActivePage: (page: string) => set({ activePage: page }),

  // API Keys
  apiKeys: [],
  setApiKeys: (keys: ApiKey[]) => set({ apiKeys: keys }),
  loadApiKeys: async () => {
    if (window.electronAPI) {
      const keys = await window.electronAPI.db.getApiKeys()
      set({ apiKeys: keys })
    }
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
