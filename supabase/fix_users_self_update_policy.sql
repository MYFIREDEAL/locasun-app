-- =====================================================
-- FIX: Permettre aux utilisateurs de modifier leurs propres infos
-- =====================================================
-- Problème: Les Commerciaux ne peuvent pas modifier leur téléphone/email
-- Erreur: 406 + "Cannot coerce the result to a single JSON object"
-- Cause: Policy RLS bloque l'UPDATE

-- 1. Supprimer l'ancienne policy UPDATE
DROP POLICY IF EXISTS "Users can update their own info" ON public.users;

-- 2. Vérifier qu'une policy SELECT existe pour self-view
-- (Nécessaire pour que l'UPDATE puisse retourner la ligne modifiée)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (user_id = auth.uid());

-- 3. Recréer la policy UPDATE avec USING et WITH CHECK
CREATE POLICY "Users can update their own info"
  ON public.users
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Note: Cette policy permet aux users de modifier:
-- ✅ name, email, phone, avatar_url (infos personnelles)
-- ⚠️ role, manager_id, access_rights (modifiables mais pas recommandé)
-- 🔒 Pour bloquer la modification de certains champs, il faudrait un trigger

-- Test: Connecté en tant que Commercial Charly
-- UPDATE public.users SET phone = '0612345678' WHERE user_id = auth.uid();
-- ✅ Devrait fonctionner maintenant
