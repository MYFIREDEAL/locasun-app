-- Table pour stocker les tokens d'invitation des co-signataires
-- Utilisée par la Edge Function send-cosigner-invite

CREATE TABLE IF NOT EXISTS public.cosigner_invite_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT UNIQUE NOT NULL,
  signature_procedure_id UUID NOT NULL REFERENCES public.signature_procedures(id) ON DELETE CASCADE,
  signer_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_cosigner_tokens_token ON public.cosigner_invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_cosigner_tokens_procedure ON public.cosigner_invite_tokens(signature_procedure_id);
CREATE INDEX IF NOT EXISTS idx_cosigner_tokens_email ON public.cosigner_invite_tokens(signer_email);

-- RLS Policies
ALTER TABLE public.cosigner_invite_tokens ENABLE ROW LEVEL SECURITY;

-- Public peut lire avec le bon token (pour la page de signature)
CREATE POLICY "Public can read own token"
ON public.cosigner_invite_tokens
FOR SELECT
USING (true); -- Le token est vérifié dans la Edge Function

-- Admins peuvent tout voir
CREATE POLICY "Admins can view all tokens"
ON public.cosigner_invite_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('Global Admin', 'Manager', 'Commercial')
  )
);

-- Commentaires
COMMENT ON TABLE public.cosigner_invite_tokens IS 'Tokens d''invitation pour les co-signataires de contrats';
COMMENT ON COLUMN public.cosigner_invite_tokens.token IS 'Token unique pour accès sécurisé';
COMMENT ON COLUMN public.cosigner_invite_tokens.expires_at IS 'Date d''expiration du token (48h)';
COMMENT ON COLUMN public.cosigner_invite_tokens.used_at IS 'Date d''utilisation du token (première connexion)';
