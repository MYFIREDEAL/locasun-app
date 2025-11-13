-- =====================================================
-- FIX: Permettre aux Global Admin de modifier les utilisateurs
-- =====================================================
-- Problème: Global Admin ne peut pas modifier les profils des autres users
-- Erreur: 406 + "Cannot coerce the result to a single JSON object"
-- Cause: Policy RLS bloque l'UPDATE si l'user modifie quelqu'un d'autre

-- 1. Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own info" ON public.users;
DROP POLICY IF EXISTS "Global Admin can manage all users" ON public.users;

-- 2. Policy SELECT: Voir son propre profil OU tous les profils si Global Admin
CREATE POLICY "Users can view profiles"
  ON public.users
  FOR SELECT
  USING (
    user_id = auth.uid() -- Je peux voir mon profil
    OR 
    (SELECT role FROM public.users WHERE user_id = auth.uid()) = 'Global Admin' -- Global Admin voit tout
  );

-- 3. Policy UPDATE: Modifier son propre profil OU n'importe quel profil si Global Admin
CREATE POLICY "Users can update profiles"
  ON public.users
  FOR UPDATE
  USING (
    user_id = auth.uid() -- Je peux modifier mon profil
    OR 
    (SELECT role FROM public.users WHERE user_id = auth.uid()) = 'Global Admin' -- Global Admin modifie tout
  )
  WITH CHECK (
    user_id = auth.uid() -- Je peux modifier mon profil
    OR 
    (SELECT role FROM public.users WHERE user_id = auth.uid()) = 'Global Admin' -- Global Admin modifie tout
  );

-- 4. Policy INSERT: Seuls les Global Admin peuvent créer des users
CREATE POLICY "Global Admin can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE user_id = auth.uid()) = 'Global Admin'
  );

-- 5. Policy DELETE: Seuls les Global Admin peuvent supprimer des users
CREATE POLICY "Global Admin can delete users"
  ON public.users
  FOR DELETE
  USING (
    (SELECT role FROM public.users WHERE user_id = auth.uid()) = 'Global Admin'
  );

-- =====================================================
-- TESTS
-- =====================================================

-- Test 1: Connecté en tant que Charly (Commercial)
-- SET request.jwt.claims.sub = 'acd6832b-94b0-4123-96ce-178888d1b685';
-- UPDATE public.users SET phone = '0612345678' WHERE user_id = 'acd6832b-94b0-4123-96ce-178888d1b685';
-- ✅ Devrait fonctionner (self-update)

-- Test 2: Connecté en tant que Jack Luc (Global Admin)
-- SET request.jwt.claims.sub = 'cd73c227-6d2d-4997-bc33-16833f19a34c';
-- UPDATE public.users SET phone = '0647384738' WHERE user_id = 'acd6832b-94b0-4123-96ce-178888d1b685';
-- ✅ Devrait fonctionner (Global Admin peut modifier Charly)

-- =====================================================
-- RÉSULTAT ATTENDU
-- =====================================================
-- ✅ Charly (Commercial) peut modifier son propre téléphone/email
-- ✅ Jack Luc (Global Admin) peut modifier n'importe quel utilisateur
-- ✅ Jack Luc peut changer le rôle de Charly
-- ✅ Plus d'erreur 406

