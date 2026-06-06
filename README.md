# MEEN Data Viz

Web platform for additive manufacturing (AM) experiment workflows. Organize experimental campaigns as **Builds**, capture data across nine sequential phases, version artifacts, and explore results through interactive visualizations.

Built for research teams at Texas A&M MEEN — multi-user organizations, role-based access, and a structured pipeline from powder characterization through mechanical testing.

## Features

- **Organizations & roles** — Admin, Editor, and Viewer permissions per org; invite members by email
- **Nine-phase data pipeline** — Powder distribution → specimen geometry → build plate → microstructure → grain size → defect analysis → tensile → fatigue → fracture mechanics
- **Artifact versioning** — Immutable raw files in Supabase Storage; editable parsed data, column dictionaries, and notes with changelog
- **File viewers** — CSV tables/charts, STL/PLY 3D (Three.js), PNG/TIFF stacks, EBSD maps, MTEX orientation data
- **Visualizations** — By Phase (per-artifact deep view) and Compare (cross-phase dashboard with label/metadata filters)
- **Build management** — Dashboard analytics, build overview, settings, edit log, reference materials, part notes
- **Demo mode** — Optional local demo admin sign-in for development

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Auth & API | Supabase Auth (`@supabase/ssr`), Next.js Route Handlers |
| Database | PostgreSQL (Supabase) with JSONB for parsed experiment data |
| Storage | Supabase Storage for artifact file versions |
| 3D / charts | Three.js, Recharts |

## Project structure

```
MEEN_DATA_VIZ/
├── web/                    # Next.js application
│   ├── app/                # App Router pages and API routes
│   ├── components/         # UI, viewers, viz, builds, dashboard
│   ├── lib/                # Parsers, queries, utilities
│   ├── scripts/            # DB migration and demo seed scripts
│   └── .env.example        # Environment variable template
├── supabase/
│   └── migrations/         # SQL schema (001–005)
├── .planning/              # Product specs and architecture docs
└── Data Set/               # Local reference datasets (gitignored)
```

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (Auth, Postgres, Storage enabled)

## Setup

### 1. Install dependencies

```bash
cd web
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in values from your Supabase project (Settings → API):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (`http://localhost:3000` for local dev) |
| `DATABASE_URL` | For migrations | Postgres connection URI |
| `RESEND_API_KEY` | No | Email invites |
| `NEXT_PUBLIC_DEMO_ADMIN_*` | No | Demo login button on local dev |

### 3. Apply database migrations

Either run the migration script:

```bash
npm run db:migrate
```

Or paste each file in `supabase/migrations/` into the Supabase Dashboard → SQL Editor (in numeric order).

### 4. Seed demo users (optional)

```bash
npm run seed:demo
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply SQL migrations via `DATABASE_URL` |
| `npm run seed:demo` | Create demo org/users |

## Accepted file types by phase

| Phase | Primary types |
|-------|---------------|
| Powder Distribution | CSV |
| Specimen Geometry | STL |
| Build Plate | STL, PNG |
| Microstructure | MTEX |
| Grain Size | CSV |
| Defect Analysis | CSV, PLY, STL, TIFF stack (`.zip`) |
| Tensile Testing | CSV |
| Fatigue Testing | CSV |
| Fracture Mechanics | CSV |

`.xlsx` / `.xls` uploads are rejected — export sheets to CSV first.

## Documentation

Detailed product and architecture specs live in [`.planning/SPEC.md`](.planning/SPEC.md) and [`.planning/v1/`](.planning/v1/).

## License

Private research project — contact repository owner for usage terms.
