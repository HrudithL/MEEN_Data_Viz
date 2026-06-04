import type { Artifact, Build, ChangelogEntry, OrgRole, Organization, OrganizationInvitation, OrganizationMember, Phase, PhaseSupplement, ParsedJson, Profile } from './database'

export interface ApiError { error: { code: string; message: string } }
export interface PaginatedResponse<T> { data: T[]; meta: { page: number; limit: number; total: number } }

export interface OrgWithRole extends Organization { role: OrgRole; memberCount?: number }

export interface BuildWithPhases extends Build {
  phases: Phase[]
  completedPhases: number
}

export interface PhaseWithArtifacts extends Phase {
  artifacts: ArtifactSummary[]
  supplements: PhaseSupplement[]
}

export interface ArtifactSummary {
  id: string
  label: string
  fileType: string
  fileName: string
  fileSize: number
  parsedKind: string | null
  parseStatus: string
  viewerHint: string | null
  metadata: Record<string, unknown>
  uploadedAt: string
}

export interface VizManifest {
  buildId: string
  mode: 'by_phase' | 'compare'
  phases: VizPhase[]
  distinctLabels: string[]
  metadataOptions: {
    shieldGas: string[]
    heatTreatment: string[]
    processParameters: string[]
  }
}

export interface VizPhase {
  phaseId: string
  phaseName: string
  sequence: number
  isComplete: boolean
  notesJson: unknown
  supplements: PhaseSupplement[]
  artifacts: ArtifactSummary[]
}

export interface DashboardStats {
  totalBuilds: number
  completeBuilds: number
  inProgressBuilds: number
  phasesCompleted: number[]
  recentArtifacts: (Artifact & { phaseName: string; buildName: string })[]
}

export interface InviteAcceptPayload { token: string }
export interface SignUploadPayload { orgId: string; buildId: string; phaseId: string; fileName: string; fileSize: number; mimeType: string }
export interface RegisterArtifactPayload {
  label: string
  fileType: string
  storagePath: string
  fileName: string
  fileSize: number
  sha256?: string
  metadata?: Record<string, unknown>
  ebsdFormat?: 'ang' | 'ctf'
}
