-- ============================================
-- Policy UPDATE pour les PARTENAIRES
-- ============================================
-- Les partenaires (prospects authentifiés) doivent pouvoir mettre à jour
-- leurs propres formulaires (filled_by_role='partner') pour les soumettre.
--
-- Date: 19 février 2026
-- ============================================

-- Créer la policy UPDATE pour les partenaires
CREATE POLICY "partner_update_own_form_panels"
ON client_form_panels
FOR UPDATE
TO authenticated
USING (
  -- Le formulaire doit être destiné au partenaire
  filled_by_role = 'partner' 
  -- ET le prospect_id doit correspondre au prospect authentifié
  AND prospect_id IN (
    SELECT id FROM prospects WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  -- Même conditions pour WITH CHECK (empêche de changer filled_by_role ou prospect_id)
  filled_by_role = 'partner' 
  AND prospect_id IN (
    SELECT id FROM prospects WHERE user_id = auth.uid()
  )
);

-- Vérifier que la policy a été créée
SELECT 
  tablename,
  policyname, 
  cmd,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'client_form_panels' 
  AND policyname = 'partner_update_own_form_panels';
