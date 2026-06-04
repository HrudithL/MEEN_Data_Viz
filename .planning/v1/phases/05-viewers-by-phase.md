# Phase 05 — By Phase Visualization

Depends on: Phase 03 (artifacts + manifest API stub).

## Deliverables

- `GET /api/builds/:id/visualizations?mode=by_phase` — full manifest per [VISUALIZATION.md §6](../VISUALIZATION.md)
- `lib/parsers/*` set `parsed_json.kind` on all implemented types
- `lib/viewers/ViewerRegistry.tsx` — routes by `file_type` + `kind`
- Page: `/builds/[id]/visualizations` default **By Phase**
- `ByPhaseView`: 9 × `PhasePanel`
- Per panel: search, sort (label/date/type), artifact tabs
- Low-level viewers: CSV table + charts, STL, PLY, PNG
- `PLOT_ALIASES` for tensile/fatigue/fracture auto-charts
- Phase notes + supplement thumbnails in panel header

## Checkpoint

- [ ] All uploaded artifacts in a phase appear in tabs (no cross-phase filter)
- [ ] STL and CSV in same phase (defect) each use correct viewer
- [ ] Search narrows artifact list within one phase only

## Reference

[VISUALIZATION.md §2](../VISUALIZATION.md)
