-- =====================================================
-- DIAGNOSTIC: Chat Messages RLS
-- Date: 15 novembre 2025
-- Objectif: Vérifier l'état des policies et diagnostiquer les erreurs 403
-- =====================================================

-- 1. Vérifier que RLS est activé
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'chat_messages';
-- ✅ Attendu: rowsecurity = true

-- 2. Lister toutes les policies actuelles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS "using_clause",
  with_check AS "with_check_clause"
FROM pg_policies
WHERE tablename = 'chat_messages'
ORDER BY cmd, policyname;

-- 3. Compter les messages existants
SELECT 
  COUNT(*) AS total_messages,
  COUNT(DISTINCT prospect_id) AS distinct_prospects,
  COUNT(DISTINCT project_type) AS distinct_projects,
  sender,
  COUNT(*) AS messages_by_sender
FROM public.chat_messages
GROUP BY sender;

-- 4. Vérifier l'utilisateur actuel
SELECT 
  auth.uid() AS "current_user_id",
  (SELECT email FROM auth.users WHERE id = auth.uid()) AS "email",
  (SELECT role FROM public.users WHERE user_id = auth.uid()) AS "role_in_users_table",
  (SELECT name FROM public.users WHERE user_id = auth.uid()) AS "name";

-- 5. Tester l'accès SELECT (doit fonctionner)
SELECT 
  id,
  prospect_id,
  project_type,
  sender,
  text,
  created_at
FROM public.chat_messages
ORDER BY created_at DESC
LIMIT 5;

-- 6. Vérifier les prospects accessibles
SELECT 
  p.id,
  p.name,
  p.owner_id,
  u.name AS owner_name,
  (p.owner_id = auth.uid()) AS "je_suis_proprietaire",
  (EXISTS (SELECT 1 FROM public.users WHERE user_id = auth.uid())) AS "je_suis_admin"
FROM public.prospects p
LEFT JOIN public.users u ON u.user_id = p.owner_id
LIMIT 10;

-- 7. Simuler une insertion (TEST - ne pas exécuter en production)
-- ATTENTION: Décommenter uniquement pour tester
-- INSERT INTO public.chat_messages (
--   prospect_id,
--   project_type,
--   sender,
--   text
-- ) VALUES (
--   (SELECT id FROM public.prospects LIMIT 1), -- Premier prospect
--   'ACC',
--   'admin',
--   'Test message from diagnostic script'
-- );

-- =====================================================
-- INTERPRÉTATION DES RÉSULTATS
-- =====================================================

-- Si Query 1 retourne "rowsecurity = true" ✅
--   → RLS est bien activé

-- Si Query 2 retourne 5 policies ✅
--   → Policies correctement configurées
--   → Doit inclure:
--      - "Admins can view all chat messages" (SELECT)
--      - "Admins can send chat messages" (INSERT)
--      - "Admins can update chat messages" (UPDATE)
--      - "Clients can view their own chat" (SELECT)
--      - "Clients can send messages" (INSERT)

-- Si Query 4 retourne un role ✅
--   → Vous êtes bien identifié comme admin
--   → role doit être: 'Global Admin', 'Manager', ou 'Commercial'

-- Si Query 5 retourne des messages ✅
--   → SELECT fonctionne (policy OK)

-- Si Query 5 retourne "permission denied" ❌
--   → Policy SELECT manquante ou incorrecte

-- Si Query 7 (INSERT test) retourne "permission denied" ❌
--   → Policy INSERT manquante ou incorrecte
--   → Exécuter fix_chat_messages_rls.sql

-- =====================================================
-- ACTIONS CORRECTIVES
-- =====================================================

-- Si aucune policy n'existe:
--   → Exécuter: fix_chat_messages_rls.sql

-- Si role est NULL dans Query 4:
--   → Vérifier que vous êtes dans la table users:
--   SELECT * FROM public.users WHERE user_id = auth.uid();

-- Si prospect_id invalide:
--   → Utiliser un vrai UUID de la table prospects

-- =====================================================
-- RÉSULTAT ATTENDU (SANS ERREUR)
-- =====================================================

-- Query 1: rowsecurity = true
-- Query 2: 5 policies listées
-- Query 3: Statistiques des messages
-- Query 4: Votre user_id + role + email
-- Query 5: 5 derniers messages (ou 0 si base vide)
-- Query 6: Liste des prospects accessibles
-- Query 7: (Si décommenté) INSERT réussi

-- =====================================================
