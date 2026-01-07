-- Ajouter colonnes OTP à cosigner_invite_tokens
ALTER TABLE cosigner_invite_tokens
ADD COLUMN IF NOT EXISTS otp_hash TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0;
