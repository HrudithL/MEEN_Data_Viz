// Auto-generated from Supabase + domain types appended below
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      artifact_versions: {
        Row: {
          artifact_id: string
          column_dictionary: Json | null
          created_at: string
          created_by: string
          file_name: string
          file_size: number
          id: string
          metadata: Json
          parse_status: Database["public"]["Enums"]["parse_status"]
          parsed_json: Json | null
          sha256: string | null
          storage_path: string
          version_number: number
        }
        Insert: {
          artifact_id: string
          column_dictionary?: Json | null
          created_at?: string
          created_by: string
          file_name: string
          file_size: number
          id?: string
          metadata?: Json
          parse_status: Database["public"]["Enums"]["parse_status"]
          parsed_json?: Json | null
          sha256?: string | null
          storage_path: string
          version_number: number
        }
        Update: {
          artifact_id?: string
          column_dictionary?: Json | null
          created_at?: string
          created_by?: string
          file_name?: string
          file_size?: number
          id?: string
          metadata?: Json
          parse_status?: Database["public"]["Enums"]["parse_status"]
          parsed_json?: Json | null
          sha256?: string | null
          storage_path?: string
          version_number?: number
        }
        Relationships: [
          { foreignKeyName: "artifact_versions_artifact_id_fkey"; columns: ["artifact_id"]; isOneToOne: false; referencedRelation: "artifacts"; referencedColumns: ["id"] },
          { foreignKeyName: "artifact_versions_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      artifacts: {
        Row: {
          column_dictionary: Json | null
          current_version: number
          deleted_at: string | null
          file_name: string
          file_size: number
          file_type: Database["public"]["Enums"]["file_type"]
          id: string
          label: string
          metadata: Json
          mime_type: string | null
          parse_status: Database["public"]["Enums"]["parse_status"]
          parsed_json: Json | null
          phase_id: string
          sha256: string | null
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          column_dictionary?: Json | null
          current_version?: number
          deleted_at?: string | null
          file_name: string
          file_size: number
          file_type: Database["public"]["Enums"]["file_type"]
          id?: string
          label?: string
          metadata?: Json
          mime_type?: string | null
          parse_status?: Database["public"]["Enums"]["parse_status"]
          parsed_json?: Json | null
          phase_id: string
          sha256?: string | null
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          column_dictionary?: Json | null
          current_version?: number
          deleted_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: Database["public"]["Enums"]["file_type"]
          id?: string
          label?: string
          metadata?: Json
          mime_type?: string | null
          parse_status?: Database["public"]["Enums"]["parse_status"]
          parsed_json?: Json | null
          phase_id?: string
          sha256?: string | null
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          { foreignKeyName: "artifacts_phase_id_fkey"; columns: ["phase_id"]; isOneToOne: false; referencedRelation: "phases"; referencedColumns: ["id"] },
          { foreignKeyName: "artifacts_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      builds: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          material: string | null
          name: string
          organization_id: string
          process: string | null
          status: Database["public"]["Enums"]["build_status"]
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          material?: string | null
          name: string
          organization_id: string
          process?: string | null
          status?: Database["public"]["Enums"]["build_status"]
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          material?: string | null
          name?: string
          organization_id?: string
          process?: string | null
          status?: Database["public"]["Enums"]["build_status"]
        }
        Relationships: [
          { foreignKeyName: "builds_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "builds_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ]
      }
      changelog: {
        Row: {
          action: Database["public"]["Enums"]["changelog_action"]
          build_id: string | null
          created_at: string
          diff: Json | null
          entity_id: string | null
          entity_type: Database["public"]["Enums"]["changelog_entity"]
          id: string
          metadata: Json | null
          organization_id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["changelog_action"]
          build_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type: Database["public"]["Enums"]["changelog_entity"]
          id?: string
          metadata?: Json | null
          organization_id: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["changelog_action"]
          build_id?: string | null
          created_at?: string
          diff?: Json | null
          entity_id?: string | null
          entity_type?: Database["public"]["Enums"]["changelog_entity"]
          id?: string
          metadata?: Json | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          { foreignKeyName: "changelog_build_id_fkey"; columns: ["build_id"]; isOneToOne: false; referencedRelation: "builds"; referencedColumns: ["id"] },
          { foreignKeyName: "changelog_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "changelog_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          { foreignKeyName: "organization_invitations_invited_by_fkey"; columns: ["invited_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "organization_invitations_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
        ]
      }
      organization_members: {
        Row: {
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          { foreignKeyName: "organization_members_organization_id_fkey"; columns: ["organization_id"]; isOneToOne: false; referencedRelation: "organizations"; referencedColumns: ["id"] },
          { foreignKeyName: "organization_members_user_id_fkey"; columns: ["user_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: [
          { foreignKeyName: "organizations_created_by_fkey"; columns: ["created_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      phase_supplements: {
        Row: {
          caption: string | null
          file_name: string
          id: string
          phase_id: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          caption?: string | null
          file_name: string
          id?: string
          phase_id: string
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          caption?: string | null
          file_name?: string
          id?: string
          phase_id?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          { foreignKeyName: "phase_supplements_phase_id_fkey"; columns: ["phase_id"]; isOneToOne: false; referencedRelation: "phases"; referencedColumns: ["id"] },
          { foreignKeyName: "phase_supplements_uploaded_by_fkey"; columns: ["uploaded_by"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      phases: {
        Row: {
          build_id: string
          id: string
          is_complete: boolean
          notes_json: Json
          phase: Database["public"]["Enums"]["phase_id"]
          sequence: number
          updated_at: string
        }
        Insert: {
          build_id: string
          id?: string
          is_complete?: boolean
          notes_json?: Json
          phase: Database["public"]["Enums"]["phase_id"]
          sequence: number
          updated_at?: string
        }
        Update: {
          build_id?: string
          id?: string
          is_complete?: boolean
          notes_json?: Json
          phase?: Database["public"]["Enums"]["phase_id"]
          sequence?: number
          updated_at?: string
        }
        Relationships: [
          { foreignKeyName: "phases_build_id_fkey"; columns: ["build_id"]; isOneToOne: false; referencedRelation: "builds"; referencedColumns: ["id"] },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_org: { Args: { p_org_id: string }; Returns: boolean }
      can_view_org: { Args: { p_org_id: string }; Returns: boolean }
      is_org_admin: { Args: { p_org_id: string }; Returns: boolean }
      org_role: {
        Args: { p_org_id: string }
        Returns: Database["public"]["Enums"]["org_role"]
      }
    }
    Enums: {
      build_status: "in_progress" | "complete"
      changelog_action: "create" | "update" | "delete" | "invite" | "invite_accept" | "role_change" | "admin_transfer" | "version_create"
      changelog_entity: "organization" | "build" | "phase" | "artifact" | "artifact_version" | "supplement" | "column_dictionary" | "membership" | "invitation" | "notes"
      file_type: "csv" | "stl" | "png" | "ply" | "tiff_zip" | "ebsd_ang" | "ebsd_ctf"
      org_role: "admin" | "editor" | "viewer"
      parse_status: "ok" | "partial" | "failed"
      phase_id: "powder_distribution" | "specimen_geometry" | "build_plate" | "microstructure" | "grain_size" | "defect_analysis" | "tensile_testing" | "fatigue_testing" | "fracture_mechanics"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ─── Domain types (used by parsers, viewers, API) ────────────────────────────

export type OrgRole = Database["public"]["Enums"]["org_role"]
export type BuildStatus = Database["public"]["Enums"]["build_status"]
export type PhaseIdEnum = Database["public"]["Enums"]["phase_id"]
export type FileTypeEnum = Database["public"]["Enums"]["file_type"]
export type ParseStatusEnum = Database["public"]["Enums"]["parse_status"]
export type ChangelogAction = Database["public"]["Enums"]["changelog_action"]
export type ChangelogEntity = Database["public"]["Enums"]["changelog_entity"]

export type ParsedJson =
  | { kind: "table"; tables: { name?: string; rows: Record<string, unknown>[] }[] }
  | { kind: "mesh"; format: "stl"; boundingBox: { min: number[]; max: number[] }; triangleCount: number }
  | { kind: "point_cloud"; format: "ply"; pointCount: number; boundingBox: { min: number[]; max: number[] } }
  | { kind: "image"; format: "png"; width: number; height: number }
  | { kind: "ebsd_grid"; format: "ang" | "ctf"; width: number; height: number; phases: string[]; stepSize?: number; cols?: number; rows?: number; data?: { x: number; y: number; phi1: number; PHI: number; phi2: number; phaseIndex: number }[] }
  | { kind: "slice_stack"; sliceCount: number; slices: { index: number; storagePath: string }[] }

export type RichTextBlock = { type: "paragraph" | "bullet"; text: string; bold?: boolean; italic?: boolean }
export type NotesJson = { format: "richtext_v1"; blocks: RichTextBlock[] }
export type ColumnDictionary = Record<string, { type: string; unit?: string; displayName?: string }>

// Row type aliases for convenience
export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type Organization = Database["public"]["Tables"]["organizations"]["Row"]
export type OrganizationMember = Database["public"]["Tables"]["organization_members"]["Row"]
export type OrganizationInvitation = Database["public"]["Tables"]["organization_invitations"]["Row"]
export type Build = Database["public"]["Tables"]["builds"]["Row"]
export type Phase = Database["public"]["Tables"]["phases"]["Row"]
export type Artifact = Database["public"]["Tables"]["artifacts"]["Row"]
export type ArtifactVersion = Database["public"]["Tables"]["artifact_versions"]["Row"]
export type PhaseSupplement = Database["public"]["Tables"]["phase_supplements"]["Row"]
export type ChangelogEntry = Database["public"]["Tables"]["changelog"]["Row"]
