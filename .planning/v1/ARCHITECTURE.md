# v1 Architecture — Storage, 3D, and Upload Limits

Companion to [SPEC.md](../SPEC.md). Read this when implementing parsers, storage, or deployment.

---

## 1. Why PostgreSQL (not “only” a document DB)?

Relational **table structure is fixed**; **cell contents are not**. v1 uses a **hybrid model**:

| Stored in fixed SQL columns | Stored in flexible layers |
|-----------------------------|---------------------------|
| User id, org id, build id, phase id | — |
| Who uploaded what, when, role, version number | — |
| File type enum, storage path, SHA-256, parse status | — |
| — | **`parsed_json` (JSONB)** — rows, grids, plot-ready series |
| — | **`column_dictionary` (JSONB)** — header → type, unit, display name |
| — | **`metadata` (JSONB)** — condition labels, units, EBSD variant |
| — | **Object storage (Supabase Storage)** — raw bytes unchanged |

**Why not MongoDB-only?** Organizations, builds, nine phases, memberships, invitations, and changelog need **joins, foreign keys, and Row Level Security**. Postgres + JSONB gives both: **relational integrity for workflow** + **schema-less payloads for messy experiment files**.

**Why not store everything in S3?** You would still need a database for permissions, search, versioning pointers, and “which phase is complete.” Files hold blobs; Postgres holds **index + mutable interpretation**.

**Analogy:** Postgres rows are **envelopes** (who, what, where, version); JSONB is the **letter inside** (any shape); Storage is the **attachment** (STL, zip, etc.).

---

## 2. Database shape for arbitrary formats

See `supabase/migrations/001_initial.sql`. Conceptually:

```
organization ──< organization_members (role)
              └──< builds ──< phases (9 fixed rows per build)
                              ├──< artifacts ──< artifact_versions
                              └──< phase_supplements (PNG notes attachments)
```

Each **artifact** = one user upload (one file or one zip). Parser output lives in `artifacts.parsed_json` and current version snapshot in `artifact_versions.parsed_json`. Replacing a file **inserts a new version row**; API can list versions and fetch by `version_number`.

**Variable format handling:**

1. Upload raw file → Storage path by convention.
2. Detect `file_type` from extension + phase rules.
3. Run type-specific parser → populate `parsed_json` with required top-level **`kind`** (`table` | `mesh` | `point_cloud` | `image` | `ebsd_grid` | `slice_stack`). See [VISUALIZATION.md §5](./VISUALIZATION.md).
4. If headers exist, build `column_dictionary` from first row/sample.
5. User edits dictionary or cell values → update JSONB only; **raw file in Storage is immutable** for that version.

No per-column SQL migrations when a lab sends a new CSV layout.

---

## 3. Why Three.js (React Three Fiber)?

| Input | v1 viewer | Technology |
|-------|-----------|------------|
| **STL** | Triangle mesh, orbit/zoom | Three.js `STLLoader` |
| **PLY** | Point cloud (ASCII + binary) | Three.js `PLYLoader` + decimation if >500k points |
| **PNG** | 2D image | `<img>` / canvas, not Three.js |
| **CSV** | Table + charts | TanStack Table + Recharts (or similar) |
| **TIFF stack** | Zip of slice images | Unzip client-side or server-side → 2D slice slider (canvas) |
| **EBSD `.ang` / `.ctf`** | 2D orientation map | Parse to grid JSON → **2D canvas/WebGL heatmap** (IPF-style coloring), not a 3D volume |

Three.js is chosen because **STL and PLY are standard 3D web formats** with mature loaders and community examples. It does **not** render CSV, TIFF, or EBSD maps as 3D volumes in v1.

**Future 3D formats (VTK, NRRD):** Add dedicated loaders or server-side conversion to glTF/PLY; keep Three.js as the display engine for triangle meshes and points.

**“3D input source” in v1:** Only **STL mesh** and **PLY point cloud** use Three.js. A TIFF zip is **many 2D images**, not a volumetric Three.js scene (true 3D volume rendering is post-v1).

---

## 4. Visualization architecture (two modes)

| Mode | When | Filters |
|------|------|---------|
| **By Phase** | Default on `/visualizations` | Per-phase only: search, sort, artifact tabs — **all artifacts visible** unless search narrows list |
| **Compare** | User toggles Compare | Cross-phase: label + optional metadata (`shield_gas`, `heat_treatment`, `process_parameters`) |

**By Phase:** User sees **all data in all phases** with low-level viz (table, mesh, map, etc.) per artifact. This is the primary exploration surface.

**Compare:** Nine phase cells in one dashboard; each cell shows artifacts matching the comparison filter (e.g. only `Ar-HT1`). Used when one build has multiple conditions and the user wants **condition-centric** reading across powder → tensile → fatigue without overlaying geometry.

**Not overlay:** Compare places viewers side by side; never draws STL on top of STL.

Full UI contract: [VISUALIZATION.md](./VISUALIZATION.md).

---

## 5. Authentication (single approach)

**Supabase Auth only.** No custom `/api/auth/signup` or `/api/auth/signin` REST routes.

| Concern | Implementation |
|---------|----------------|
| Sign up / sign in | `@supabase/ssr` in Next.js + Supabase hosted Auth UI or custom forms calling `supabase.auth.signUp` / `signInWithPassword` |
| Session | HTTP-only cookies via Supabase SSR helpers |
| API authorization | Route handlers read session; service role only for admin scripts |
| Profile row | `public.profiles` synced on signup (trigger) |

All “auth routes” are **Supabase**, not duplicated REST auth.

---

## 6. Upload path and size limits (viability)

**Problem:** Vercel serverless request bodies are capped (~4.5 MB on Hobby). Large STL/PLY/zip stacks **cannot** stream through Next.js API bodies reliably.

**v1 pattern (required):**

1. Client requests **signed upload URL** from `POST /api/storage/sign-upload` (authenticated, org role checked).
2. Client **PUTs file directly to Supabase Storage**.
3. Client calls `POST /api/phases/:id/artifacts` with `storage_path`, metadata, label → server parses and writes DB.

| Type | Typical size | v1 max (configurable) | Risk |
|------|----------------|----------------------|------|
| CSV | 1 KB – 50 MB | 50 MB | Parse memory on server; stream parse if needed |
| STL | 5–100 MB | 200 MB | OK with direct Storage upload |
| PLY | 10 MB – 2 GB | 200 MB v1 cap | May need decimation in viewer |
| PNG | < 20 MB | 20 MB | Low risk |
| TIFF zip | 50–500 MB | 200 MB v1 cap | Unzip on server or client; limit slice count (e.g. 500) |
| EBSD .ang/.ctf | 1–200 MB | 200 MB | Text .ang/.ctf OK; binary deferred |

**Supabase free tier:** 1 GB storage total — fine for development; production may need Pro or external S3.

**If limits are exceeded later:** Move blobs to **AWS S3 + CloudFront**, keep Postgres metadata; or **Railway/Fly.io** API with no 4.5 MB body limit; keep Supabase for Auth/DB only.

**CORS:** Supabase Storage CORS allows browser PUT from your Vercel domain; configure in Supabase dashboard once per environment.

---

## 7. Organization model (v1)

- Any authenticated user may **create an organization** (becomes **Admin**).
- User may belong to **many organizations** with **one role per org**: `admin` | `editor` | `viewer`.
- **Admin** cannot leave org; may **transfer admin** to an existing **editor** (admin → editor, target → admin).
- **Invites** are **organization-scoped** (email → accept → `organization_members` row).
- **Builds** belong to one org; all members with editor+ can edit builds; viewers read-only.

---

## 8. Build completion

- `builds.status = 'in_progress'` until **all 9 phases** have ≥1 valid primary artifact.
- When phase 9 satisfied, status → `'complete'` (automatic; no manual button).
- Phases may be left empty temporarily; build stays `in_progress`.

---

## 9. Notes formatting

Phase notes: **plain text** with lightweight formatting stored as JSON (not Markdown):

```json
{ "format": "richtext_v1", "blocks": [{ "type": "paragraph", "text": "HT1 schedule", "bold": false }] }
```

UI: toolbar for **bold**, *italic*, bullet list only. Render in read-only view without Markdown syntax visible.

---

## 10. XLSX policy

- **Upload rejected:** `.xlsx`, `.xls` at API and UI.
- **Documentation:** [DATA_SHAPES.md](./DATA_SHAPES.md) lists multi-sheet layouts from reference `data.md` / `data.json` so users know **how many CSVs to export** (one CSV per sheet/logical table).

---

## 11. Inline cell editing (decision)

- Edits apply to **`parsed_json` in the current artifact version** (and bump `updated_at`).
- **Raw Storage object never changes** for that version.
- Changelog records cell-level diff (JSON patch on row index + column key).
- Re-uploading a file creates **new artifact version**; old version remains readable via versions API.

---

## 12. Build Reports (v1 scope)

**Not a separate product surface in v1.** Phase completion checklist + artifact counts appear on **Build detail** (`/builds/[id]`). Dedicated **Build Reports** page (`/builds/[id]/reports`) deferred to v1.1 unless time permits — see PLAN.md Phase 7 optional.
