import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Key, MessageSquareText, AudioLines, Activity } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export function Dashboard() {
  const { apiKeys, usageLogs, voiceProfiles, loadApiKeys, loadUsageLogs, loadVoiceProfiles } =
    useAppStore()
  const [dataPath, setDataPath] = useState<string>('')

  useEffect(() => {
    loadApiKeys()
    loadUsageLogs()
    loadVoiceProfiles()

    if (window.electronAPI) {
      window.electronAPI.getDataPath().then(setDataPath)
    }
  }, [loadApiKeys, loadUsageLogs, loadVoiceProfiles])

  const stats = [
    {
      title: 'API Keys',
      value: apiKeys.length,
      description: `${apiKeys.filter((k) => k.is_active).length} active`,
      icon: Key,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
    {
      title: 'Total Requests',
      value: usageLogs.length,
      description: `${usageLogs.filter((l) => l.status === 'success').length} successful`,
      icon: Activity,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
    },
    {
      title: 'TTS Generated',
      value: usageLogs.filter((l) => l.action === 'tts').length,
      description: 'Text to Speech',
      icon: MessageSquareText,
      color: 'text-accent-400',
      bg: 'bg-accent-400/10',
    },
    {
      title: 'Voice Profiles',
      value: voiceProfiles.length,
      description: 'Cloned voices',
      icon: AudioLines,
      color: 'text-purple-400',
      bg: 'bg-purple-400/10',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">
          Welcome to VoiceHub — your portable voice toolkit
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest voice operations</CardDescription>
        </CardHeader>
        <CardContent>
          {usageLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No activity yet. Start by adding an API key!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {usageLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div>
                    <p className="text-sm text-white font-medium capitalize">{log.action}</p>
                    <p className="text-xs text-gray-500">
                      {log.provider_name} • {log.characters_used} chars
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      log.status === 'success'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Path Info */}
      {dataPath && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Data Location</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-md">
              {dataPath}
            </code>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
