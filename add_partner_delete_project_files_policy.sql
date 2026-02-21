-- =====================================================
-- RLS POLICIES: Partenaires peuvent SUPPRIMER des fichiers
-- pour les prospects liés à leurs missions
-- (Manquait : seuls INSERT et SELECT existaient)
-- =====================================================

-- 1. Policy TABLE project_files : DELETE pour partenaires
CREATE POLICY "Partners can delete project files for their missions"
  ON public.project_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.partners p
      JOIN public.missions m ON m.partner_id = p.id
      WHERE p.user_id = auth.uid()
        AND m.prospect_id = project_files.prospect_id
    )
  );

-- 2. Policy STORAGE : DELETE pour partenaires
CREATE POLICY "Partners can delete files from storage"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'project-files' AND
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE partners.user_id = auth.uid()
    )
  );
