-- 🔄 ROLLBACK SUPABASE - Supprimer toutes les modifications Magic Link

-- ========================================
-- 1. SUPPRIMER LES RPC FUNCTIONS
-- ========================================

-- Supprimer la fonction RPC pour création prospect avec Magic Link
DROP FUNCTION IF EXISTS create_prospect_with_magic_link(jsonb);

-- Supprimer la fonction RPC pour inscription publique anonyme
DROP FUNCTION IF EXISTS create_prospect_public(text, text, text, text, text, text[], text);

-- ========================================
-- 2. SUPPRIMER LES POLITIQUES RLS (si ajoutées)
-- ========================================

-- Supprimer la politique permettant l'insertion anonyme (si elle existe)
DROP POLICY IF EXISTS "allow_public_prospect_registration" ON public.prospects;

-- Supprimer la politique pour création via RPC (si elle existe)
DROP POLICY IF EXISTS "allow_rpc_prospect_insert" ON public.prospects;

-- ========================================
-- 3. NETTOYER LES PROSPECTS ORPHELINS
-- ========================================

-- ATTENTION: Cette commande supprime les prospects sans compte Auth
-- Décommentez UNIQUEMENT si vous voulez vraiment les supprimer

-- DELETE FROM public.prospects WHERE user_id IS NULL;

-- Alternative: Lier les prospects orphelins à un admin par défaut
-- UPDATE public.prospects 
-- SET owner_id = '82be903d-9600-4c53-9cd4-113bfaaac12e' 
-- WHERE user_id IS NULL AND owner_id IS NULL;

-- ========================================
-- 4. VÉRIFICATIONS
-- ========================================

-- Vérifier qu'il ne reste pas de prospects orphelins
SELECT COUNT(*) as prospects_orphelins
FROM public.prospects 
WHERE user_id IS NULL;

-- Vérifier que les fonctions RPC sont bien supprimées
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%prospect%magic%';

-- ========================================
-- 5. (OPTIONNEL) NETTOYER LES COMPTES AUTH ORPHELINS
-- ========================================

-- Voir les comptes Auth qui n'ont ni prospect ni admin associé
-- ATTENTION: À exécuter en mode READ-ONLY d'abord !

SELECT 
  auth.users.id,
  auth.users.email,
  auth.users.created_at,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.users.id) THEN 'ADMIN'
    WHEN EXISTS (SELECT 1 FROM public.prospects WHERE user_id = auth.users.id) THEN 'CLIENT'
    ELSE 'ORPHELIN'
  END as type_compte
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.users.id)
  AND NOT EXISTS (SELECT 1 FROM public.prospects WHERE user_id = auth.users.id)
ORDER BY auth.users.created_at DESC;

-- ⚠️ Pour SUPPRIMER les comptes Auth orphelins (DANGEREUX!)
-- NE PAS EXÉCUTER sans vérification !
-- DELETE FROM auth.users 
-- WHERE id IN (
--   SELECT auth.users.id
--   FROM auth.users
--   WHERE NOT EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.users.id)
--     AND NOT EXISTS (SELECT 1 FROM public.prospects WHERE user_id = auth.users.id)
-- );

-- ========================================
-- ✅ ROLLBACK TERMINÉ
-- ========================================

-- Vérifier l'état final
SELECT 
  'Prospects orphelins' as check_type,
  COUNT(*) as count
FROM public.prospects 
WHERE user_id IS NULL
UNION ALL
SELECT 
  'Fonctions RPC restantes' as check_type,
  COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND (routine_name LIKE '%magic%' OR routine_name LIKE '%create_prospect%');
