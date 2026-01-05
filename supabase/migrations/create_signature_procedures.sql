-- ============================================
-- TABLE: signature_procedures
-- Stockage des procédures de signature Yousign
-- ============================================

CREATE TABLE IF NOT EXISTS public.signature_procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prospect_id UUID NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  project_type TEXT NOT NULL,
  file_id UUID NOT NULL REFERENCES public.project_files(id) ON DELETE CASCADE,
  
  -- Données Yousign
  yousign_procedure_id TEXT UNIQUE NOT NULL,
  yousign_signer_id TEXT,
  signature_link TEXT,
  
  -- Statut
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'refused', 'expired', 'error')),
  signed_at TIMESTAMPTZ,
  signed_file_id UUID REFERENCES public.project_files(id) ON DELETE SET NULL,
  
  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_signature_procedures_prospect ON public.signature_procedures(prospect_id);
CREATE INDEX idx_signature_procedures_yousign ON public.signature_procedures(yousign_procedure_id);
CREATE INDEX idx_signature_procedures_status ON public.signature_procedures(status);

-- Commentaires
COMMENT ON TABLE public.signature_procedures IS 'Procédures de signature électronique Yousign';
COMMENT ON COLUMN public.signature_procedures.yousign_procedure_id IS 'ID de la procédure Yousign';
COMMENT ON COLUMN public.signature_procedures.signature_link IS 'Lien de signature pour le client';
COMMENT ON COLUMN public.signature_procedures.signed_file_id IS 'Référence vers le PDF signé final';

-- RLS Policies
ALTER TABLE public.signature_procedures ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout voir
CREATE POLICY "Admin users can view all signature procedures"
ON public.signature_procedures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('Global Admin', 'Manager', 'Commercial')
  )
);

-- Admins peuvent créer
CREATE POLICY "Admin users can create signature procedures"
ON public.signature_procedures
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('Global Admin', 'Manager', 'Commercial')
  )
);

-- Admins peuvent mettre à jour
CREATE POLICY "Admin users can update signature procedures"
ON public.signature_procedures
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.role IN ('Global Admin', 'Manager', 'Commercial')
  )
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_signature_procedures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER signature_procedures_updated_at
BEFORE UPDATE ON public.signature_procedures
FOR EACH ROW
EXECUTE FUNCTION update_signature_procedures_updated_at();
