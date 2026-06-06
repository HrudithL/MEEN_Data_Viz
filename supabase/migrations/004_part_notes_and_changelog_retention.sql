-- Part notes per phase (list entries keyed by specimen/part label)
ALTER TABLE public.phases
  ADD COLUMN IF NOT EXISTS part_notes JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Changelog entries older than 30 days are purged to save storage
CREATE OR REPLACE FUNCTION public.purge_old_changelog()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.changelog
  WHERE created_at < now() - interval '30 days';
$$;
