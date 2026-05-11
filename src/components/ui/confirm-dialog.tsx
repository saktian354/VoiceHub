import { Modal } from './modal'
import { Button } from './button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  isDestructive?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  isDestructive = true,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} className="max-w-sm">
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 h-fit">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-sm text-gray-300">{message}</p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={isDestructive ? 'destructive' : 'default'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
