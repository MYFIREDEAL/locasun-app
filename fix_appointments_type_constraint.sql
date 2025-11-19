-- =====================================================
-- FIX: Ajouter 'call' et 'task' aux types autorisés
-- =====================================================

-- 1. Supprimer l'ancienne contrainte
ALTER TABLE appointments 
DROP CONSTRAINT IF EXISTS appointments_type_check;

-- 2. Recréer la contrainte avec les nouveaux types
ALTER TABLE appointments
ADD CONSTRAINT appointments_type_check 
CHECK (type IN ('physical', 'virtual', 'call', 'task'));

-- 3. Vérifier que ça marche
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.appointments'::regclass
  AND conname = 'appointments_type_check';

-- 4. Tester un INSERT avec type 'call'
-- Décommenter pour tester (attention: va créer une vraie ligne)
/*
INSERT INTO appointments (
  title,
  start_time,
  end_time,
  type,
  status,
  assigned_user_id
) VALUES (
  '📞 Test Call',
  NOW(),
  NOW() + INTERVAL '30 minutes',
  'call',
  'pending',
  (SELECT id FROM users LIMIT 1)
);
*/

-- 5. Tester un INSERT avec type 'task'
-- Décommenter pour tester (attention: va créer une vraie ligne)
/*
INSERT INTO appointments (
  title,
  start_time,
  end_time,
  type,
  status,
  assigned_user_id
) VALUES (
  '✅ Test Task',
  NOW(),
  NOW() + INTERVAL '1 day',
  'task',
  'pending',
  (SELECT id FROM users LIMIT 1)
);
*/
