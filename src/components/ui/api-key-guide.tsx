import { useState } from 'react'
import { Modal } from './modal'
import { ExternalLink, Copy, CheckCircle2 } from 'lucide-react'
import { Button } from './button'

interface ApiKeyGuideProps {
  open: boolean
  onClose: () => void
}

const providers = [
  {
    name: 'Fish Audio',
    slug: 'fishaudio',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    activeColor: 'bg-green-500/20 border-green-500/40',
    url: 'https://fish.audio',
    dashboardUrl: 'https://fish.audio/dashboard',
    steps: [
      'Buka website Fish Audio di fish.audio',
      'Klik "Sign Up" atau "Login" jika sudah punya akun',
      'Setelah login, buka halaman Dashboard',
      'Klik menu "API Keys" di sidebar kiri',
      'Klik tombol "Create API Key"',
      'Beri nama untuk API Key Anda (opsional)',
      'Copy API Key yang muncul — simpan baik-baik karena hanya ditampilkan sekali',
    ],
    notes: 'Fish Audio mendukung Text-to-Speech dan Voice Cloning. Tersedia free tier dengan batasan penggunaan.',
  },
  {
    name: 'ElevenLabs',
    slug: 'elevenlabs',
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    activeColor: 'bg-orange-500/20 border-orange-500/40',
    url: 'https://elevenlabs.io',
    dashboardUrl: 'https://elevenlabs.io/app/settings/api-keys',
    steps: [
      'Buka website ElevenLabs di elevenlabs.io',
      'Klik "Sign Up" untuk buat akun baru, atau "Login"',
      'Setelah login, klik ikon profil di pojok kanan atas',
      'Pilih "Profile + API Key"',
      'Di bagian API Key, klik ikon mata (👁) untuk menampilkan key',
      'Atau klik "Create API Key" jika belum ada',
      'Copy API Key yang ditampilkan',
    ],
    notes: 'ElevenLabs mendukung TTS dan Voice Cloning. Free plan: 10.000 karakter/bulan. Kualitas suara sangat natural.',
  },
  {
    name: 'TTS.ai',
    slug: 'ttsai',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    activeColor: 'bg-blue-500/20 border-blue-500/40',
    url: 'https://tts.ai',
    dashboardUrl: 'https://tts.ai/dashboard',
    steps: [
      'Buka website TTS.ai di tts.ai',
      'Buat akun baru atau login dengan akun yang sudah ada',
      'Setelah login, buka halaman Dashboard',
      'Navigasi ke bagian "API" atau "Developer Settings"',
      'Klik "Generate API Key" atau "Create New Key"',
      'Beri label pada API Key (opsional)',
      'Copy API Key yang dihasilkan dan simpan di tempat aman',
    ],
    notes: 'TTS.ai hanya mendukung Text-to-Speech (tidak ada fitur Voice Cloning).',
  },
  {
    name: 'Custom',
    slug: 'custom',
    color: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    activeColor: 'bg-gray-500/20 border-gray-500/40',
    url: '',
    dashboardUrl: '',
    steps: [
      'Siapkan server TTS Anda sendiri atau gunakan provider TTS lain yang kompatibel',
      'Pastikan server mendukung format OpenAI-compatible TTS endpoint',
      'Endpoint yang digunakan: POST {baseUrl}/v1/audio/speech',
      'Dapatkan API Key dari penyedia layanan Anda',
      'Di VoiceHub, isi "Base URL" dengan URL server Anda (tanpa /v1/audio/speech)',
      'Masukkan API Key yang sesuai',
    ],
    notes: 'Untuk provider custom yang menggunakan format OpenAI-compatible API. Pastikan endpoint Anda menerima request dengan format yang sama.',
  },
]

export function ApiKeyGuide({ open, onClose }: ApiKeyGuideProps) {
  const [activeProvider, setActiveProvider] = useState(0)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const provider = providers[activeProvider]

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  return (
    <Modal open={open} onClose={onClose} title="Cara Mendapatkan API Key" className="max-w-2xl">
      <div className="space-y-4">
        {/* Provider Tabs */}
        <div className="flex gap-2 flex-wrap">
          {providers.map((p, i) => (
            <button
              key={p.slug}
              onClick={() => { setActiveProvider(i); setCopiedUrl(false) }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                activeProvider === i ? p.activeColor : p.color
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Provider Content */}
        <div className="rounded-lg border border-gray-800 bg-gray-800/50 p-4 space-y-4">
          {/* Provider Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{provider.name}</h3>
            {provider.url && (
              <a
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Buka Website
              </a>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">Langkah-langkah:</h4>
            <ol className="space-y-2">
              {provider.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 text-xs flex items-center justify-center font-medium">
                    {i + 1}
                  </span>
                  <span className="text-gray-300 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Dashboard Link */}
          {provider.dashboardUrl && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-900/50 border border-gray-700">
              <span className="text-sm text-gray-400">Link langsung:</span>
              <code className="text-sm text-indigo-400 flex-1 truncate">{provider.dashboardUrl}</code>
              <button
                onClick={() => handleCopyUrl(provider.dashboardUrl)}
                className="p-1.5 rounded-md hover:bg-gray-700 transition-colors text-gray-400 hover:text-white"
                title="Copy URL"
              >
                {copiedUrl ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          )}

          {/* Notes */}
          <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
            <p className="text-sm text-gray-400">
              <span className="text-indigo-400 font-medium">Catatan: </span>
              {provider.notes}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </Modal>
  )
}
