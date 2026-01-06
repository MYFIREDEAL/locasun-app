-- Ajouter colonnes pour signature interne
ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS signature_hash TEXT,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
