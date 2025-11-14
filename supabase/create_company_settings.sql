-- Créer la table company_settings pour stocker les paramètres globaux de l'entreprise
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT,
  company_logo TEXT, -- URL ou base64 de l'image
  company_address TEXT,
  company_city TEXT,
  company_zip TEXT,
  company_country TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Il ne devrait y avoir qu'une seule ligne dans cette table (singleton)
-- On insert une ligne par défaut
INSERT INTO public.company_settings (id, company_name, company_logo) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Evatime', NULL)
ON CONFLICT (id) DO NOTHING;

-- RLS : Tout le monde peut lire, seuls les admins peuvent modifier
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Policy : Tout utilisateur authentifié peut lire
CREATE POLICY "company_settings_select" ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

-- Policy : Seuls les Global Admin peuvent modifier
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

-- Activer le real-time sur cette table
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_settings;

-- Vérifier
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'company_settings';
