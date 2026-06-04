# Phase 07 — Invites & Dashboard

## Deliverables

- `POST /api/organizations/:id/invitations` + Resend (or Supabase edge) email
- `/invite?token=` accept page
- Admin transfer endpoint
- Admin cannot DELETE self from `organization_members` (API guard)
- `/dashboard` with org metrics endpoint
- Org switcher in header

## Checkpoint

- [ ] Invite email → new user signup → member row with correct role
- [ ] Transfer admin: old admin becomes editor
