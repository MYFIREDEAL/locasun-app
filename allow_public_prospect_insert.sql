-- ========================================
-- INSCRIPTION CLIENT PUBLIQUE
-- ========================================
-- Permet à N'IMPORTE QUI (non authentifié) de créer un prospect
-- via le formulaire d'inscription public (/inscription)

CREATE POLICY "Allow public client registration"
  ON public.prospects
  FOR INSERT
  TO anon, authenticated  -- N'importe qui (connecté ou pas)
  WITH CHECK (true);  -- Pas de restriction, tout le monde peut s'inscrire !

-- ========================================
-- VÉRIFICATION
-- ========================================
-- SELECT * FROM pg_policies WHERE tablename = 'prospects' AND policyname = 'Allow public client registration';
