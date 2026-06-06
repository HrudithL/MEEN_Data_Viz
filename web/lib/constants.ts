export const PHASE_IDS = [
  'powder_distribution',
  'specimen_geometry',
  'build_plate',
  'microstructure',
  'grain_size',
  'defect_analysis',
  'tensile_testing',
  'fatigue_testing',
  'fracture_mechanics',
] as const

export type PhaseId = typeof PHASE_IDS[number]

export const PHASE_DISPLAY = {
  powder_distribution: 'Powder Distribution',
  specimen_geometry: 'Specimen Geometry',
  build_plate: 'Build Plate',
  microstructure: 'Microstructure',
  grain_size: 'Grain Size',
  defect_analysis: 'Defect Analysis',
  tensile_testing: 'Tensile Testing',
  fatigue_testing: 'Fatigue Testing',
  fracture_mechanics: 'Fracture Mechanics',
} as const

export const PHASE_ACCEPTED_TYPES: Record<PhaseId, string[]> = {
  powder_distribution: ['csv'],
  specimen_geometry: ['stl'],
  build_plate: ['stl', 'png'],
  microstructure: ['mtex'],
  grain_size: ['csv'],
  defect_analysis: ['csv', 'ply', 'stl', 'tiff_zip'],
  tensile_testing: ['csv'],
  fatigue_testing: ['csv'],
  fracture_mechanics: ['csv'],
}

export const PHASE_SUPPLEMENT_ALLOWED: PhaseId[] = [
  'grain_size', 'defect_analysis', 'tensile_testing', 'fatigue_testing', 'fracture_mechanics',
]

export const FILE_TYPE_DISPLAY: Record<string, string> = {
  csv: 'CSV',
  stl: 'STL',
  png: 'PNG',
  ply: 'PLY',
  tiff_zip: 'TIFF Stack',
  ebsd_ang: 'EBSD (.ang)',
  ebsd_ctf: 'EBSD (.ctf)',
  mtex: 'MTEX',
}

export const FILE_EXTENSIONS: Record<string, string[]> = {
  csv: ['.csv'],
  stl: ['.stl'],
  png: ['.png'],
  ply: ['.ply'],
  tiff_zip: ['.zip'],
  ebsd_ang: ['.ang'],
  ebsd_ctf: ['.ctf'],
  mtex: ['.mtex'],
}

export const REJECTED_EXTENSIONS = ['.xlsx', '.xls']

/** Extensions allowed for build-level reference uploads (Data wizard top section). */
export const REFERENCE_ACCEPTED_EXTENSIONS = [
  '.csv',
  '.stl',
  '.png',
  '.jpg',
  '.jpeg',
  '.ply',
  '.zip',
  '.ang',
  '.ctf',
  '.txt',
  '.md',
  '.pptx',
  '.pdf',
  '.json',
  '.tif',
  '.tiff',
  '.docx',
  '.xlsx',
  '.xls',
] as const

export const REFERENCE_EXTENSION_DISPLAY: Record<string, string> = {
  '.csv': 'CSV',
  '.stl': 'STL',
  '.png': 'PNG',
  '.jpg': 'JPEG',
  '.jpeg': 'JPEG',
  '.ply': 'PLY',
  '.zip': 'ZIP / TIFF stack',
  '.ang': 'EBSD (.ang)',
  '.ctf': 'EBSD (.ctf)',
  '.mtex': 'MTEX',
  '.txt': 'Text',
  '.md': 'Markdown',
  '.pptx': 'PowerPoint',
  '.pdf': 'PDF',
  '.json': 'JSON',
  '.tif': 'TIFF',
  '.tiff': 'TIFF',
  '.docx': 'Word',
  '.xlsx': 'Excel',
  '.xls': 'Excel',
}

export const MAX_UPLOAD_BYTES = parseInt(process.env.MAX_UPLOAD_BYTES ?? '209715200')

export const PLOT_ALIASES = {
  stress: ['stress_mpa', 'stress', 'uts_mpa'],
  strain: ['axial_strain_mm_mm', 'strain', 'elongation'],
  stress_amplitude: ['stress_amplitude', 'sa_mpa'],
  nf: ['nf', 'cycles_to_failure'],
  two_nf: ['two_nf_reversals', '2nf'],
  nf_sqa_d: ['nf_sqa_d'],
  nf_sqa_f: ['nf_sqa_f'],
} as const

export const VIEWER_HINT_MAP: Record<string, string> = {
  tensile_testing: 'stress_strain',
  fatigue_testing: 'sn_curve',
  fracture_mechanics: 'fracture_scatter',
}

export const DEMO_ADMIN_EMAIL = process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL ?? ''
export const DEMO_ADMIN_PASSWORD = process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD ?? ''

export const isDemoLoginEnabled =
  DEMO_ADMIN_EMAIL.length > 0 && DEMO_ADMIN_PASSWORD.length > 0

/**
 * Demo files live under `Data Set/Upload Info Test/{folder}/`.
 * The Data wizard "Use demo file" button fetches them via `/api/demo/[phaseKey]`.
 */
export const PHASE_DEMO_FILES: Partial<
  Record<PhaseId, { folder: string; fileName: string; label: string }>
> = {
  microstructure: {
    folder: '04_microstructure',
    fileName: 'demo-grain-map.mtex',
    label: 'Demo grain map',
  },
  specimen_geometry: {
    folder: '02_specimen_geometry',
    fileName: 'demo-specimen.stl',
    label: 'Demo specimen',
  },
  defect_analysis: {
    folder: '06_defect_analysis',
    fileName: 'demo-defects.ply',
    label: 'Demo point cloud',
  },
}
