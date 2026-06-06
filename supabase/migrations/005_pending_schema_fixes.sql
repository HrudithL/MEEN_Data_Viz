-- Idempotent fixes for environments missing mtex enum value or build_references table.
-- Safe to run multiple times via Supabase SQL Editor or: npm run db:migrate

DO $$ BEGIN
  ALTER TYPE changelog_entity ADD VALUE 'reference';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE file_type ADD VALUE 'mtex';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.build_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'reference',
  description TEXT,
  file_name TEXT NOT NULL,
  file_extension TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_build_references_build ON public.build_references(build_id);

ALTER TABLE public.build_references ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY build_references_select ON public.build_references FOR SELECT
    USING (EXISTS (
      SELECT 1 FROM public.builds b
      WHERE b.id = build_references.build_id AND public.can_view_org(b.organization_id)
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY build_references_insert ON public.build_references FOR INSERT
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.builds b
      WHERE b.id = build_references.build_id AND public.can_edit_org(b.organization_id)
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY build_references_delete ON public.build_references FOR DELETE
    USING (EXISTS (
      SELECT 1 FROM public.builds b
      WHERE b.id = build_references.build_id AND public.can_edit_org(b.organization_id)
    ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
