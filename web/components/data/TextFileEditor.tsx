'use client'

import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TextFileEditorProps {
  content: string
  onChange: (value: string) => void
  fileName: string
  readOnly?: boolean
}

function MarkdownPreview({ content }: { content: string }) {
  const lines = content.split(/\r?\n/)
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-2 p-3 bg-muted/20 rounded-md border max-h-[360px] overflow-auto">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) return <h1 key={i} className="text-lg font-bold mt-2">{line.slice(2)}</h1>
        if (line.startsWith('## ')) return <h2 key={i} className="text-base font-semibold mt-2">{line.slice(3)}</h2>
        if (line.startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>
        if (!line.trim()) return <br key={i} />
        return <p key={i} className="text-sm leading-relaxed">{line}</p>
      })}
    </div>
  )
}

export function TextFileEditor({ content, onChange, fileName, readOnly = false }: TextFileEditorProps) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const [view, setView] = useState<'formatted' | 'raw'>(ext === 'md' ? 'formatted' : 'raw')

  if (ext === 'csv') {
    return (
      <Textarea
        value={content}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        className={cn('font-mono text-xs min-h-[300px]', readOnly && 'opacity-80')}
      />
    )
  }

  const showToggle = ext === 'md' || ext === 'txt'

  return (
    <div className="space-y-2">
      {showToggle && (
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={view === 'formatted' ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setView('formatted')}
          >
            {ext === 'md' ? 'Preview' : 'Formatted'}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={view === 'raw' ? 'default' : 'outline'}
            className="h-7 text-xs"
            onClick={() => setView('raw')}
          >
            Raw
          </Button>
        </div>
      )}

      {view === 'formatted' && ext === 'md' ? (
        <MarkdownPreview content={content} />
      ) : view === 'formatted' && ext === 'txt' ? (
        <pre className="text-sm bg-muted/20 border rounded-md p-3 max-h-[360px] overflow-auto whitespace-pre-wrap font-sans leading-relaxed">
          {content}
        </pre>
      ) : (
        <Textarea
          value={content}
          onChange={e => onChange(e.target.value)}
          readOnly={readOnly}
          className={cn('font-mono text-xs min-h-[300px]', readOnly && 'opacity-80')}
        />
      )}

      {view === 'formatted' && !readOnly && (
        <p className="text-xs text-muted-foreground">
          Switch to Raw to edit file content directly.
        </p>
      )}
    </div>
  )
}
