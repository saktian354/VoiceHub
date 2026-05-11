import {
  LayoutDashboard,
  Key,
  MessageSquareText,
  AudioLines,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'

interface NavItem {
  id: string
  label: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'api-manager', label: 'API Manager', icon: Key },
  { id: 'text-to-speech', label: 'Text to Speech', icon: MessageSquareText },
  { id: 'voice-cloning', label: 'Voice Cloning', icon: AudioLines },
]

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, activePage, setActivePage } = useAppStore()

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-gray-900 border-r border-gray-800 transition-all duration-300',
        sidebarCollapsed ? 'w-[68px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center flex-shrink-0">
            <AudioLines className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-lg font-bold text-white whitespace-nowrap">
              VoiceHub
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activePage === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={cn(
                'flex items-center w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-500/10 text-accent-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
                sidebarCollapsed && 'justify-center px-2'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className={cn('w-5 h-5 flex-shrink-0', !sidebarCollapsed && 'mr-3')} />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
