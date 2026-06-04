# v1 Screen & Route Map

Next.js App Router. All app routes except `/login`, `/signup`, `/invite` require session.

| Route | Page | Purpose |
|-------|------|---------|
| `/login` | Login | Email/password via Supabase |
| `/signup` | Sign up | Register + redirect to dashboard |
| `/invite` | Accept invitation | Query `token`; join org; signup if needed |
| `/dashboard` | Organization dashboard | Org selector; high-level metrics/charts across builds |
| `/builds` | Builds list | Builds for active org; create build (editor+) |
| `/builds/[buildId]` | Build detail | Status, 9/9 progress, links to Data/Viz |
| `/builds/[buildId]/data` | Data intake | Nine-phase wizard, uploads, notes, supplements |
| `/builds/[buildId]/visualizations` | Visualizations | **By Phase** (default) + **Compare** — [VISUALIZATION.md](./VISUALIZATION.md) |

**Deferred v1.1:** `/builds/[buildId]/reports` — formal PDF-style reports.

---

## Visualizations page layout

```
/builds/[buildId]/visualizations
├── ModeToggle: [ By Phase | Compare ]
├── CompareFilters (if Compare) — label, shield gas, HT, process params
├── ByPhaseView (default)
│   └── PhasePanel × 9 (accordion/stack)
│       ├── ArtifactToolbar: search | sort | tabs
│       └── ArtifactViewer (low-level viz)
└── CompareView
    └── CompareGrid (9 phase cells, compact viewers)
```

---

## Layout

```
AppShell
├── OrgSwitcher (header)
├── BuildSwitcher (when inside builds)
├── Nav: Dashboard | Builds
└── UserMenu (sign out)
```

Build sub-nav (tabs): **Overview** | **Data** | **Visualizations**

---

## Key UI states

| State | Behavior |
|-------|----------|
| No org | Prompt create organization on dashboard |
| No build | Empty builds list + CTA |
| Viewer on build | Data tab read-only; visualizations read-only |
| Phase incomplete | Warning badge on Data stepper; viz still shows uploaded artifacts |
| Parse failed | Artifact shows error + download raw file |
| Compare + no match | Phase cell: “No data for {label}” |

---

## Dashboard widgets (v1)

- Total builds / complete vs in progress
- Bar: phases completed across all builds (aggregate)
- Table: recent artifacts (last 10)

Keep dashboard **read-only** for viewers.
