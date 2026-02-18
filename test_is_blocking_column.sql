-- =====================================================
-- TEST: Colonne is_blocking
-- =====================================================

-- Test 1: Insert avec is_blocking=true
INSERT INTO public.missions (
  organization_id,
  partner_id,
  prospect_id,
  project_type,
  title,
  is_blocking
)
VALUES (
  (SELECT organization_id FROM public.prospects LIMIT 1),
  (SELECT id FROM public.partners WHERE active = true LIMIT 1),
  (SELECT id FROM public.prospects LIMIT 1),
  'ACC',
  'Test mission bloquante',
  true
)
RETURNING id, is_blocking, title;

-- Attendu: 1 row, is_blocking = true

-- Test 2: Insert sans is_blocking (valeur par défaut)
INSERT INTO public.missions (
  organization_id,
  partner_id,
  prospect_id,
  project_type,
  title
)
VALUES (
  (SELECT organization_id FROM public.prospects LIMIT 1),
  (SELECT id FROM public.partners WHERE active = true LIMIT 1),
  (SELECT id FROM public.prospects LIMIT 1),
  'ACC',
  'Test mission normale'
)
RETURNING id, is_blocking, title;

-- Attendu: 1 row, is_blocking = false (DEFAULT)

-- Test 3: Vérifier colonnes existantes
SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'missions'
  AND column_name = 'is_blocking';

-- Attendu: 1 row, data_type = boolean, column_default = false

-- Cleanup (ne pas exécuter en prod)
DELETE FROM public.missions 
WHERE title LIKE 'Test mission%';
