-- =====================================================
-- VÉRIFIER RLS POLICIES pour appointments
-- =====================================================

-- 1. Vérifier que RLS est activé sur appointments
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'appointments';

-- 2. Lister TOUTES les policies sur appointments
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
WHERE schemaname = 'public' 
  AND tablename = 'appointments'
ORDER BY policyname;

-- 3. Tester INSERT avec type 'call'
-- (simulation - ne s'exécute pas vraiment)
EXPLAIN (FORMAT TEXT) 
INSERT INTO appointments (
  title,
  start_time,
  end_time,
  type,
  status,
  assigned_user_id
) VALUES (
  'Test Call',
  NOW(),
  NOW() + INTERVAL '30 minutes',
  'call',
  'pending',
  (SELECT id FROM users LIMIT 1)
);

-- 4. Tester INSERT avec type 'task'
EXPLAIN (FORMAT TEXT) 
INSERT INTO appointments (
  title,
  start_time,
  end_time,
  type,
  status,
  assigned_user_id
) VALUES (
  'Test Task',
  NOW(),
  NOW() + INTERVAL '1 day',
  'task',
  'pending',
  (SELECT id FROM users LIMIT 1)
);

-- 5. Vérifier les contraintes sur le champ 'type'
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.appointments'::regclass
  AND contype = 'c'; -- CHECK constraints

-- 6. Voir les valeurs de type actuellement en base
SELECT DISTINCT type, COUNT(*) as count
FROM public.appointments
GROUP BY type
ORDER BY type;
