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
  microstructure: ['ebsd_ang', 'ebsd_ctf'],
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
}

export const FILE_EXTENSIONS: Record<string, string[]> = {
  csv: ['.csv'],
  stl: ['.stl'],
  png: ['.png'],
  ply: ['.ply'],
  tiff_zip: ['.zip'],
  ebsd_ang: ['.ang'],
  ebsd_ctf: ['.ctf'],
}

export const REJECTED_EXTENSIONS = ['.xlsx', '.xls']

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
