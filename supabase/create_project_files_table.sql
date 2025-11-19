-- =====================================================
-- TABLE: project_files
-- Description: Gestion des fichiers uploadés par projet
-- =====================================================

CREATE TABLE IF NOT EXISTS public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relation avec le projet
  project_type TEXT NOT NULL,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  
  -- Informations fichier
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  storage_path TEXT NOT NULL UNIQUE,
  
  -- Métadonnées
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_project_files_project_type ON public.project_files(project_type);
CREATE INDEX IF NOT EXISTS idx_project_files_prospect_id ON public.project_files(prospect_id);
CREATE INDEX IF NOT EXISTS idx_project_files_created_at ON public.project_files(created_at DESC);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_project_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_files_updated_at
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW
  EXECUTE FUNCTION update_project_files_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all project files"
  ON public.project_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
    )
  );

-- Les admins peuvent insérer des fichiers
CREATE POLICY "Admins can insert project files"
  ON public.project_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
    )
  );

-- Les admins peuvent supprimer des fichiers
CREATE POLICY "Admins can delete project files"
  ON public.project_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
    )
  );

-- =====================================================
-- STORAGE BUCKET: project-files
-- =====================================================

-- Créer le bucket (si n'existe pas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Les admins peuvent uploader
CREATE POLICY "Admins can upload files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
    )
  );

-- Policy: Les admins peuvent lire les fichiers
CREATE POLICY "Admins can read files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'project-files' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
    )
  );

-- Policy: Les admins peuvent supprimer les fichiers
CREATE POLICY "Admins can delete files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project-files' AND
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
    )
  );

-- =====================================================
-- REALTIME
-- =====================================================

-- Activer realtime sur la table
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_files;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

COMMENT ON TABLE public.project_files IS 'Stockage des métadonnées de fichiers uploadés par projet';
