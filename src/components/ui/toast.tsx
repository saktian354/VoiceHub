import { useEffect, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle2, XCircle, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
}

let toastId = 0
let addToastFn: ((toast: Omit<Toast, 'id'>) => void) | null = null

export function showToast(type: 'success' | 'error' | 'info', message: string) {
  addToastFn?.({ type, message })
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right-full',
        toast.type === 'success'
          ? 'bg-green-500/10 border-green-500/20 text-green-400'
          : toast.type === 'info'
          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
          : 'bg-red-500/10 border-red-500/20 text-red-400'
      )}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : toast.type === 'info' ? (
        <Zap className="w-4 h-4 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 flex-shrink-0" />
      )}
      <span className="text-sm flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-500 hover:text-gray-300 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastContainer({ children }: { children?: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { ...toast, id }])
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  useEffect(() => {
    addToastFn = addToast
    return () => {
      addToastFn = null
    }
  }, [addToast])

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </>
  )
}
