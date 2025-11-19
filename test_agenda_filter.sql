-- Test du filtre utilisateur dans l'Agenda
-- Ce script vérifie que les rendez-vous, appels et tâches sont correctement filtrés par user_id

-- 1. Liste des utilisateurs avec leurs IDs
SELECT 
  'USERS' as type,
  id as internal_id,
  user_id as auth_user_id,
  name,
  email,
  role
FROM public.users
ORDER BY name;

-- 2. Rendez-vous assignés à Jack (82be903d-...)
SELECT 
  'APPOINTMENTS' as type,
  a.id,
  a.title,
  a.start_time,
  a.assigned_user_id,
  u.name as assigned_to,
  p.first_name || ' ' || p.last_name as prospect_name
FROM public.appointments a
LEFT JOIN public.users u ON u.user_id = a.assigned_user_id
LEFT JOIN public.prospects p ON p.id = a.contact_id
WHERE a.assigned_user_id = '82be903d-fa16-4a64-8a95-c6c65982cba4'
ORDER BY a.start_time DESC
LIMIT 10;

-- 3. Appels assignés à Jack
SELECT 
  'CALLS' as type,
  c.id,
  c.title,
  c.start_time,
  c.assigned_user_id,
  u.name as assigned_to,
  p.first_name || ' ' || p.last_name as prospect_name
FROM public.calls c
LEFT JOIN public.users u ON u.user_id = c.assigned_user_id
LEFT JOIN public.prospects p ON p.id = c.contact_id
WHERE c.assigned_user_id = '82be903d-fa16-4a64-8a95-c6c65982cba4'
ORDER BY c.start_time DESC
LIMIT 10;

-- 4. Tâches assignées à Jack
SELECT 
  'TASKS' as type,
  t.id,
  t.title,
  t.start_time,
  t.assigned_user_id,
  t.status,
  u.name as assigned_to,
  p.first_name || ' ' || p.last_name as prospect_name
FROM public.tasks t
LEFT JOIN public.users u ON u.user_id = t.assigned_user_id
LEFT JOIN public.prospects p ON p.id = t.contact_id
WHERE t.assigned_user_id = '82be903d-fa16-4a64-8a95-c6c65982cba4'
ORDER BY t.start_time DESC
LIMIT 10;

-- 5. Vérification: Y a-t-il des activités avec assigned_user_id = users.id (ERREUR)?
SELECT 
  'POTENTIAL_BUGS' as type,
  'appointments' as table_name,
  COUNT(*) as count
FROM public.appointments a
WHERE EXISTS (
  SELECT 1 FROM public.users u 
  WHERE u.id = a.assigned_user_id 
  AND u.user_id != a.assigned_user_id
)
UNION ALL
SELECT 
  'POTENTIAL_BUGS' as type,
  'calls' as table_name,
  COUNT(*) as count
FROM public.calls c
WHERE EXISTS (
  SELECT 1 FROM public.users u 
  WHERE u.id = c.assigned_user_id 
  AND u.user_id != c.assigned_user_id
)
UNION ALL
SELECT 
  'POTENTIAL_BUGS' as type,
  'tasks' as table_name,
  COUNT(*) as count
FROM public.tasks t
WHERE EXISTS (
  SELECT 1 FROM public.users u 
  WHERE u.id = t.assigned_user_id 
  AND u.user_id != t.assigned_user_id
);
