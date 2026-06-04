# Phase 05b — Compare (Cross-Phase) Dashboard

Depends on: Phase 05 (ViewerRegistry + manifest API).

## Deliverables

- Mode toggle: **By Phase** | **Compare** on visualizations page
- `CompareView`: 9-cell grid (responsive 3×3)
- `CompareFilters`: label dropdown (`distinctLabels` from API), optional metadata dropdowns
- `GET /api/builds/:id/visualizations?mode=compare&label=Ar-HT1` — server-side filter artifacts per phase
- `CompactArtifactViewer` — same renderers, smaller layout; table capped at 20 rows + link to By Phase
- Empty cell state when filter matches zero artifacts

## Rules

- No geometry/image overlay between cells
- Filters apply **only** in Compare mode (not By Phase)

## Checkpoint

- [ ] Label `Ar-HT1` shows only matching artifacts in each of 9 cells
- [ ] “All” labels shows every artifact per phase (stress test with EPSCoR-style multi-file build)
- [ ] Toggle back to By Phase preserves per-phase tab selection where possible

## Reference

[VISUALIZATION.md §3–4](../VISUALIZATION.md)
