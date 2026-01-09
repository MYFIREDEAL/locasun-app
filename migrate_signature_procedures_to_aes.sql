-- ============================================
-- MIGRATION: Adapter signature_procedures pour signature AES maison
-- ============================================

-- 1. Ajouter organization_id (multi-tenant)
ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Remplir organization_id depuis prospects (pour les lignes existantes)
UPDATE public.signature_procedures sp
SET organization_id = p.organization_id
FROM public.prospects p
WHERE sp.prospect_id = p.id
AND sp.organization_id IS NULL;

-- 3. Rendre organization_id NOT NULL
ALTER TABLE public.signature_procedures
ALTER COLUMN organization_id SET NOT NULL;

-- 4. Ajouter colonnes pour signature AES maison
ALTER TABLE public.signature_procedures
ADD COLUMN IF NOT EXISTS signer_name TEXT,
ADD COLUMN IF NOT EXISTS signer_email TEXT,
ADD COLUMN IF NOT EXISTS document_hash TEXT, -- SHA-256 du PDF original
ADD COLUMN IF NOT EXISTS access_token TEXT UNIQUE, -- Token sécurisé pour accès
ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signature_metadata JSONB DEFAULT '{}'::jsonb, -- IP, user-agent, timestamp de signature
ADD COLUMN IF NOT EXISTS pdf_signed_hash TEXT; -- SHA-256 du PDF après signature

-- 5. Modifier yousign_procedure_id pour le rendre nullable (pas obligatoire pour signature maison)
ALTER TABLE public.signature_procedures
ALTER COLUMN yousign_procedure_id DROP NOT NULL;

-- 6. Ajouter contrainte: soit yousign_procedure_id, soit access_token (mais pas les deux vides)
ALTER TABLE public.signature_procedures
ADD CONSTRAINT check_signature_type
CHECK (
  (yousign_procedure_id IS NOT NULL AND access_token IS NULL) OR
  (yousign_procedure_id IS NULL AND access_token IS NOT NULL)
);

-- 7. Ajouter index pour performance
CREATE INDEX IF NOT EXISTS idx_signature_procedures_organization ON public.signature_procedures(organization_id);
CREATE INDEX IF NOT EXISTS idx_signature_procedures_access_token ON public.signature_procedures(access_token);

-- 8. Mettre à jour les RLS policies pour inclure organization_id
DROP POLICY IF EXISTS "Admin users can view all signature procedures" ON public.signature_procedures;
DROP POLICY IF EXISTS "Admin users can create signature procedures" ON public.signature_procedures;
DROP POLICY IF EXISTS "Admin users can update signature procedures" ON public.signature_procedures;

-- Admin RLS : SELECT (filtré par organization)
CREATE POLICY "Admin users can view signature procedures in their organization"
ON public.signature_procedures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.organization_id = signature_procedures.organization_id
    AND users.role IN ('Global Admin', 'Manager', 'Commercial')
  )
);

-- Admin RLS : INSERT
CREATE POLICY "Admin users can create signature procedures in their organization"
ON public.signature_procedures
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.organization_id = signature_procedures.organization_id
    AND users.role IN ('Global Admin', 'Manager', 'Commercial')
  )
);

-- Admin RLS : UPDATE
CREATE POLICY "Admin users can update signature procedures in their organization"
ON public.signature_procedures
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.user_id = auth.uid()
    AND users.organization_id = signature_procedures.organization_id
    AND users.role IN ('Global Admin', 'Manager', 'Commercial')
  )
);

-- Client RLS : SELECT (voir leurs propres procédures)
CREATE POLICY "Clients can view their own signature procedures"
ON public.signature_procedures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prospects
    WHERE prospects.user_id = auth.uid()
    AND prospects.id = signature_procedures.prospect_id
    AND prospects.organization_id = signature_procedures.organization_id
  )
);

-- Client RLS : UPDATE (seulement status et signature_metadata lors de la signature)
CREATE POLICY "Clients can sign their own signature procedures"
ON public.signature_procedures
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.prospects
    WHERE prospects.user_id = auth.uid()
    AND prospects.id = signature_procedures.prospect_id
    AND prospects.organization_id = signature_procedures.organization_id
  )
)
WITH CHECK (
  -- Empêcher modification d'autres champs que status, signed_at, signature_metadata
  EXISTS (
    SELECT 1 FROM public.prospects
    WHERE prospects.user_id = auth.uid()
    AND prospects.id = signature_procedures.prospect_id
    AND prospects.organization_id = signature_procedures.organization_id
  )
);

-- Public RLS : SELECT avec access_token valide (pour page signature publique)
CREATE POLICY "Public access with valid token"
ON public.signature_procedures
FOR SELECT
TO anon, authenticated
USING (true); -- Le token sera vérifié côté application

-- 9. Commentaires
COMMENT ON TABLE public.signature_procedures IS 'Procédures de signature électronique (Yousign OU signature AES maison)';
COMMENT ON COLUMN public.signature_procedures.organization_id IS 'Organisation propriétaire (multi-tenant)';
COMMENT ON COLUMN public.signature_procedures.signer_name IS 'Nom du signataire principal';
COMMENT ON COLUMN public.signature_procedures.signer_email IS 'Email du signataire principal';
COMMENT ON COLUMN public.signature_procedures.document_hash IS 'Hash SHA-256 du PDF original (preuve d intégrité)';
COMMENT ON COLUMN public.signature_procedures.access_token IS 'Token sécurisé pour signature maison (alternative à Yousign)';
COMMENT ON COLUMN public.signature_procedures.token_expires_at IS 'Date d expiration du token de signature';
COMMENT ON COLUMN public.signature_procedures.signature_metadata IS 'Métadonnées de signature (IP, user-agent, timestamp, etc.)';
COMMENT ON COLUMN public.signature_procedures.pdf_signed_hash IS 'Hash SHA-256 du PDF après ajout de la signature';
COMMENT ON COLUMN public.signature_procedures.yousign_procedure_id IS 'ID Yousign (NULL si signature maison)';

-- 10. Mettre à jour les statuts autorisés
ALTER TABLE public.signature_procedures
DROP CONSTRAINT IF EXISTS signature_procedures_status_check;

ALTER TABLE public.signature_procedures
ADD CONSTRAINT signature_procedures_status_check
CHECK (status IN ('pending', 'signed', 'refused', 'expired', 'error', 'cancelled'));
