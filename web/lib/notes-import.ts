import type { RichTextBlock } from '@/types/database'

const BULLET_RE = /^[\s]*(?:[-*]|\d+\.)\s+(.+)$/
const HEADING_RE = /^(#{1,6})\s+(.+)$/

/** Convert plain text or markdown lines into richtext_v1 blocks. */
export function parseNotesFromText(text: string): RichTextBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks: RichTextBlock[] = []

  for (const line of lines) {
    const trimmed = line.trimEnd()
    if (!trimmed.trim()) continue

    const heading = trimmed.match(HEADING_RE)
    if (heading) {
      blocks.push({ type: 'paragraph', text: heading[2], bold: true })
      continue
    }

    const bullet = trimmed.match(BULLET_RE)
    if (bullet) {
      blocks.push({ type: 'bullet', text: bullet[1].trim() })
      continue
    }

    blocks.push({ type: 'paragraph', text: trimmed })
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', text: '' }]
}

export function isNotesImportFile(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))
  return ext === '.md' || ext === '.txt'
}

function blockHasContent(b: RichTextBlock): boolean {
  if (b.type === 'image' || b.type === 'file') return true
  if (b.type === 'paragraph' || b.type === 'bullet') return b.text.trim() !== ''
  return false
}

export function mergeNoteBlocks(
  existing: RichTextBlock[],
  imported: RichTextBlock[],
  mode: 'append' | 'replace'
): RichTextBlock[] {
  const cleaned = existing.filter(blockHasContent)
  const toImport = imported.filter(blockHasContent)

  if (mode === 'replace') {
    return toImport.length > 0 ? toImport : [{ type: 'paragraph', text: '' }]
  }

  if (cleaned.length === 0) {
    return toImport.length > 0 ? toImport : [{ type: 'paragraph', text: '' }]
  }

  if (toImport.length === 0) return cleaned

  return [...cleaned, { type: 'paragraph', text: '' }, ...toImport]
}
