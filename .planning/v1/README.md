# v1 Planning Index (LLM handoff)

Read in this order:

1. [../SPEC.md](../SPEC.md) — product scope, phases, acceptance
2. [ARCHITECTURE.md](./ARCHITECTURE.md) — Postgres/JSONB, Three.js, uploads, two viz modes summary
3. [VISUALIZATION.md](./VISUALIZATION.md) — **By Phase + Compare** (required for viz work)
4. [API.md](./API.md) — REST routes
5. [SCREENS.md](./SCREENS.md) — routes and UI tree
6. [DATA_SHAPES.md](./DATA_SHAPES.md) — CSV export guide from XLSX reference
7. [PLAN.md](./PLAN.md) — implementation order
8. [phases/](./phases/) — per-milestone checklists (01 → 08, including **05b**)

SQL: [../../supabase/migrations/001_initial.sql](../../supabase/migrations/001_initial.sql)

**Visualization v1 delivers both:**

- **By Phase** — all phases, all artifacts, search/sort/tabs, low-level viewers
- **Compare** — 9-cell cross-phase dashboard with label/metadata filters
