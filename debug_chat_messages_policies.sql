-- Debug: Vérifier toutes les policies sur chat_messages et chercher "user_id"
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual as "USING expression",
  with_check as "WITH CHECK expression"
FROM pg_policies
WHERE tablename = 'chat_messages'
ORDER BY policyname;

-- Vérifier si une policy fait référence à user_id
SELECT 
  policyname,
  pg_get_expr(polqual, polrelid) as using_clause,
  pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'chat_messages'
  AND (
    pg_get_expr(polqual, polrelid) LIKE '%user_id%'
    OR pg_get_expr(polwithcheck, polrelid) LIKE '%user_id%'
  );
