-- =====================================================
-- DIAGNOSTIC POLICIES - TABLE PROSPECTS
-- =====================================================

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
WHERE tablename = 'prospects'
ORDER BY cmd, policyname;
