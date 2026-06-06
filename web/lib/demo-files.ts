import path from 'path'
import { PHASE_DEMO_FILES, type PhaseId } from '@/lib/constants'

/** Local test dataset root (gitignored, not deployed). */
export function getUploadInfoTestRoot(): string {
  return path.join(process.cwd(), '..', 'Data Set', 'Upload Info Test')
}

export function getDemoFileAbsolutePath(phaseKey: PhaseId): string | null {
  const entry = PHASE_DEMO_FILES[phaseKey]
  if (!entry) return null
  return path.join(getUploadInfoTestRoot(), entry.folder, entry.fileName)
}

export function getDemoFileApiPath(phaseKey: PhaseId): string | null {
  if (!PHASE_DEMO_FILES[phaseKey]) return null
  return `/api/demo/${phaseKey}`
}
