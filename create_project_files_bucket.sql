-- Créer le bucket Storage pour les fichiers de projet
-- Si le bucket existe déjà, cette commande échouera (normal)

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

-- Politique RLS : permettre lecture authentifiée
CREATE POLICY "Authenticated users can view project files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'project-files' AND auth.role() = 'authenticated');

-- Politique RLS : permettre upload authentifié
CREATE POLICY "Authenticated users can upload project files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'project-files' AND auth.role() = 'authenticated');

-- Alternative : bucket PUBLIC (déconseillé pour contrats sensibles)
-- UPDATE storage.buckets SET public = true WHERE id = 'project-files';
