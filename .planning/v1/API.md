# v1 REST API (Supabase Auth for identity only)

All routes under `/api/*` require a valid **Supabase session** unless noted. Auth uses **`supabase.auth`** — no `/api/auth/signup` or `/api/auth/signin`.

**Errors (all routes):** `{ "error": { "code": string, "message": string } }`  
**Pagination:** `?page=1&limit=50` → `{ "data": [], "meta": { "page", "limit", "total" } }`

---

## Auth (Supabase client — not REST)

| Action | Where |
|--------|--------|
| Sign up | `supabase.auth.signUp({ email, password })` |
| Sign in | `supabase.auth.signInWithPassword({ email, password })` |
| Sign out | `supabase.auth.signOut()` |
| Session | `@supabase/ssr` in middleware + server components |

---

## Organizations

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/organizations` | auth | List orgs user belongs to + role |
| POST | `/api/organizations` | auth | Create org; caller becomes admin |
| GET | `/api/organizations/:orgId` | member | Org detail + member count |
| GET | `/api/organizations/:orgId/members` | member | List members |
| POST | `/api/organizations/:orgId/invitations` | admin | Body: `{ email, role: "editor"|"viewer" }` → sends email |
| POST | `/api/invitations/accept` | auth | Body: `{ token }` → join org |
| PATCH | `/api/organizations/:orgId/members/:userId` | admin | Body: `{ role }` |
| DELETE | `/api/organizations/:orgId/members/:userId` | admin | Remove member (not self if admin) |
| POST | `/api/organizations/:orgId/transfer-admin` | admin | Body: `{ targetUserId }` editor→admin, self→editor |

**Invite email:** API creates `organization_invitations` row, sends link  
`{APP_URL}/invite?token={token}` → accept flow; signup redirect if unauthenticated.

---

## Builds

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/organizations/:orgId/builds` | member | List builds |
| POST | `/api/organizations/:orgId/builds` | editor+ | Create build (seeds 9 phases) |
| GET | `/api/builds/:buildId` | member | Build + phase completion summary |
| PATCH | `/api/builds/:buildId` | editor+ | Update name, description, material, process |
| DELETE | `/api/builds/:buildId` | admin | Delete build and storage prefix |

`status`: `in_progress` | `complete` (server recalculates when phases complete).

---

## Storage

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/storage/sign-upload` | editor+ | Body: `{ orgId, buildId, phaseId, fileName, fileSize, mimeType }` → `{ signedUrl, storagePath, token }` |
| GET | `/api/storage/sign-download` | member | Query: `storagePath` → `{ signedUrl }` |

Max `fileSize`: 209715200 (200 MB) unless env override.

---

## Phases & artifacts

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/builds/:buildId/phases` | member | All 9 phases + `is_complete` |
| PATCH | `/api/phases/:phaseId/notes` | editor+ | Body: `{ notes_json }` richtext_v1 |
| POST | `/api/phases/:phaseId/artifacts` | editor+ | Body: `{ label, fileType, storagePath, fileName, fileSize, sha256, metadata?, ebsdFormat? }` → parse, create v1 |
| GET | `/api/artifacts/:artifactId` | member | Current artifact + parsed preview |
| PATCH | `/api/artifacts/:artifactId` | editor+ | Update `label`, `metadata`, `column_dictionary`, or `parsed_json` cells |
| DELETE | `/api/artifacts/:artifactId` | editor+ | Hard delete artifact + versions |
| POST | `/api/artifacts/:artifactId/versions` | editor+ | New file version (same as sign-upload + register) |
| GET | `/api/artifacts/:artifactId/versions` | member | List `{ version_number, created_at, file_name, parse_status }` |
| GET | `/api/artifacts/:artifactId/versions/:n` | member | Full version payload + download URL |

**Rejected MIME/extensions:** `.xlsx`, `.xls` → `400` code `UNSUPPORTED_FORMAT`.

**EBSD upload:** `fileType`: `ebsd_ang` | `ebsd_ctf`; user selects on upload UI.

**TIFF stack:** `fileType`: `tiff_zip`; zip must contain `.tif`/`.tiff` images only.

---

## Supplements

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/phases/:phaseId/supplements` | editor+ | PNG via sign-upload + register |
| DELETE | `/api/supplements/:id` | editor+ | Remove supplement |

---

## Visualizations & dashboard

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/builds/:buildId/visualizations` | member | Manifest for viz UI — see query params below |
| GET | `/api/organizations/:orgId/dashboard` | member | Aggregates: build counts, completion %, recent uploads |

**`GET /api/builds/:buildId/visualizations`**

Query params:

| Param | Values | Used in |
|-------|--------|---------|
| `mode` | `by_phase` (default), `compare` | Both |
| `label` | string or omit | Compare — filter `artifact.label` |
| `shield_gas` | string or omit | Compare — `metadata.shield_gas` |
| `heat_treatment` | string or omit | Compare — `metadata.heat_treatment` |
| `process_parameters` | string or omit | Compare — `metadata.process_parameters` |

Response shape: [VISUALIZATION.md §6](./VISUALIZATION.md). Each artifact includes `parsedKind`, `viewerHint`, `parseStatus`, signed download URL optional via separate sign-download call.

**Upload body requires `label`:** `POST .../artifacts` rejects missing or empty `label` with `400` `LABEL_REQUIRED`.

---

## Changelog

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/api/organizations/:orgId/changelog` | member | Paginated audit log |
| GET | `/api/builds/:buildId/changelog` | member | Filtered to build |

---

## Plot column aliases (server-side hint)

Used for auto-chart detection; see SPEC §6.4. Stored in code constant `PLOT_ALIASES`, not DB.
