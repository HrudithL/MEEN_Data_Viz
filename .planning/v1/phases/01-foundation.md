# Phase 01 — Foundation

## Deliverables

- Next.js 14 App Router + TypeScript + Tailwind + shadcn
- Supabase project linked; `001_initial.sql` applied
- `@supabase/ssr` middleware session refresh
- Pages: `/login`, `/signup`
- `profiles` trigger verified
- POST `/api/organizations` + auto admin membership
- GET `/api/organizations`

## Checkpoint

- [ ] Sign up → profile row exists
- [ ] Create org → user is admin in `organization_members`
- [ ] RLS: second user cannot read org without membership

## Estimated focus

Auth only via Supabase client — zero custom auth REST routes.
