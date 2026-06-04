'use client'

import { useState } from 'react'
import { Bold, Italic, List, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { NotesJson, RichTextBlock } from '@/types/database'

interface NotesEditorProps {
  phaseId: string
  initialNotes: NotesJson | null
  readOnly?: boolean
}

type ActiveFormats = { bold: boolean; italic: boolean }

export function NotesEditor({ phaseId, initialNotes, readOnly = false }: NotesEditorProps) {
  const [blocks, setBlocks] = useState<RichTextBlock[]>(
    initialNotes?.blocks ?? [{ type: 'paragraph', text: '' }]
  )
  const [activeIndex, setActiveIndex] = useState(0)
  const [formats, setFormats] = useState<ActiveFormats>({ bold: false, italic: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function updateBlock(index: number, updates: Partial<RichTextBlock>) {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, ...updates } : b))
    setSaved(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const newBlock: RichTextBlock = { type: 'paragraph', text: '' }
      setBlocks(prev => [
        ...prev.slice(0, index + 1),
        newBlock,
        ...prev.slice(index + 1),
      ])
      setActiveIndex(index + 1)
    }
    if (e.key === 'Backspace' && blocks[index]?.text === '' && blocks.length > 1) {
      e.preventDefault()
      setBlocks(prev => prev.filter((_, i) => i !== index))
      setActiveIndex(Math.max(0, index - 1))
    }
  }

  function toggleFormat(format: keyof ActiveFormats) {
    setFormats(prev => ({ ...prev, [format]: !prev[format] }))
    if (activeIndex < blocks.length) {
      updateBlock(activeIndex, {
        [format]: !blocks[activeIndex]?.[format],
      })
    }
  }

  function toggleType() {
    if (activeIndex >= blocks.length) return
    const current = blocks[activeIndex]
    updateBlock(activeIndex, {
      type: current?.type === 'bullet' ? 'paragraph' : 'bullet',
    })
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    const notes: NotesJson = {
      format: 'richtext_v1',
      blocks: blocks.filter(b => b.text.trim() !== '' || b.type === 'paragraph'),
    }
    try {
      const res = await fetch(`/api/phases/${phaseId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes_json: notes }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error?.message ?? 'Failed to save notes')
      }
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving')
    } finally {
      setSaving(false)
    }
  }

  if (readOnly) {
    const notesBlocks = initialNotes?.blocks ?? []
    if (notesBlocks.length === 0 || notesBlocks.every(b => !b.text.trim())) {
      return <p className="text-sm text-muted-foreground italic">No notes</p>
    }
    return (
      <div className="space-y-1">
        {notesBlocks.map((block, i) => (
          <p
            key={i}
            className={cn(
              'text-sm',
              block.type === 'bullet' && 'pl-4 before:content-["•"] before:mr-2 before:text-muted-foreground',
              block.bold && 'font-bold',
              block.italic && 'italic'
            )}
          >
            {block.text}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', formats.bold && 'bg-accent')}
          onClick={() => toggleFormat('bold')}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-7 w-7', formats.italic && 'bg-accent')}
          onClick={() => toggleFormat('italic')}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7',
            blocks[activeIndex]?.type === 'bullet' && 'bg-accent'
          )}
          onClick={toggleType}
        >
          <List className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Blocks */}
      <div className="min-h-[100px] p-2 space-y-0.5">
        {blocks.map((block, index) => (
          <div key={index} className="flex items-start gap-1.5">
            {block.type === 'bullet' && (
              <span className="text-muted-foreground mt-1.5 text-sm select-none">•</span>
            )}
            <textarea
              value={block.text}
              onChange={e => updateBlock(index, { text: e.target.value })}
              onKeyDown={e => handleKeyDown(e, index)}
              onFocus={() => {
                setActiveIndex(index)
                setFormats({ bold: !!block.bold, italic: !!block.italic })
              }}
              rows={1}
              className={cn(
                'w-full resize-none text-sm bg-transparent outline-none leading-6',
                block.bold && 'font-bold',
                block.italic && 'italic',
                block.type === 'bullet' && 'pl-0'
              )}
              style={{ minHeight: '1.5rem', height: 'auto' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${el.scrollHeight}px`
              }}
              placeholder={index === 0 ? 'Add notes about this phase...' : ''}
            />
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/20">
        {error ? (
          <span className="text-xs text-destructive">{error}</span>
        ) : saved ? (
          <span className="text-xs text-green-600">Saved</span>
        ) : (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
        <Button size="sm" variant="outline" onClick={handleSave} disabled={saving} className="h-7 text-xs gap-1">
          <Save className="h-3 w-3" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
