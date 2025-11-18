-- =====================================================
-- FIX RLS: Permettre aux clients de mettre à jour le status de leurs formulaires
-- =====================================================
-- Date: 18 novembre 2025
-- Problème: Les clients ne peuvent pas UPDATE client_form_panels.status
-- Impact: updateClientFormPanel() échoue côté client (status ne change pas)
-- Solution: Ajouter politique UPDATE pour les clients
-- =====================================================

-- ✅ ÉTAPE 1: Ajouter la politique UPDATE pour les clients
CREATE POLICY "Clients can update their own form panel status"
ON public.client_form_panels
FOR UPDATE
TO authenticated
USING (
    prospect_id IN (
        SELECT id FROM public.prospects 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    prospect_id IN (
        SELECT id FROM public.prospects 
        WHERE user_id = auth.uid()
    )
);

-- ✅ ÉTAPE 2: Vérifier que Real-time est activé sur chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- =====================================================
-- VÉRIFICATION
-- =====================================================

-- Lister toutes les politiques sur client_form_panels
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'client_form_panels'
ORDER BY policyname;

-- Résultat attendu:
-- 1. "Admins can manage all form panels" (FOR ALL)
-- 2. "Clients can view their own form panels" (FOR SELECT)
-- 3. "Clients can update their own form panel status" (FOR UPDATE) ✅ NOUVEAU

-- =====================================================
-- TEST DE LA POLITIQUE
-- =====================================================

-- Test 1: Vérifier qu'un client peut UPDATE son propre panel
-- Se connecter en tant que client (auth.uid() = user_id du prospect)
-- Exécuter:
/*
UPDATE public.client_form_panels
SET status = 'submitted', user_override = 'submitted'
WHERE prospect_id = (SELECT id FROM public.prospects WHERE user_id = auth.uid() LIMIT 1)
RETURNING *;
*/

-- Test 2: Vérifier qu'un client NE PEUT PAS UPDATE le panel d'un autre
-- Devrait échouer avec "permission denied"
/*
UPDATE public.client_form_panels
SET status = 'submitted'
WHERE prospect_id != (SELECT id FROM public.prospects WHERE user_id = auth.uid() LIMIT 1)
LIMIT 1;
*/

-- =====================================================
-- ROLLBACK (si besoin)
-- =====================================================
/*
DROP POLICY IF EXISTS "Clients can update their own form panel status" ON public.client_form_panels;
*/
