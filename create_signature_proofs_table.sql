-- Table signature_proofs pour stocker les preuves de signature
CREATE TABLE IF NOT EXISTS public.signature_proofs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  signature_procedure_id UUID NOT NULL REFERENCES public.signature_procedures(id) ON DELETE CASCADE,
  signer_email TEXT NOT NULL,
  signer_user_id UUID REFERENCES auth.users(id),
  pdf_file_id UUID NOT NULL REFERENCES public.project_files(id),
  pdf_hash TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signature_proofs_procedure ON public.signature_proofs(signature_procedure_id);
CREATE INDEX idx_signature_proofs_email ON public.signature_proofs(signer_email);

-- RLS
ALTER TABLE public.signature_proofs ENABLE ROW LEVEL SECURITY;

-- Admins peuvent voir les preuves
CREATE POLICY "Admins can view signature proofs"
  ON public.signature_proofs
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid())
  );

-- Ajouter colonne signed_at si elle n'existe pas
ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
