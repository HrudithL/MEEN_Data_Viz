# Phase 06 — EBSD & TIFF Zip

## Deliverables

- Parser `lib/parsers/ebsd-ang.ts` → `parsed_json.kind = "ebsd_grid"`
- Parser `lib/parsers/ebsd-ctf.ts` → `parsed_json.kind = "ebsd_grid"`
- TIFF zip → `parsed_json.kind = "slice_stack"`
- 2D IPF-style map component (canvas)
- TIFF zip: unzip, validate image extensions, store slice list in `parsed_json.slices[]`
- Slice slider UI

## Limits

- Max 500 slices per zip
- Reject non-image files inside zip

## Checkpoint

- [ ] Sample .ang fixture renders map
- [ ] Zip of 10 PNGs/tiffs slides correctly
