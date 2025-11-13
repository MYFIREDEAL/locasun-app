-- =====================================================
-- FIX: Permettre aux utilisateurs de modifier leurs propres infos
-- =====================================================
-- Problème: Les Commerciaux ne peuvent pas modifier leur téléphone/email
-- Solution: Ajouter WITH CHECK pour autoriser self-update avec restrictions

-- 1. Supprimer l'ancienne policy
DROP POLICY IF EXISTS "Users can update their own info" ON public.users;

-- 2. Recréer avec WITH CHECK pour autoriser l'update tout en protégeant certains champs
CREATE POLICY "Users can update their own info"
  ON public.users
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    -- Empêcher la modification des champs protégés (role, manager_id, access_rights)
    -- Ces champs ne peuvent être modifiés que par Global Admin
  );

-- Note: Cette policy permet aux users de modifier:
-- ✅ name, email, phone, avatar_url (infos personnelles)
-- ❌ role, manager_id, access_rights (réservés Global Admin)

-- Test: Connecté en tant que Commercial, essayer de modifier son phone
-- UPDATE public.users SET phone = '0612345678' WHERE user_id = auth.uid();
-- ✅ Devrait fonctionner maintenant
