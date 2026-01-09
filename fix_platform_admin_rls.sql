-- 🔧 FIX: Permettre au platform_admin de lire sa propre ligne dans public.users
-- Problème: Erreur 400/406 lors de la requête users?user_id=eq.66adc899...
-- Cause: RLS bloque l'accès car organization_id = NULL

-- ✅ SOLUTION: Ajouter une policy qui permet à platform_admin de lire sa propre ligne

-- 1️⃣ Vérifier les policies existantes sur public.users
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
WHERE tablename = 'users'
ORDER BY policyname;

-- 2️⃣ Créer une policy permettant à platform_admin de lire sa propre ligne
DROP POLICY IF EXISTS "platform_admin_read_self" ON public.users;

CREATE POLICY "platform_admin_read_self"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Platform admin peut lire sa propre ligne (même avec organization_id NULL)
  (role = 'platform_admin' AND user_id = auth.uid())
  OR
  -- Ou autre logique RLS existante (à adapter selon votre schema)
  (organization_id IS NOT NULL AND organization_id IN (
    SELECT organization_id FROM public.users WHERE user_id = auth.uid()
  ))
);

-- 3️⃣ Vérification: Tester la lecture avec l'UUID de Jack
-- Exécuter cette requête en tant que Jack (après connexion)
-- SELECT * FROM public.users WHERE user_id = '66adc899-0d3e-46f6-87ec-4c73b4fe4e26';

-- 4️⃣ (OPTIONNEL) Si la policy ci-dessus est trop permissive,
-- créer une policy séparée uniquement pour platform_admin
DROP POLICY IF EXISTS "platform_admin_full_access" ON public.users;

CREATE POLICY "platform_admin_full_access"
ON public.users
FOR ALL
TO authenticated
USING (
  -- Si l'utilisateur connecté est platform_admin, accès total
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE user_id = auth.uid() 
    AND role = 'platform_admin'
  )
);

-- ✅ RÉSUMÉ
-- Policy 1: platform_admin peut lire sa propre ligne
-- Policy 2 (optionnel): platform_admin a accès à TOUTES les lignes de users
-- Choisir selon vos besoins de sécurité
