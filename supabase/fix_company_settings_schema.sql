-- Fix: Renommer company_logo en logo_url pour correspondre au hook
-- Et utiliser le bon ID singleton

-- 1. Supprimer la table existante si elle existe avec l'ancien schéma
DROP TABLE IF EXISTS public.company_settings CASCADE;

-- 2. Créer la table avec le bon schéma
CREATE TABLE public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  logo_url TEXT, -- URL ou base64 du logo
  company_name TEXT,
  settings JSONB DEFAULT '{}'::jsonb, -- Configuration générale (formulaire contact, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insérer la ligne singleton avec le bon ID
INSERT INTO public.company_settings (id, company_name, logo_url) 
VALUES ('9769af46-b3ac-4909-8810-a8cf3fd6e307', 'Evatime', NULL);

-- 4. Activer RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- 5. Policy SELECT : Tout utilisateur authentifié peut lire
CREATE POLICY "company_settings_select" ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

-- 6. Policy UPDATE : Seuls les Global Admin peuvent modifier
CREATE POLICY "company_settings_update" ON public.company_settings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.role = 'Global Admin'
  )
);

-- 7. Activer le real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_settings;

-- 8. Vérifier que tout est OK
SELECT 
  'Table created' as status,
  id, 
  company_name, 
  logo_url,
  created_at
FROM public.company_settings;

-- 9. Vérifier le real-time
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'company_settings';
