# Reference Data Shapes (from EPSCoR `data.md`)

Uploads accept **CSV only** for tabular phases. Use this document to know **how many CSV files** to export when source data was XLSX.

---

## Phase 7 — Tensile Testing

| Logical dataset | Source XLSX (reference) | Export as CSV | Expected columns (informative) |
|-----------------|-------------------------|---------------|--------------------------------|
| Summary properties | `Tensile data.xlsx` Sheet1 | `tensile_summary.csv` | condition, shield_gas, heat_treatment, ys_mpa, uts_mpa, elongation_pct (+ optional std cols) |
| Stress–strain Ar-HT1 | `Ar_HT1.xlsx` Sheet1 | `Ar_HT1.csv` | Axial Strain (mm/mm), Stress (MPa) |
| Stress–strain Ar-HT2 | `Ar_HT2.xlsx` Sheet1 | `Ar_HT2.csv` | same |
| Stress–strain N2-HT1 | `N2_HT1.xlsx` Sheet1 | `N2_HT1.csv` | same |
| Stress–strain N2-HT2 | `N2_HT2.xlsx` Sheet1 | `N2_HT2.csv` | same |

**v1:** Each CSV is a **separate artifact** with label e.g. `Ar-HT1-curves` or `Ar-HT1-summary`. Multiple CSVs per phase allowed.

---

## Phase 8 — Fatigue Testing

| Logical dataset | Source XLSX | Export as CSV | Sheets |
|-----------------|-------------|---------------|--------|
| S-N + defect/facet data | `Fatigue Data.xlsx` | One CSV **per sheet** | `Ar_HT1`, `Ar_HT2`, `N2_HT1`, `N2_HT2` |

**Columns per sheet (~16, many optional for runouts):**

- Required for plots: stress amplitude (MPa), nf and/or 2Nf reversals, failure
- Common: shield_gas, heat_treatment, process_parameters, frequency_hz
- Optional: 90th_grain_um, defect_size_um, 90th_defect_um, facet_size_um, sif_f, sif_d, nf_sqa_d, nf_sqa_f

Upload **4 CSVs** (or fewer if conditions absent) — not one merged file.

---

## Phase 9 — Fracture Mechanics

| Logical dataset | Source XLSX | Export as CSV | Sheets |
|-----------------|-------------|---------------|--------|
| Shiozawa data | `Data_Shiozawa.xlsx` | One CSV per sheet | `Ar_HT1`, `Ar_HT2`, `N2_HT1`, `N2_HT2` |

**Key columns for Shiozawa-style plots:** stress_amplitude, two_nf_reversals, nf_sqa_d, nf_sqa_f, defect_size_um, facet_size_um, sif_d, sif_f, failure.

Same column flexibility as fatigue; dictionary maps aliases after upload.

---

## Other phases (CSV reference hints)

| Phase | Typical CSV content |
|-------|---------------------|
| 1 Powder | element, astm bounds, measured wt% per powder type |
| 5 Grain size | condition, weibull params, mean_grain_size_um, d90_um |
| 6 Defect stats | condition, defect_type, mean_diameter_um, d90, area_fraction |

See `Data Set/NASA EPSCoR Inonel 718/*/data.json` for example rows (local only).
