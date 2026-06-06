'use client'

import { cn } from '@/lib/utils'
import type { NotesJson } from '@/types/database'

interface NotesPreviewProps {
  notesJson: NotesJson | null | undefined
  maxBlocks?: number
  className?: string
}

function isTextBlock(block: NotesJson['blocks'][number]): block is Extract<
  NotesJson['blocks'][number],
  { type: 'paragraph' | 'bullet' }
> {
  return block.type === 'paragraph' || block.type === 'bullet'
}

export function NotesPreview({ notesJson, maxBlocks = 3, className }: NotesPreviewProps) {
  if (!notesJson || notesJson.format !== 'richtext_v1' || !Array.isArray(notesJson.blocks)) {
    return null
  }

  const blocks = notesJson.blocks.filter(b => {
    if (b.type === 'image' || b.type === 'file') return true
    return isTextBlock(b) && b.text?.trim()
  })

  if (blocks.length === 0) return null

  return (
    <div className={cn('space-y-0.5', className)}>
      {blocks.slice(0, maxBlocks).map((block, i) => {
        if (block.type === 'image') {
          return (
            <p key={i} className="text-xs text-muted-foreground italic">
              [Image: {block.caption || block.fileName}]
            </p>
          )
        }
        if (block.type === 'file') {
          return (
            <p key={i} className="text-xs text-muted-foreground">
              [Note file: {block.label ?? block.fileName}]
            </p>
          )
        }
        return (
          <p
            key={i}
            className={cn(
              'text-xs',
              block.type === 'bullet' && 'pl-3 before:content-["•"] before:mr-1',
              block.bold && 'font-semibold',
              block.italic && 'italic'
            )}
          >
            {block.text}
          </p>
        )
      })}
      {blocks.length > maxBlocks && (
        <p className="text-xs text-muted-foreground">+{blocks.length - maxBlocks} more</p>
      )}
    </div>
  )
}
