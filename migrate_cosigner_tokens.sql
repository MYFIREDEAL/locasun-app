-- Table pour stocker les tokens d'invitation des cosignataires
CREATE TABLE IF NOT EXISTS cosigner_invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token UUID NOT NULL UNIQUE,
  signature_procedure_id UUID NOT NULL REFERENCES signature_procedures(id) ON DELETE CASCADE,
  signer_email TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour recherche rapide par token
CREATE INDEX IF NOT EXISTS idx_cosigner_tokens_token ON cosigner_invite_tokens(token);
CREATE INDEX IF NOT EXISTS idx_cosigner_tokens_procedure ON cosigner_invite_tokens(signature_procedure_id);

-- RLS
ALTER TABLE cosigner_invite_tokens ENABLE ROW LEVEL SECURITY;

-- Politique: Lecture publique pour validation token (sans auth)
CREATE POLICY "Public can validate token"
  ON cosigner_invite_tokens
  FOR SELECT
  USING (true);

-- Politique: Seuls admins peuvent créer/modifier
CREATE POLICY "Only service role can insert"
  ON cosigner_invite_tokens
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only service role can update"
  ON cosigner_invite_tokens
  FOR UPDATE
  USING (false);
