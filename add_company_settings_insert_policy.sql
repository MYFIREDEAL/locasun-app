-- Ajouter une policy INSERT pour company_settings
-- Au cas où la ligne singleton n'existe pas encore

-- 1. Créer la policy INSERT (tous les admins peuvent insérer)
CREATE POLICY "company_settings_insert_admins" ON public.company_settings
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
  )
);

-- 2. Vérifier que la ligne singleton existe bien
SELECT * FROM public.company_settings WHERE id = '9769af46-b3ac-4909-8810-a8cf3fd6e307';

-- 3. Si elle n'existe pas, la créer
INSERT INTO public.company_settings (id, company_name, logo_url) 
VALUES ('9769af46-b3ac-4909-8810-a8cf3fd6e307', 'Evatime', NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. Vérifier toutes les policies
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'company_settings'
ORDER BY cmd;
