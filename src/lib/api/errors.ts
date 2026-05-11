import type { AxiosError } from 'axios'

export function handleApiError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status

    if (error.code === 'ECONNABORTED') {
      return 'Koneksi timeout. Periksa jaringan Anda dan coba lagi.'
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      return 'Gagal terhubung ke server. Periksa koneksi internet Anda.'
    }

    switch (status) {
      case 401:
        return 'API key tidak valid. Periksa kembali API key Anda.'
      case 402:
        return 'Kuota habis. Silakan upgrade paket atau tambah kredit.'
      case 403:
        return 'Akses ditolak. API key tidak memiliki izin untuk operasi ini.'
      case 404:
        return 'Endpoint tidak ditemukan. Periksa konfigurasi provider.'
      case 429:
        return 'Terlalu banyak permintaan. Tunggu beberapa saat dan coba lagi.'
      case 500:
      case 502:
      case 503:
        return 'Server provider sedang bermasalah. Coba lagi nanti.'
      default:
        return `Terjadi kesalahan (HTTP ${status}). Coba lagi nanti.`
    }
  }

  if (error instanceof Error) {
    return `Terjadi kesalahan: ${error.message}`
  }

  return 'Terjadi kesalahan yang tidak diketahui.'
}

function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  )
}
