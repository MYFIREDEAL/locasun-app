-- =====================================================
-- 🚨 URGENT: Fix politique UPDATE pour table users
-- =====================================================
-- Problème: Charly (Commercial) ne peut pas modifier son propre profil
-- Erreur: 406 + "PGRST116: The result contains 0 rows"
-- Cause: Policy "Users can update their own info" manque WITH CHECK

-- Étape 1: Supprimer l'ancienne policy UPDATE défectueuse
DROP POLICY IF EXISTS "Users can update their own info" ON public.users;

-- Étape 2: Recréer avec USING + WITH CHECK
-- ⚠️ IMPORTANT: Utiliser 'id' pas 'user_id' car le code filtre par public.users.id
CREATE POLICY "Users can update their own info"
  ON public.users
  FOR UPDATE
  USING (
    id IN (
      SELECT id FROM public.users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    id IN (
      SELECT id FROM public.users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- EXPLICATION
-- =====================================================
-- USING (user_id = auth.uid())     → Vérifie que c'est bien mon profil
-- WITH CHECK (user_id = auth.uid()) → Vérifie que je ne modifie pas le user_id
--                                      et autorise le retour de la ligne modifiée

-- =====================================================
-- TEST IMMÉDIAT
-- =====================================================
-- Après avoir exécuté ce script:
-- 1. Rechargez votre app (F5)
-- 2. Connecté en tant que Charly, modifiez votre téléphone
-- 3. ✅ Devrait fonctionner sans erreur 406

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- ✅ Charly peut modifier son téléphone/email/nom
-- ✅ Jack Luc peut aussi modifier son profil
-- ✅ Plus d'erreur 406 sur self-update

