import { Sidebar } from './Sidebar'
import { useAppStore } from '@/store/useAppStore'
import { Dashboard } from '@/pages/Dashboard'
import { ApiManager } from '@/pages/ApiManager'
import { TextToSpeech } from '@/pages/TextToSpeech'
import { VoiceCloning } from '@/pages/VoiceCloning'

const pages: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  'api-manager': ApiManager,
  'text-to-speech': TextToSpeech,
  'voice-cloning': VoiceCloning,
}

export function MainLayout() {
  const activePage = useAppStore((s) => s.activePage)
  const ActiveComponent = pages[activePage] || Dashboard

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          <ActiveComponent />
        </div>
      </main>
    </div>
  )
}
