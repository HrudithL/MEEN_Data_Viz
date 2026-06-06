import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { REFERENCE_ACCEPTED_EXTENSIONS } from '@/lib/constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export function apiError(code: string, message: string, status = 400) {
  return Response.json({ error: { code, message } }, { status })
}

export function detectFileType(fileName: string): string | null {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))
  const map: Record<string, string> = {
    '.csv': 'csv',
    '.stl': 'stl',
    '.png': 'png',
    '.ply': 'ply',
    '.zip': 'tiff_zip',
    '.ang': 'ebsd_ang',
    '.ctf': 'ebsd_ctf',
    '.mtex': 'mtex',
  }
  return map[ext] ?? null
}

export function isRejectedExtension(fileName: string): boolean {
  const ext = fileName.toLowerCase().slice(fileName.lastIndexOf('.'))
  return ['.xlsx', '.xls'].includes(ext)
}

export function fileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  if (idx === -1) return ''
  return fileName.slice(idx).toLowerCase()
}

export function isReferenceExtensionAllowed(fileName: string): boolean {
  const ext = fileExtension(fileName)
  return REFERENCE_ACCEPTED_EXTENSIONS.includes(ext as (typeof REFERENCE_ACCEPTED_EXTENSIONS)[number])
}
