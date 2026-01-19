-- ============================================================================
-- SÉCURISATION RLS : cosigner_invite_tokens
-- ============================================================================
-- OBJECTIF: Bloquer accès public direct, remplacer par RPC sécurisée
-- DATE: 19 janvier 2026
-- PHASE: 1 - CRITIQUE (conformité multi-tenant EVATIME)
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : SUPPRIMER LES POLICIES DANGEREUSES
-- ============================================================================

-- ❌ Supprimer la policy publique permissive (USING true)
DROP POLICY IF EXISTS "Public can read own token" ON public.cosigner_invite_tokens;

-- ❌ Supprimer la policy admin non-scopée organization
DROP POLICY IF EXISTS "Admins can view all tokens" ON public.cosigner_invite_tokens;

COMMENT ON TABLE public.cosigner_invite_tokens IS 
'⚠️ SÉCURISÉ - Accès uniquement via RPC get_cosigner_token_info() ou admins org-scopés';

-- ============================================================================
-- ÉTAPE 2 : CRÉER LA FONCTION RPC SÉCURISÉE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_cosigner_token_info(p_token TEXT)
RETURNS TABLE (
  signature_procedure_id UUID,
  signer_email TEXT,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  is_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER -- ⚠️ Exécute avec droits du créateur (bypass RLS)
SET search_path = public
AS $$
BEGIN
  -- 🔒 VÉRIFICATION 1 : Token existe
  IF p_token IS NULL OR p_token = '' THEN
    RAISE EXCEPTION 'Token manquant';
  END IF;

  -- 🔒 VÉRIFICATION 2 : Token exact + non expiré
  RETURN QUERY
  SELECT 
    cit.signature_procedure_id,
    cit.signer_email,
    cit.expires_at,
    cit.used_at,
    -- Calculer validité
    (cit.expires_at > NOW()) AS is_valid
  FROM public.cosigner_invite_tokens cit
  WHERE cit.token = p_token -- ✅ Filtre exact (pas de scan)
  LIMIT 1; -- ✅ Un seul résultat max

  -- Si aucun résultat, pas d'erreur (retourne vide)
  -- L'appelant gère "token invalide"
END;
$$;

-- Commentaire
COMMENT ON FUNCTION public.get_cosigner_token_info(TEXT) IS 
'RPC sécurisée pour valider un token de co-signataire. Retourne infos minimales. Utilisée par CosignerSignaturePage.';

-- ============================================================================
-- ÉTAPE 3 : POLICY SELECT POUR ADMINS (ORG-SCOPÉ)
-- ============================================================================

-- ✅ Admins peuvent voir les tokens de LEUR organisation
CREATE POLICY "Admins can view org tokens"
ON public.cosigner_invite_tokens
FOR SELECT
TO authenticated
USING (
  -- Vérifier que l'utilisateur est admin ET dans la bonne org
  EXISTS (
    SELECT 1 
    FROM public.users u
    INNER JOIN public.signature_procedures sp ON sp.id = cosigner_invite_tokens.signature_procedure_id
    INNER JOIN public.prospects p ON p.id = sp.prospect_id
    WHERE u.user_id = auth.uid()
      AND u.role IN ('Global Admin', 'Manager', 'Commercial')
      AND p.organization_id = u.organization_id -- ✅ Isolation multi-tenant
  )
  OR
  -- ✅ Platform admin peut tout voir
  EXISTS (
    SELECT 1 
    FROM public.users u
    WHERE u.user_id = auth.uid()
      AND u.role = 'platform_admin'
  )
);

-- ============================================================================
-- ÉTAPE 4 : BLOQUER TOUTE ÉCRITURE DIRECTE
-- ============================================================================

-- ❌ AUCUNE policy INSERT/UPDATE/DELETE pour PostgREST
-- Les Edge Functions utilisent SERVICE_ROLE_KEY (bypass RLS)

COMMENT ON COLUMN public.cosigner_invite_tokens.token IS 
'Token unique. Accès lecture via RPC get_cosigner_token_info() UNIQUEMENT.';

-- ============================================================================
-- VÉRIFICATIONS POST-DÉPLOIEMENT
-- ============================================================================

-- Test 1 : Vérifier que RLS est activé
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'cosigner_invite_tokens') THEN
    RAISE EXCEPTION '❌ RLS pas activé sur cosigner_invite_tokens !';
  END IF;
  RAISE NOTICE '✅ RLS activé sur cosigner_invite_tokens';
END $$;

-- Test 2 : Compter les policies
DO $$
DECLARE
  policy_count INT;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'cosigner_invite_tokens';
  
  IF policy_count <> 1 THEN
    RAISE WARNING '⚠️ Nombre de policies inattendu: % (attendu: 1)', policy_count;
  ELSE
    RAISE NOTICE '✅ Nombre de policies correct: %', policy_count;
  END IF;
END $$;

-- Test 3 : Lister les policies actives
SELECT 
  policyname,
  cmd,
  roles,
  qual IS NOT NULL AS has_using_clause,
  with_check IS NOT NULL AS has_with_check_clause
FROM pg_policies
WHERE tablename = 'cosigner_invite_tokens'
ORDER BY policyname;

-- ============================================================================
-- RÉSUMÉ DES CHANGEMENTS
-- ============================================================================

/*
AVANT (DANGEREUX):
- Policy publique USING (true) → Tout le monde lit tous les tokens ❌
- Policy admin sans filtre organization_id ❌

APRÈS (SÉCURISÉ):
- ✅ Accès public via RPC get_cosigner_token_info() uniquement
- ✅ RPC valide expiration + retourne données minimales
- ✅ Admins : accès filtré par organization_id (via JOIN)
- ✅ Platform admin : accès total
- ✅ Aucune écriture directe depuis PostgREST

IMPACT FRONTEND:
⚠️ CosignerSignaturePage.jsx devra être modifié pour :
  - Remplacer SELECT direct par appel RPC
  - Gérer is_valid retourné par la RPC
*/
