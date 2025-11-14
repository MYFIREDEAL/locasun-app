-- Fix: Permettre à TOUS les admins de modifier company_settings
-- (pas seulement Global Admin)

-- 1. Supprimer l'ancienne policy restrictive
DROP POLICY IF EXISTS "company_settings_update" ON public.company_settings;

-- 2. Créer une nouvelle policy moins restrictive
-- Tous les utilisateurs dans la table 'users' (donc tous les admins) peuvent modifier
CREATE POLICY "company_settings_update_admins" ON public.company_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
  )
);

-- 3. Vérifier les policies existantes
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'company_settings';
