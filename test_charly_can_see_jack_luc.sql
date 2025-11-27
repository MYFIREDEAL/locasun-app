-- =====================================================
-- TEST : Vérifier que Charly peut voir Jack LUC
-- =====================================================

-- Simuler la session de Charly (remplacer par son auth.uid)
SET LOCAL "request.jwt.claims" TO '{"sub": "e85ff206-87a2-4d63-9f1d-4d97f1842159"}';

-- Cette requête simule ce que useSupabaseUsers() fait
SELECT 
  id,
  user_id,
  name,
  email,
  role
FROM users
ORDER BY name;

-- Résultat ATTENDU (avec la nouvelle policy) :
-- 1. charly (lui-même via "Users can view their own profile")
-- 2. Jack LUC (via "Users can view their authorized users")

-- Si vous ne voyez QUE charly, la policy ne fonctionne pas encore
-- → Déconnectez-vous et reconnectez-vous dans l'app

-- =====================================================
-- Alternative : Vérifier directement les access_rights
-- =====================================================

SELECT 
  c.name AS charly_name,
  c.access_rights->'users' AS authorized_user_ids,
  u.name AS can_see_user,
  u.user_id AS can_see_user_id
FROM users c
CROSS JOIN LATERAL jsonb_array_elements_text(c.access_rights->'users') AS auth_id
JOIN users u ON u.user_id = auth_id::uuid
WHERE c.name = 'charly';

-- Résultat ATTENDU :
-- charly_name | authorized_user_ids | can_see_user | can_see_user_id
-- ------------|---------------------|--------------|------------------
-- charly      | ["82be903d..."]     | Jack LUC     | 82be903d-9600...
