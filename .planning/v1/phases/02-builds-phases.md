# Phase 02 — Builds & Phases

## Deliverables

- POST/GET builds under org
- Trigger creates 9 `phases` rows
- Function `recompute_build_status(build_id)`:
  - all phases `is_complete` → build `complete`
  - else `in_progress`
- Phase complete when ≥1 artifact with valid `file_type` for that phase
- Pages: `/builds`, `/builds/[id]` overview with 9-step progress

## Checkpoint

- [ ] New build shows 9 phases in order
- [ ] Empty build stays `in_progress`
