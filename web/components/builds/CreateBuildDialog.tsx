'use client'

import { useState } from 'react'
import { useAppRouter } from '@/components/motion'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface CreateBuildDialogProps {
  orgId: string
  trigger?: React.ReactNode
}

export function CreateBuildDialog({ orgId, trigger }: CreateBuildDialogProps) {
  const router = useAppRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    description: '',
    material: '',
    process: '',
  })

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch(`/api/organizations/${orgId}/builds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          material: form.material.trim() || undefined,
          process: form.process.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to create build')
      setOpen(false)
      setForm({ name: '', description: '', material: '', process: '' })
      router.push(`/builds/${json.data.id}`, 'Loading build…')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating build')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Build
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Build</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="build-name">
                Build name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="build-name"
                placeholder="e.g. Ti-6Al-4V LPBF Batch 3"
                value={form.name}
                onChange={update('name')}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="build-desc">Description</Label>
              <Textarea
                id="build-desc"
                placeholder="Brief description of this build..."
                value={form.description}
                onChange={update('description')}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="build-material">Material</Label>
                <Input
                  id="build-material"
                  placeholder="e.g. Ti-6Al-4V"
                  value={form.material}
                  onChange={update('material')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="build-process">Process</Label>
                <Input
                  id="build-process"
                  placeholder="e.g. LPBF, DED"
                  value={form.process}
                  onChange={update('process')}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !form.name.trim()}>
                {loading ? 'Creating...' : 'Create Build'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
