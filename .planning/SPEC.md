# MEEN Data Viz — Product Specification (v1)

**Status:** Authoritative product spec  
**Implementation:** [.planning/v1/README.md](./v1/README.md) · [PLAN.md](./v1/PLAN.md) · [phases/](./v1/phases/)  
**Architecture:** [.planning/v1/ARCHITECTURE.md](./v1/ARCHITECTURE.md) (PostgreSQL rationale, Three.js scope, upload limits)  
**Visualization:** [.planning/v1/VISUALIZATION.md](./v1/VISUALIZATION.md) (By Phase + Compare modes)  
**API:** [.planning/v1/API.md](./v1/API.md)  
**Routes:** [.planning/v1/SCREENS.md](./v1/SCREENS.md)  
**Tabular reference (XLSX → CSV export guide):** [.planning/v1/DATA_SHAPES.md](./v1/DATA_SHAPES.md)  
**SQL:** [supabase/migrations/001_initial.sql](../supabase/migrations/001_initial.sql)

---

## 1. Purpose

MEEN Data Viz is a **deployed web application** for AM experiment workflows: nine sequential data phases, mutable interpretations of messy files, and parallel visualizations. One **Build** per experimental campaign; users work inside **Organizations**.

**v1:** intake, CRUD, versioning, changelog, org roles, visualizations only.

**Out of scope:** ML, inference, simulation, crystal plasticity (EPSCoR Stage 8), 3D volume TIFF rendering, geometry overlay, soft delete, `.xlsx` uploads.

---

## 2. Storage model (why PostgreSQL + JSONB)

Relational tables hold **structure and security** (orgs, builds, phases, roles, version pointers). **Variable experiment content** lives in:

- **JSONB:** `parsed_json`, `column_dictionary`, `metadata`, `notes_json`
- **Supabase Storage:** immutable raw bytes per artifact version

See [ARCHITECTURE.md §1–2](./v1/ARCHITECTURE.md) for the full rationale. SQL columns do **not** change when a lab adds CSV columns.

---

## 3. Users, organizations, permissions

### 3.1 Authentication (non-negotiable)

**Supabase Auth only** via `@supabase/ssr` (signUp, signInWithPassword, signOut, cookie session).

**No** custom REST routes for signup/signin. All `/api/*` routes validate the Supabase session.

### 3.2 Organizations

- Any signed-up user may **create** an organization (becomes **Admin**).
- A user may belong to **multiple organizations** with **one role per org:** `admin` | `editor` | `viewer`.
- **Builds** belong to one organization; access is derived from org membership.

### 3.3 Roles (per organization)

| Role | Capabilities |
|------|----------------|
| **Admin** | All editor/viewer capabilities; invite by email; change roles; remove members; delete org/builds; **transfer admin** to an editor |
| **Editor** | Upload/edit/delete artifacts, notes, supplements, column dictionary, cell values; create builds |
| **Viewer** | Read-only |

**Admin rules:**

- Admin **cannot leave** the organization.
- Admin **may transfer** admin to an existing **editor** (promoted user → admin; former admin → editor).

**Invites (v1):**

1. Admin calls invitation API → email to invitee.
2. Link: `{APP_URL}/invite?token=...`
3. If no account → sign up → accept token → `organization_members` row.
4. If account exists → sign in → accept.

Only **Admin** sends invites. Editors cannot.

### 3.4 Permission matrix

| Action | Admin | Editor | Viewer |
|--------|:-----:|:------:|:------:|
| View data & visualizations | ✓ | ✓ | ✓ |
| Upload / edit / **hard delete** artifacts | ✓ | ✓ | ✗ |
| Notes & PNG supplements | ✓ | ✓ | ✗ |
| Edit dictionary & cells | ✓ | ✓ | ✗ |
| Changelog | ✓ | ✓ | ✓ |
| Invite users | ✓ | ✗ | ✗ |
| Transfer admin | ✓ | ✗ | ✗ |
| Remove members | ✓ | ✗ | ✗ |
| Delete build | ✓ | ✗ | ✗ |

---

## 4. Nine-phase pipeline

Fixed order; Data tab stepper 1→9. Each phase:

- **Required:** ≥1 artifact of an accepted primary type.
- **Optional:** notes (richtext_v1), PNG supplements.

### 4.1 Accepted types (v1)

| # | Phase ID | Primary types (≥1) |
|---|----------|-------------------|
| 1 | `powder_distribution` | CSV |
| 2 | `specimen_geometry` | STL |
| 3 | `build_plate` | STL and/or PNG |
| 4 | `microstructure` | **EBSD: user selects `.ang` OR `.ctf` at upload** |
| 5 | `grain_size` | CSV (PNG optional extra) |
| 6 | `defect_analysis` | CSV, PLY, STL, **TIFF stack as `.zip` of slice images** |
| 7 | `tensile_testing` | CSV (curves generated in-app; optional PNG) |
| 8 | `fatigue_testing` | CSV (plots generated in-app; optional PNG) |
| 9 | `fracture_mechanics` | CSV (plots generated in-app; optional PNG) |

**Rejected uploads:** `.xlsx`, `.xls` — users export sheets to CSV per [DATA_SHAPES.md](./v1/DATA_SHAPES.md).

**Not in v1:** `.osc`, `.h5`, standalone `.tif` (use zip), `.mtex` extension.

### 4.2 Build status

- **`in_progress`:** at least one phase missing a primary artifact.
- **`complete`:** all 9 phases have ≥1 primary artifact (automatic).
- Uploads may continue after `complete`.

### 4.3 Artifact versioning

- Each upload creates `artifact_versions` row (`version_number` monotonic).
- Replacing file → new version; prior versions **readable via API** (`GET .../versions`, `GET .../versions/:n`).
- Current pointer on `artifacts.current_version`.

### 4.4 Artifact labels (required at upload)

- **`artifact.label`** — required string (e.g. `Ar-HT1`, `Recommended-LoF`) for human identification and Compare-mode filtering.
- Optional **`metadata`**: `shield_gas`, `heat_treatment`, `process_parameters` (used in Compare filters).

### 4.5 Visualization modes (v1 — both required)

Full contract: [VISUALIZATION.md](./v1/VISUALIZATION.md).

| Mode | Purpose |
|------|---------|
| **By Phase** (default) | All nine phases visible; **all artifacts** per phase with search, sort, tabs; **low-level** type-appropriate viz per artifact |
| **Compare** | **Cross-phase dashboard**: 9 phase cells; filter by label (+ optional metadata); compact parallel viewers; **no overlay** |

Per-phase tools (By Phase only): search box, sort (label / date / type), artifact tabs.

Compare mode: label + optional metadata filters apply **across phases** only in that mode.

### 4.6 Coordinates

Per EPSCoR `data.md` / `data.json` where stated; defaults in prior spec remain (+Z build, mm STL, Bunge Euler for EBSD). Stored in `artifacts.metadata`.

---

## 5. Mutable schema & editing

- **Raw file:** immutable per version in Storage.
- **`parsed_json`:** editable cells (Editors/Admins); changelog JSON patch.
- **`column_dictionary`:** editable mapping.
- **Notes:** `richtext_v1` JSON — bold, italic, bullet lists only (not Markdown).

---

## 6. Visualization

**Dual modes:** By Phase (default) + Compare dashboard — see [VISUALIZATION.md](./v1/VISUALIZATION.md).

**Parser contract:** every `parsed_json` includes `kind`: `table` | `mesh` | `point_cloud` | `image` | `ebsd_grid` | `slice_stack`. Viewer routing uses `file_type` + `kind` so STL is never forced through CSV pipelines.

| Type | Low-level viz |
|------|----------------|
| CSV | Table + straightforward charts (Recharts) |
| STL | Three.js mesh |
| PLY | Three.js point cloud |
| PNG | Image zoom |
| EBSD .ang/.ctf | 2D orientation map |
| TIFF zip | Slice slider |

Three.js only for STL/PLY. [ARCHITECTURE.md §3](./v1/ARCHITECTURE.md).

**Plot aliases:** `stress_mpa`, `axial_strain_mm_mm`, `stress_amplitude`, `nf`, `two_nf_reversals`, `nf_sqa_d`, `nf_sqa_f`.

---

## 7. Tech stack

| Layer | Choice |
|-------|--------|
| App | Next.js 14+ App Router, TypeScript |
| UI | shadcn/ui, Tailwind |
| 3D | React Three Fiber + Three.js |
| Charts | Recharts |
| CSV | Papa Parse |
| Auth | **Supabase Auth only** |
| DB | PostgreSQL (Supabase) + JSONB |
| Files | Supabase Storage (signed upload/download) |
| Email | Resend (invites) |
| Deploy | Vercel + Supabase |

**Upload path:** client → signed URL → Storage → register artifact API (bypasses Vercel 4.5 MB body limit).

**v1 max file size:** 200 MB per file (env `MAX_UPLOAD_BYTES`). See [ARCHITECTURE.md §6](./v1/ARCHITECTURE.md) for viability and future S3 migration.

---

## 8. UI routes (summary)

| Route | Purpose |
|-------|---------|
| `/login`, `/signup` | Supabase auth |
| `/invite` | Accept org invitation |
| `/dashboard` | Org-level metrics & charts |
| `/builds` | Build list |
| `/builds/[id]` | Build overview (**v1 report summary** — phase checklist) |
| `/builds/[id]/data` | Nine-phase wizard |
| `/builds/[id]/visualizations` | By Phase + Compare modes ([VISUALIZATION.md](./v1/VISUALIZATION.md)) |

**Deferred:** `/builds/[id]/reports` (formal reports) → v1.1.

Full map: [SCREENS.md](./v1/SCREENS.md).

---

## 9. API (summary)

REST under `/api/*` with Supabase session. **No auth REST.**

Full list: [API.md](./v1/API.md).

---

## 10. Database

Logical model implemented in [001_initial.sql](../supabase/migrations/001_initial.sql):

- `organizations`, `organization_members`, `organization_invitations`
- `builds`, `phases` (9 per build, seeded on insert)
- `artifacts`, `artifact_versions`
- `phase_supplements`, `changelog`, `profiles`

RLS enforces org roles on all tables.

---

## 11. Acceptance criteria (v1)

- [ ] Supabase Auth signup/login only
- [ ] Multi-org membership with admin/editor/viewer
- [ ] Admin invite email flow + accept
- [ ] Admin transfer; admin cannot leave org
- [ ] Nine phases, types per §4.1, XLSX rejected
- [ ] Signed Storage upload ≤200 MB
- [ ] CSV, STL, PNG, PLY, EBSD (.ang/.ctf), TIFF zip viewers
- [ ] Artifact version history API
- [ ] By Phase: all 9 phases, per-phase search/sort/tabs, low-level viz per file type
- [ ] Compare: 9-cell cross-phase dashboard, label/metadata filters (no overlay)
- [ ] `parsed_json.kind` set by all parsers; correct viewer per type
- [ ] Build `complete` when 9/9 phases have data
- [ ] Changelog on mutations
- [ ] Dashboard + data + visualization routes
- [ ] Deployed Vercel + Supabase

---

## 12. Reference data (local)

`Data Set/NASA EPSCoR Inonel 718/` — gitignored; use for parser tests and [DATA_SHAPES.md](./v1/DATA_SHAPES.md).
