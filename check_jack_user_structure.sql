-- Vérifier la structure du user Jack dans public.users
-- Auth UUID: 82be903d-9600-4c53-9cd4-113bfaaac12e
-- ID retourné par query: cd73c227-6d2d-4997-bc33-16833f19a34c

-- 1. Vérifier si le user existe avec cet auth UUID
SELECT 
  id,
  user_id,
  name,
  email,
  role
FROM public.users
WHERE user_id = '82be903d-9600-4c53-9cd4-113bfaaac12e';

-- 2. Vérifier si l'ID cd73c227... existe comme PK dans public.users
SELECT 
  id,
  user_id,
  name,
  email,
  role
FROM public.users
WHERE id = 'cd73c227-6d2d-4997-bc33-16833f19a34c';

-- 3. Lister TOUS les users pour voir la structure
SELECT 
  id,
  user_id,
  name,
  email,
  role
FROM public.users
ORDER BY name;

-- 4. Vérifier les FK constraints sur prospects
SELECT
    conname AS constraint_name,
    conrelid::regclass AS table_name,
    a.attname AS column_name,
    confrelid::regclass AS foreign_table_name,
    af.attname AS foreign_column_name
FROM
    pg_constraint AS c
    JOIN pg_attribute AS a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    JOIN pg_attribute AS af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE
    contype = 'f'
    AND conrelid = 'public.prospects'::regclass
    AND conname = 'prospects_owner_id_fkey';
