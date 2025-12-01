-- =====================================================
-- TEST: Vérifier que le fix marche pour TOUS les users
-- =====================================================

-- 1. Voir TOUS les users avec leurs 2 IDs
SELECT 
  id as "users.id (PK pour assignments)",
  user_id as "users.user_id (auth UUID)",
  name,
  role
FROM public.users
ORDER BY name;

-- 2. Tester la fonction AVANT le fix (retourne seulement user_id)
-- SELECT * FROM get_accessible_users();

-- 3. Après avoir exécuté le fix, tester à nouveau
-- La fonction devrait maintenant retourner id + user_id pour CHAQUE user
SELECT * FROM get_accessible_users();

-- 4. Vérifier qu'on peut bien faire le matching
SELECT 
  gau.id as "ID retourné par fonction",
  gau.user_id as "user_id retourné par fonction",
  gau.name,
  u.id as "ID dans table users",
  u.user_id as "user_id dans table users",
  CASE 
    WHEN gau.id = u.id AND gau.user_id = u.user_id THEN '✅ MATCH PARFAIT'
    ELSE '❌ PROBLÈME'
  END as "Vérification"
FROM get_accessible_users() gau
JOIN public.users u ON gau.name = u.name;
