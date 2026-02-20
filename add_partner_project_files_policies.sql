-- =====================================================
-- RLS POLICIES: Partenaires peuvent uploader des fichiers
-- pour les prospects liés à leurs missions
-- =====================================================

-- 1. Policy TABLE project_files : INSERT pour partenaires
CREATE POLICY "Partners can insert project files for their missions"
  ON public.project_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partners p
      JOIN public.missions m ON m.partner_id = p.id
      WHERE p.user_id = auth.uid()
        AND m.prospect_id = project_files.prospect_id
    )
  );

-- 2. Policy TABLE project_files : SELECT pour partenaires (voir leurs fichiers)
CREATE POLICY "Partners can view project files for their missions"
  ON public.project_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.partners p
      JOIN public.missions m ON m.partner_id = p.id
      WHERE p.user_id = auth.uid()
        AND m.prospect_id = project_files.prospect_id
    )
  );

-- 3. Policy STORAGE : Upload pour partenaires
CREATE POLICY "Partners can upload files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'project-files' AND
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE partners.user_id = auth.uid()
    )
  );

-- 4. Policy STORAGE : Read pour partenaires
CREATE POLICY "Partners can read files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'project-files' AND
    EXISTS (
      SELECT 1 FROM public.partners
      WHERE partners.user_id = auth.uid()
    )
  );
