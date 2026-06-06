'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { notifyBuildDataChanged } from '@/lib/build-data-events'

interface DeleteBuildDialogProps {
  buildId: string
  buildName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteBuildDialog({
  buildId,
  buildName,
  open,
  onOpenChange,
  onDeleted,
}: DeleteBuildDialogProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch(`/api/builds/${buildId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to delete build')

      notifyBuildDataChanged(buildId)
      onOpenChange(false)
      onDeleted?.()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete build')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete build?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                This will permanently delete <span className="font-medium text-foreground">{buildName}</span> and
                all associated data, including phases, artifacts, notes, and uploaded files.
              </p>
              <p className="font-medium text-destructive">This action cannot be reversed.</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {deleting ? 'Deleting...' : 'Delete build'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
