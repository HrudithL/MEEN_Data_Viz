# v1 Implementation Plan (asynchronous / agent-executable)

Execute phases **in order**. Each phase ends with verifiable checkpoints. Safe to run unattended phase-by-phase.

**Source of truth:** [SPEC.md](../SPEC.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [VISUALIZATION.md](./VISUALIZATION.md) · [API.md](./API.md) · [SCREENS.md](./SCREENS.md)

---

## Phase index

| # | File | Goal |
|---|------|------|
| 01 | [phases/01-foundation.md](./phases/01-foundation.md) | Repo, Supabase, Auth, orgs, RLS smoke test |
| 02 | [phases/02-builds-phases.md](./phases/02-builds-phases.md) | Builds, 9 phases seed, completion logic |
| 03 | [phases/03-storage-csv.md](./phases/03-storage-csv.md) | Signed upload, CSV parse, dictionary, changelog |
| 04 | [phases/04-data-ui.md](./phases/04-data-ui.md) | Data wizard UI, notes, supplements |
| 05 | [phases/05-viewers-by-phase.md](./phases/05-viewers-by-phase.md) | By Phase mode, ViewerRegistry, per-phase search/sort/tabs |
| 05b | [phases/05b-compare-dashboard.md](./phases/05b-compare-dashboard.md) | Compare mode, cross-phase filters, compact viewers |
| 06 | [phases/06-ebsd-tiff.md](./phases/06-ebsd-tiff.md) | .ang/.ctf parser, TIFF zip, `parsed_json.kind` |
| 07 | [phases/07-invites-dashboard.md](./phases/07-invites-dashboard.md) | Email invites, dashboard, admin transfer |
| 08 | [phases/08-deploy-hardening.md](./phases/08-deploy-hardening.md) | Vercel deploy, limits, acceptance pass |

---

## Testing strategy (agent-defined)

- **No full E2E suite required in early phases.**
- Each phase: manual checklist + minimal **Vitest** unit tests for parsers (`ang`, `ctf`, csv, zip slice count).
- Phase 08: run through SPEC §13 acceptance criteria.
- Fixtures: `tests/fixtures/` — small synthetic CSV, cube STL, sample .ang snippet (commit fixtures; not `Data Set/`).

---

## Async execution notes

- Phase 05 → 05b → 06 in order (05b depends on ViewerRegistry from 05).
- Phase 06 can start parser work in parallel with 05 only for isolated unit tests.
- Do not implement Build Reports page in v1 (use build overview only).
- Stop and log blockers if Supabase Storage CORS or 200 MB uploads fail in target project; document in `08-deploy-hardening.md` outcome.

---

## Definition of done (v1)

All items in SPEC §13 checked; deployed URL + Supabase project documented in README (not a planning essay).
