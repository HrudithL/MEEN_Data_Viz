'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { PartNote } from '@/types/api'

interface PartNotesListProps {
  phaseId: string
  artifactLabels: string[]
  canEdit: boolean
}

export function PartNotesList({ phaseId, artifactLabels, canEdit }: PartNotesListProps) {
  const [notes, setNotes] = useState<PartNote[]>([])
  const [loading, setLoading] = useState(true)
  const [newLabel, setNewLabel] = useState('')
  const [newText, setNewText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadNotes() {
    setLoading(true)
    try {
      const res = await fetch(`/api/phases/${phaseId}/part-notes`, { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        setNotes(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotes()
  }, [phaseId])

  async function patchNotes(body: Record<string, unknown>) {
    setSaving(true)
    try {
      const res = await fetch(`/api/phases/${phaseId}/part-notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const json = await res.json()
        setNotes(json.data ?? [])
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleAdd() {
    if (!newLabel.trim() || !newText.trim()) return
    await patchNotes({ action: 'add', label: newLabel.trim(), text: newText.trim() })
    setNewLabel('')
    setNewText('')
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-2">No part notes yet</p>
      ) : (
        <ul className="divide-y border rounded-md">
          {notes.map(note => (
            <li key={note.id} className="px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{note.label}</span>
                {canEdit && (
                  <div className="flex gap-1">
                    {editingId === note.id ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={async () => {
                            await patchNotes({ action: 'update', id: note.id, text: editText })
                            setEditingId(null)
                          }}
                          disabled={saving}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            setEditingId(note.id)
                            setEditText(note.text)
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => patchNotes({ action: 'delete', id: note.id })}
                          disabled={saving}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
              {editingId === note.id ? (
                <Textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="text-sm min-h-[60px]"
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.text}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="border rounded-md p-3 space-y-2 bg-muted/10">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Add Part Note
          </p>
          <div className="flex gap-2">
            <Input
              list={`part-labels-${phaseId}`}
              placeholder="Part / specimen label"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              className="h-8 text-sm"
            />
            <datalist id={`part-labels-${phaseId}`}>
              {artifactLabels.map(l => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </div>
          <Textarea
            placeholder="Note text..."
            value={newText}
            onChange={e => setNewText(e.target.value)}
            className="text-sm min-h-[60px]"
          />
          <Button size="sm" onClick={handleAdd} disabled={saving || !newLabel.trim() || !newText.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Note
          </Button>
        </div>
      )}
    </div>
  )
}
