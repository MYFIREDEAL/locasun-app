-- Test direct de la fonction avec le prospect de Charly

SELECT 
  id,
  name,
  owner_id,
  owner_id::text AS owner_id_text,
  'e85ff206-87a2-4d63-9f1d-4d97f1842159'::uuid AS test_uuid,
  CASE 
    WHEN owner_id = 'e85ff206-87a2-4d63-9f1d-4d97f1842159'::uuid THEN '✅ Direct match'
    ELSE '❌ No match'
  END AS test1,
  CASE 
    WHEN owner_id::text = 'e85ff206-87a2-4d63-9f1d-4d97f1842159' THEN '✅ Text match'
    ELSE '❌ No text match'
  END AS test2
FROM prospects 
WHERE id = '59ce74d7-801c-4250-b519-d74ebaf42254';

-- Simuler ce que fait la fonction
DO $$
DECLARE
  v_prospect RECORD;
  v_data JSONB := '{"owner_id": "e85ff206-87a2-4d63-9f1d-4d97f1842159"}'::jsonb;
  v_result TEXT;
BEGIN
  SELECT * INTO v_prospect
  FROM prospects
  WHERE id = '59ce74d7-801c-4250-b519-d74ebaf42254';
  
  RAISE NOTICE 'owner_id en base: %', v_prospect.owner_id;
  RAISE NOTICE 'owner_id dans JSON: %', (v_data->>'owner_id')::UUID;
  RAISE NOTICE 'Type owner_id base: %', pg_typeof(v_prospect.owner_id);
  RAISE NOTICE 'Type owner_id JSON: %', pg_typeof((v_data->>'owner_id')::UUID);
  
  IF v_data ? 'owner_id' AND (v_data->>'owner_id')::UUID <> v_prospect.owner_id THEN
    v_result := '❌ DIFFÉRENT (fonction bloque)';
  ELSE
    v_result := '✅ IDENTIQUE (fonction autorise)';
  END IF;
  
  RAISE NOTICE 'Résultat: %', v_result;
END $$;
