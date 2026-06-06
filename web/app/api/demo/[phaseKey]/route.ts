import { readFile } from 'fs/promises'
import { NextRequest } from 'next/server'
import { PHASE_DEMO_FILES, type PhaseId } from '@/lib/constants'
import { getDemoFileAbsolutePath } from '@/lib/demo-files'
import { apiError } from '@/lib/utils'

const MIME_BY_EXT: Record<string, string> = {
  '.mtex': 'text/plain',
  '.stl': 'model/stl',
  '.ply': 'application/octet-stream',
}

function isPhaseId(value: string): value is PhaseId {
  return value in PHASE_DEMO_FILES
}

// GET /api/demo/[phaseKey] — serve demo file from Data Set/Upload Info Test
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ phaseKey: string }> }
) {
  const { phaseKey } = await params
  if (!isPhaseId(phaseKey)) {
    return apiError('NOT_FOUND', 'No demo file for this phase', 404)
  }

  const entry = PHASE_DEMO_FILES[phaseKey]
  const filePath = getDemoFileAbsolutePath(phaseKey)
  if (!entry || !filePath) {
    return apiError('NOT_FOUND', 'No demo file for this phase', 404)
  }

  try {
    const bytes = await readFile(filePath)
    const ext = entry.fileName.slice(entry.fileName.lastIndexOf('.')).toLowerCase()
    const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream'

    return new Response(bytes, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `inline; filename="${entry.fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return apiError(
      'NOT_FOUND',
      `Demo file missing at Data Set/Upload Info Test/${entry.folder}/${entry.fileName}`,
      404
    )
  }
}
