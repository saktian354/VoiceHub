import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Zap,
  FileText,
  KeyRound,
  Mic2,
  RefreshCw,
  Loader2,
  ArrowRight,
  Dna,
  Activity,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { DashboardStats, ChartDataPoint } from '@/types'

const PROVIDER_COLORS: Record<string, string> = {
  ttsai: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  fishaudio: 'bg-green-500/20 text-green-400 border-green-500/30',
  elevenlabs: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  custom: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Selamat Pagi'
  if (hour >= 12 && hour < 15) return 'Selamat Siang'
  if (hour >= 15 && hour < 19) return 'Selamat Sore'
  return 'Selamat Malam'
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`
  return n.toLocaleString('id-ID')
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '-'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-sm text-white font-medium">{label}</p>
      <p className="text-xs text-accent-400">{formatNumber(payload[0].value)} karakter</p>
    </div>
  )
}

export function Dashboard() {
  const { setActivePage } = useAppStore()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    if (!window.electronAPI) return
    setIsLoading(true)
    try {
      const [statsData, chart] = await Promise.all([
        window.electronAPI.dashboard.getStats(),
        window.electronAPI.dashboard.getChartData(),
      ])
      setStats(statsData)
      setChartData(chart)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const statCards = stats
    ? [
        {
          title: 'Total Generate Hari Ini',
          value: stats.todayGenerates,
          icon: Zap,
          color: 'text-blue-400',
          bg: 'bg-blue-400/10',
        },
        {
          title: 'Karakter Diproses (Bulan Ini)',
          value: `${formatNumber(stats.monthCharacters)} chars`,
          icon: FileText,
          color: 'text-green-400',
          bg: 'bg-green-400/10',
        },
        {
          title: 'API Key Aktif',
          value: stats.activeApiKeys,
          icon: KeyRound,
          color: 'text-accent-400',
          bg: 'bg-accent-400/10',
        },
        {
          title: 'Voice Profiles',
          value: stats.voiceProfileCount,
          icon: Mic2,
          color: 'text-orange-400',
          bg: 'bg-orange-400/10',
        },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* 1. GREETING HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()} <span className="inline-block">&#128075;</span>
          </h1>
          <p className="text-gray-400 mt-1">
            Ini ringkasan aktivitas VoiceHub Anda.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadDashboard}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1.5" />
          )}
          Refresh
        </Button>
      </div>

      {/* 2. STAT CARDS */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.title}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-400">{stat.title}</span>
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <Icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 3. GRAFIK PENGGUNAAN 7 HARI */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Penggunaan 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis
                    dataKey="dayLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickFormatter={(v: number) => formatNumber(v)}
                    width={50}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
                  />
                  <Bar
                    dataKey="characters"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-600">
              <p>Belum ada data penggunaan.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. STATUS API KEYS */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Status API Keys</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivePage('api-manager')}
              >
                Kelola <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats && stats.apiKeysStatus.length > 0 ? (
              <div className="space-y-3">
                {stats.apiKeysStatus.map((key) => {
                  const colorClass = PROVIDER_COLORS[key.provider_slug] || PROVIDER_COLORS.custom
                  const pct = key.quota_total > 0 ? Math.min((key.quota_used / key.quota_total) * 100, 100) : 0
                  const barColor =
                    pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  const isActive = key.is_active === 1 || key.is_active === true

                  return (
                    <div key={key.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-white font-medium truncate">
                            {key.label || key.provider_name}
                          </span>
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium border ${colorClass}`}>
                            {key.provider_name}
                          </span>
                        </div>
                        {key.quota_total > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap">
                              {formatNumber(key.quota_total - key.quota_used)} sisa
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-600">Unlimited / Unknown</span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-gray-500/10 text-gray-500'
                        }`}
                      >
                        {isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-gray-600 text-sm">
                <KeyRound className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Belum ada API Key.
              </div>
            )}
          </CardContent>
        </Card>

        {/* 5. AKTIVITAS TERAKHIR */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Aktivitas Terakhir</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && stats.recentLogs.length > 0 ? (
              <div className="space-y-3">
                {stats.recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0"
                  >
                    <div className={`p-1.5 rounded-lg ${
                      log.action === 'clone' ? 'bg-purple-500/10' : 'bg-accent-500/10'
                    }`}>
                      {log.action === 'clone' ? (
                        <Dna className={`w-3.5 h-3.5 ${log.action === 'clone' ? 'text-purple-400' : 'text-accent-400'}`} />
                      ) : (
                        <Mic2 className="w-3.5 h-3.5 text-accent-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">
                        {log.input_text
                          ? log.input_text.length > 40
                            ? log.input_text.slice(0, 40) + '...'
                            : log.input_text
                          : log.action === 'clone'
                          ? 'Voice Cloning'
                          : 'TTS Generate'}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                        <span>{log.provider_name || '-'}</span>
                        <span>&middot;</span>
                        <span>{timeAgo(log.timestamp)}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${
                        log.status === 'success'
                          ? 'bg-green-500/10 text-green-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}
                    >
                      {log.status === 'success' ? 'Berhasil' : 'Gagal'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-gray-600 text-sm">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Belum ada aktivitas.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6. QUICK ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setActivePage('tts')} className="gap-2">
          <Mic2 className="w-4 h-4" />
          Mulai TTS
        </Button>
        <Button onClick={() => setActivePage('voice-cloning')} variant="outline" className="gap-2">
          <Dna className="w-4 h-4" />
          Clone Suara
        </Button>
        <Button onClick={() => setActivePage('api-manager')} variant="outline" className="gap-2">
          <KeyRound className="w-4 h-4" />
          Tambah API Key
        </Button>
      </div>
    </div>
  )
}
