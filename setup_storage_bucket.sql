-- ============================================
-- SETUP STORAGE BUCKET pour project-files
-- ============================================

-- 1. Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false, -- Fichiers privés
  52428800, -- 50 MB max
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Politique d'UPLOAD : Admins uniquement
CREATE POLICY "Admin users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-files' 
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('Global Admin', 'Manager', 'Commercial')
  )
);

-- 3. Politique de SELECT : Admins + Clients (leurs propres fichiers)
CREATE POLICY "Users can view their project files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-files' 
  AND (
    -- Admins voient tout
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.user_id = auth.uid()
      AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
    OR
    -- Clients voient leurs fichiers (path commence par leur prospect_id)
    EXISTS (
      SELECT 1 FROM public.prospects
      WHERE prospects.user_id = auth.uid()
      AND storage.objects.name LIKE '%' || prospects.id::text || '%'
    )
  )
);

-- 4. Politique de DELETE : Admins uniquement
CREATE POLICY "Admin users can delete files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-files' 
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('Global Admin', 'Manager')
  )
);

-- 5. Vérifier que le bucket est créé
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id = 'project-files';
