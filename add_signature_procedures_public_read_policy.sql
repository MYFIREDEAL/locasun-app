-- Politique RLS pour permettre la lecture de signature_procedures via token (sans auth)
CREATE POLICY "Anyone can view signature procedure with valid token"
  ON public.signature_procedures
  FOR SELECT
  USING (true);  -- Permet la lecture à tous (le token sera vérifié dans le code)
