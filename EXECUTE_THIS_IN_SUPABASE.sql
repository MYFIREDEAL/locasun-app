-- DIAGNOSTIC COMPLET : Pourquoi Elodie ne voit pas les prospects de Jack LUC

-- 1. Info Elodie
SELECT 
  'ELODIE INFO' as section,
  id as pk_id,
  user_id as auth_uuid,
  name,
  role,
  access_rights
FROM public.users
WHERE name ILIKE '%elodie%' OR name ILIKE '%vinet%';

-- 2. Info Jack LUC
SELECT 
  'JACK LUC INFO' as section,
  id as pk_id,
  user_id as auth_uuid,
  name,
  role
FROM public.users
WHERE name = 'Jack LUC';

-- 3. Quel UUID est dans access_rights.users d'Elodie ?
SELECT 
  'ELODIE ACCESS_RIGHTS' as section,
  name,
  jsonb_array_elements_text(access_rights->'users') as authorized_user_uuid
FROM public.users
WHERE name ILIKE '%elodie%' OR name ILIKE '%vinet%';

-- 4. Prospects de Jack LUC (avec owner_id)
SELECT 
  'JACK PROSPECTS' as section,
  p.id,
  p.name,
  p.owner_id,
  u.name as owner_name,
  u.id as owner_pk_id,
  u.user_id as owner_auth_uuid
FROM public.prospects p
LEFT JOIN public.users u ON p.owner_id = u.user_id
WHERE u.name = 'Jack LUC'
LIMIT 5;

-- 5. DIAGNOSTIC : Comparer les UUIDs
SELECT 
  'DIAGNOSTIC' as section,
  jack.id as jack_pk_id,
  jack.user_id as jack_auth_uuid,
  elodie.access_rights->'users' as elodie_authorized_users,
  CASE 
    WHEN elodie.access_rights->'users' @> to_jsonb(jack.id::text) 
    THEN '✅ Elodie a jack.id dans access_rights (PK)'
    ELSE '❌ Elodie n''a PAS jack.id dans access_rights'
  END as has_jack_pk_id,
  CASE 
    WHEN elodie.access_rights->'users' @> to_jsonb(jack.user_id::text) 
    THEN '✅ Elodie a jack.user_id dans access_rights (AUTH UUID)'
    ELSE '❌ Elodie n''a PAS jack.user_id dans access_rights'
  END as has_jack_auth_uuid
FROM public.users jack
CROSS JOIN public.users elodie
WHERE jack.name = 'Jack LUC'
  AND (elodie.name ILIKE '%elodie%' OR elodie.name ILIKE '%vinet%');
