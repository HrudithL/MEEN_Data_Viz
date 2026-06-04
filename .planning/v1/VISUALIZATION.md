# v1 Visualization Contract

Authoritative UI/behavior for `/builds/[buildId]/visualizations`. Implements SPEC §6.

---

## 1. Two modes (both required in v1)

| Mode | ID | Default | Purpose |
|------|-----|---------|---------|
| **By Phase** | `by_phase` | **Yes** | See **all data in all phases**; low-level viz per artifact; phase-local tools |
| **Compare** | `compare` | No | **Cross-phase comparison dashboard**; same label (condition) across phases side by side |

Toggle: segmented control at top of Visualizations page — **By Phase** | **Compare**.

**Rule:** No 3D/2D **overlay** in either mode. Each artifact renders in its own viewer tile/panel.

---

## 2. Mode A — By Phase (phase-first)

### Layout

- Vertical stack of **9 phase panels** (order = intake order 1→9).
- Each panel is **expanded by default** if it has artifacts; empty phases show “No data yet” + link to Data tab.
- Panel header: phase name, completion badge, phase notes preview, supplement thumbnails.

### Per-phase artifact list (required controls)

| Control | Behavior |
|---------|----------|
| **Search** | Filters list by `label`, `file_name`, `file_type` (client-side) |
| **Sort** | `label` (A–Z), `uploaded_at` (newest), `file_type` |
| **Tabs** | One tab per artifact in list; active tab drives main viewer below |
| **List view** (optional alt) | Click row = same as tab select |

All artifacts in the phase remain in the list unless search/sort narrows display. **No cross-phase hiding** in this mode.

### Per-artifact viewer (low-level viz)

Each artifact uses **ViewerRegistry** by `file_type` + `parsed_json.kind`:

| `parsed_json.kind` | `file_type` | Low-level viz |
|--------------------|-------------|----------------|
| `table` | `csv` | Sortable table (paginated if >500 rows) + mini chart strip |
| `mesh` | `stl` | Three.js mesh, orbit/pan/zoom, wireframe toggle |
| `point_cloud` | `ply` | Three.js points, decimate if >500k |
| `image` | `png` | Zoom/pan image |
| `ebsd_grid` | `ebsd_ang`, `ebsd_ctf` | 2D IPF-style map + phase legend |
| `slice_stack` | `tiff_zip` | Slice slider + 2D canvas |

**Charts (CSV only, straightforward):**

- Auto-plot if `PLOT_ALIASES` matches columns; else “Choose X / Y column” dropdowns.
- Tensile phase: stress–strain line if strain+stress columns exist.
- Fatigue: log–log S–N if stress amplitude + Nf/2Nf exist.
- Fracture: scatter for Shiozawa fields if present.
- Generic: line or bar from user-selected numeric columns.

Charts render **below** the table in the same artifact panel (not full-dashboard analytics).

### Phase supplements

- Phase-level PNG supplements: thumbnail strip in panel header; click → lightbox.
- Phase notes (`richtext_v1`): collapsible “Phase notes” under header.

---

## 3. Mode B — Compare (cross-phase dashboard)

### Layout

- **Grid:** 9 columns (or 3×3 responsive) — one **cell per phase**.
- Each cell title = phase display name.
- Cell body = **all artifacts in that phase matching the active comparison filter** (see §4).
- Each artifact in cell uses **compact viewer** (same renderer as By Phase, `density: "compact"` — smaller height, no full table pagination; table shows first 20 rows + “view in By Phase” link).

### When to use

User selects condition **Ar-HT1** → each phase cell shows only artifacts with `label === "Ar-HT1"` (and optional metadata match). User scans across phases for one experimental condition without overlaying geometry.

### Empty cells

If filter matches zero artifacts in a phase: cell shows “No data for {label}” (not hidden column).

---

## 4. Comparison filters (Compare mode only)

| Filter | Scope | Default |
|--------|-------|---------|
| **Label** | `artifact.label` exact match | First distinct label or “All” |
| **Shield gas** (optional) | `metadata.shield_gas` | Any |
| **Heat treatment** (optional) | `metadata.heat_treatment` | Any |
| **Process parameters** (optional) | `metadata.process_parameters` | Any |

- **All labels:** every artifact in every phase cell (busy; allowed).
- Filters combine with **AND** logic.
- Filters do **not** apply in By Phase mode (only per-phase search there).

`artifact.label` is **required at upload** (string, min 1 char).

---

## 5. `parsed_json` shape (parser contract)

Every parser sets top-level `kind`:

```typescript
type ParsedJson =
  | { kind: "table"; tables: { name?: string; rows: Record<string, unknown>[] }[] }
  | { kind: "mesh"; format: "stl"; boundingBox: { min: number[]; max: number[] }; triangleCount: number }
  | { kind: "point_cloud"; format: "ply"; pointCount: number; boundingBox: {...} }
  | { kind: "image"; format: "png"; width: number; height: number }
  | { kind: "ebsd_grid"; format: "ang" | "ctf"; width: number; height: number; phases: string[]; /* grid in sidecar or sparse */ }
  | { kind: "slice_stack"; sliceCount: number; slices: { index: number; storagePath: string }[] };
```

**Parity rule:** Uploading STL vs CSV in the same phase both get full workflow (version, changelog, notes). Viewers differ by `kind`; neither is rejected for being “non-typical” if `file_type` is allowed for that phase.

---

## 6. API support

`GET /api/builds/:buildId/visualizations`

Query:

- `mode`: `by_phase` | `compare` (default `by_phase`)
- `label`, `shield_gas`, `heat_treatment`, `process_parameters` (compare filters; ignored in by_phase)

Response:

```json
{
  "buildId": "uuid",
  "mode": "by_phase",
  "phases": [
    {
      "phaseId": "tensile_testing",
      "sequence": 7,
      "isComplete": true,
      "notesJson": {},
      "supplements": [],
      "artifacts": [
        {
          "id": "uuid",
          "label": "Ar-HT1",
          "fileType": "csv",
          "fileName": "Ar_HT1.csv",
          "parsedKind": "table",
          "parseStatus": "ok",
          "viewerHint": "stress_strain",
          "metadata": {}
        }
      ]
    }
  ],
  "distinctLabels": ["Ar-HT1", "N2-HT2"],
  "metadataOptions": { "shieldGas": ["Ar", "N2"], "heatTreatment": ["HT1", "HT2"] }
}
```

Client may cache manifest; refetch on artifact upload/delete.

---

## 7. Component map (implementation)

```
VisualizationsPage
├── ModeToggle (by_phase | compare)
├── CompareFilters (visible if compare) — label, metadata dropdowns
├── ByPhaseView
│   └── PhasePanel × 9
│       ├── PhaseHeader (notes, supplements)
│       ├── ArtifactToolbar (search, sort, tabs)
│       └── ArtifactViewer (ViewerRegistry)
└── CompareView
    └── CompareGrid (3×3 / 9 cols)
        └── PhaseCell × 9
            └── CompactArtifactViewer × n
```

---

## 8. Acceptance (visualization-specific)

- [ ] Default landing = By Phase; all 9 phases visible with artifacts
- [ ] Per-phase search, sort, tabs work
- [ ] Each `file_type` renders correct low-level viz
- [ ] Compare mode shows 9-phase grid with label filter
- [ ] Compare filter does not overlay meshes
- [ ] Link “Open in By Phase” from compact cell optional but recommended
