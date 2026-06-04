-- MEEN Data Viz v1 — initial schema + RLS
-- Run in Supabase SQL editor or via CLI

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
CREATE TYPE org_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE build_status AS ENUM ('in_progress', 'complete');
CREATE TYPE phase_id AS ENUM (
  'powder_distribution',
  'specimen_geometry',
  'build_plate',
  'microstructure',
  'grain_size',
  'defect_analysis',
  'tensile_testing',
  'fatigue_testing',
  'fracture_mechanics'
);
CREATE TYPE file_type AS ENUM (
  'csv',
  'stl',
  'png',
  'ply',
  'tiff_zip',
  'ebsd_ang',
  'ebsd_ctf'
);
CREATE TYPE parse_status AS ENUM ('ok', 'partial', 'failed');
CREATE TYPE changelog_action AS ENUM (
  'create', 'update', 'delete', 'invite', 'invite_accept',
  'role_change', 'admin_transfer', 'version_create'
);
CREATE TYPE changelog_entity AS ENUM (
  'organization', 'build', 'phase', 'artifact', 'artifact_version',
  'supplement', 'column_dictionary', 'membership', 'invitation', 'notes'
);

-- Profiles (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

CREATE TABLE public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'viewer',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

CREATE TABLE public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role org_role NOT NULL DEFAULT 'viewer',
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  material TEXT,
  process TEXT,
  status build_status NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id)
);

CREATE TABLE public.phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
  phase phase_id NOT NULL,
  sequence SMALLINT NOT NULL CHECK (sequence BETWEEN 1 AND 9),
  is_complete BOOLEAN NOT NULL DEFAULT false,
  notes_json JSONB NOT NULL DEFAULT '{"format":"richtext_v1","blocks":[]}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (build_id, phase)
);

CREATE TABLE public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'default',
  file_type file_type NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  sha256 TEXT,
  current_version INT NOT NULL DEFAULT 1,
  parsed_json JSONB,
  column_dictionary JSONB,
  parse_status parse_status NOT NULL DEFAULT 'failed',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ -- hard delete uses DELETE; column reserved unused in v1
);

CREATE TABLE public.artifact_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  sha256 TEXT,
  parsed_json JSONB,
  column_dictionary JSONB,
  parse_status parse_status NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  UNIQUE (artifact_id, version_number)
);

CREATE TABLE public.phase_supplements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID NOT NULL REFERENCES public.phases(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id)
);

CREATE TABLE public.changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  build_id UUID REFERENCES public.builds(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  entity_type changelog_entity NOT NULL,
  entity_id UUID,
  action changelog_action NOT NULL,
  diff JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_builds_org ON public.builds(organization_id);
CREATE INDEX idx_phases_build ON public.phases(build_id);
CREATE INDEX idx_artifacts_phase ON public.artifacts(phase_id);
CREATE INDEX idx_artifact_versions_artifact ON public.artifact_versions(artifact_id);
CREATE INDEX idx_changelog_org_time ON public.changelog(organization_id, created_at DESC);

-- Helper: role in org
CREATE OR REPLACE FUNCTION public.org_role(p_org_id UUID)
RETURNS org_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.organization_members
  WHERE organization_id = p_org_id AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_view_org(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.org_role(p_org_id) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_org(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.org_role(p_org_id) IN ('admin', 'editor');
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.org_role(p_org_id) = 'admin';
$$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phase_supplements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog ENABLE ROW LEVEL SECURITY;

-- Profiles: own row
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Organizations: members can read
CREATE POLICY orgs_select ON public.organizations FOR SELECT
  USING (public.can_view_org(id));
CREATE POLICY orgs_insert ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());
CREATE POLICY orgs_update ON public.organizations FOR UPDATE
  USING (public.is_org_admin(id));

-- Members
CREATE POLICY org_members_select ON public.organization_members FOR SELECT
  USING (public.can_view_org(organization_id));
CREATE POLICY org_members_insert ON public.organization_members FOR INSERT
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (
      -- creator becomes admin on org create (first member)
      NOT EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_members.organization_id)
      AND user_id = auth.uid()
    )
  );
CREATE POLICY org_members_update ON public.organization_members FOR UPDATE
  USING (public.is_org_admin(organization_id));
CREATE POLICY org_members_delete ON public.organization_members FOR DELETE
  USING (public.is_org_admin(organization_id) AND user_id <> auth.uid());

-- Invitations: admin manage; invitee can read own by token via service role API
CREATE POLICY org_invites_select ON public.organization_invitations FOR SELECT
  USING (public.is_org_admin(organization_id));
CREATE POLICY org_invites_insert ON public.organization_invitations FOR INSERT
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY org_invites_delete ON public.organization_invitations FOR DELETE
  USING (public.is_org_admin(organization_id));

-- Builds
CREATE POLICY builds_select ON public.builds FOR SELECT
  USING (public.can_view_org(organization_id));
CREATE POLICY builds_insert ON public.builds FOR INSERT
  WITH CHECK (public.can_edit_org(organization_id));
CREATE POLICY builds_update ON public.builds FOR UPDATE
  USING (public.can_edit_org(organization_id));
CREATE POLICY builds_delete ON public.builds FOR DELETE
  USING (public.is_org_admin(organization_id));

-- Phases (via build org)
CREATE POLICY phases_select ON public.phases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.builds b
    WHERE b.id = phases.build_id AND public.can_view_org(b.organization_id)
  ));
CREATE POLICY phases_update ON public.phases FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.builds b
    WHERE b.id = phases.build_id AND public.can_edit_org(b.organization_id)
  ));

-- Artifacts
CREATE POLICY artifacts_select ON public.artifacts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.phases p JOIN public.builds b ON b.id = p.build_id
    WHERE p.id = artifacts.phase_id AND public.can_view_org(b.organization_id)
  ));
CREATE POLICY artifacts_insert ON public.artifacts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.phases p JOIN public.builds b ON b.id = p.build_id
    WHERE p.id = artifacts.phase_id AND public.can_edit_org(b.organization_id)
  ));
CREATE POLICY artifacts_update ON public.artifacts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.phases p JOIN public.builds b ON b.id = p.build_id
    WHERE p.id = artifacts.phase_id AND public.can_edit_org(b.organization_id)
  ));
CREATE POLICY artifacts_delete ON public.artifacts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.phases p JOIN public.builds b ON b.id = p.build_id
    WHERE p.id = artifacts.phase_id AND public.can_edit_org(b.organization_id)
  ));

-- Artifact versions (same as artifacts)
CREATE POLICY av_select ON public.artifact_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.artifacts a
    JOIN public.phases p ON p.id = a.phase_id
    JOIN public.builds b ON b.id = p.build_id
    WHERE a.id = artifact_versions.artifact_id AND public.can_view_org(b.organization_id)
  ));
CREATE POLICY av_insert ON public.artifact_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.artifacts a
    JOIN public.phases p ON p.id = a.phase_id
    JOIN public.builds b ON b.id = p.build_id
    WHERE a.id = artifact_versions.artifact_id AND public.can_edit_org(b.organization_id)
  ));

-- Supplements
CREATE POLICY supp_select ON public.phase_supplements FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.phases p JOIN public.builds b ON b.id = p.build_id
    WHERE p.id = phase_supplements.phase_id AND public.can_view_org(b.organization_id)
  ));
CREATE POLICY supp_insert ON public.phase_supplements FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.phases p JOIN public.builds b ON b.id = p.build_id
    WHERE p.id = phase_supplements.phase_id AND public.can_edit_org(b.organization_id)
  ));
CREATE POLICY supp_delete ON public.phase_supplements FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.phases p JOIN public.builds b ON b.id = p.build_id
    WHERE p.id = phase_supplements.phase_id AND public.can_edit_org(b.organization_id)
  ));

-- Changelog: members read; editors insert via service/trigger
CREATE POLICY changelog_select ON public.changelog FOR SELECT
  USING (public.can_view_org(organization_id));
CREATE POLICY changelog_insert ON public.changelog FOR INSERT
  WITH CHECK (public.can_edit_org(organization_id));

-- Seed phases on build create
CREATE OR REPLACE FUNCTION public.seed_build_phases()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  phases phase_id[] := ARRAY[
    'powder_distribution','specimen_geometry','build_plate','microstructure',
    'grain_size','defect_analysis','tensile_testing','fatigue_testing','fracture_mechanics'
  ]::phase_id[];
  i INT;
BEGIN
  FOR i IN 1..9 LOOP
    INSERT INTO public.phases (build_id, phase, sequence)
    VALUES (NEW.id, phases[i], i);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_phases
  AFTER INSERT ON public.builds
  FOR EACH ROW EXECUTE FUNCTION public.seed_build_phases();

-- Profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket (run in Supabase dashboard or storage API):
-- Bucket: build-artifacts (private)
-- Path: org/{orgId}/build/{buildId}/phase/{phaseId}/artifact/{artifactId}/v{version}/{filename}
