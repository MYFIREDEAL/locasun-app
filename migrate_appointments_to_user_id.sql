-- =====================================================
-- MIGRATION COMPLÈTE: appointments.assigned_user_id
-- De users.id (PK) vers users.user_id (auth UUID)
-- =====================================================

-- Étape 1: Vérifier les données existantes
SELECT 
  a.id,
  a.title,
  a.assigned_user_id,
  u.name as "Current User (by PK)",
  u.user_id as "Should be (auth UUID)"
FROM appointments a
LEFT JOIN users u ON u.id = a.assigned_user_id
ORDER BY a.created_at DESC
LIMIT 10;

-- Étape 2: Supprimer la FK temporairement
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS appointments_assigned_user_id_fkey;

-- Étape 3: Migrer les données (PK → auth UUID)
-- Pour chaque appointment, remplacer users.id par users.user_id
UPDATE public.appointments
SET assigned_user_id = u.user_id
FROM public.users u
WHERE appointments.assigned_user_id = u.id;

-- Étape 4: Vérifier la migration
SELECT 
  a.id,
  a.title,
  a.assigned_user_id,
  u.name as "User Name",
  u.email as "User Email"
FROM appointments a
LEFT JOIN users u ON u.user_id = a.assigned_user_id
ORDER BY a.created_at DESC
LIMIT 10;

-- Étape 5: Créer la nouvelle FK pointant vers users.user_id
ALTER TABLE public.appointments
ADD CONSTRAINT appointments_assigned_user_id_fkey 
FOREIGN KEY (assigned_user_id) 
REFERENCES public.users(user_id)
ON DELETE CASCADE;

-- Étape 6: Vérification finale de la FK
SELECT 
  conname as "Constraint Name",
  conrelid::regclass as "Table",
  a.attname as "Column",
  confrelid::regclass as "Referenced Table",
  af.attname as "Referenced Column"
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conname = 'appointments_assigned_user_id_fkey';

-- ✅ SUCCESS: Les appointments utilisent maintenant users.user_id (auth UUID)
-- ✅ Les RLS policies fonctionneront correctement avec auth.uid()
