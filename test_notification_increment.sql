-- =====================================================
-- TEST: Vérifier l'incrémentation des notifications admin
-- =====================================================
-- Date: 1 décembre 2025

-- 1. Trouver un prospect existant (john par exemple)
SELECT 
  id,
  name,
  owner_id
FROM public.prospects
WHERE LOWER(name) LIKE '%john%'
LIMIT 1;

-- 2. Simuler la création d'une notification (1er message)
-- Remplacez les valeurs ci-dessous avec les résultats de l'étape 1
/*
INSERT INTO public.notifications (
  prospect_id,
  owner_id,
  project_type,
  prospect_name,
  project_name,
  count,
  read
) VALUES (
  'REMPLACER_PAR_PROSPECT_ID',
  'REMPLACER_PAR_OWNER_ID',
  'Autonomie',
  'john',
  'Autonomie',
  1,
  false
);
*/

-- 3. Vérifier que la notification existe
SELECT * FROM public.notifications
WHERE LOWER(prospect_name) LIKE '%john%'
  AND read = false;

-- 4. Simuler l'incrémentation (2ème, 3ème, 4ème messages)
-- Remplacez NOTIFICATION_ID par l'id de l'étape 3
/*
UPDATE public.notifications
SET count = count + 1,
    created_at = NOW()
WHERE id = 'REMPLACER_PAR_NOTIFICATION_ID';
*/

-- 5. Vérifier que le count a bien augmenté
SELECT 
  id,
  prospect_name,
  project_name,
  count,
  read,
  created_at
FROM public.notifications
WHERE LOWER(prospect_name) LIKE '%john%'
  AND read = false;

-- 6. Test complet automatique (UNIQUEMENT SI john existe)
DO $$
DECLARE
  test_prospect_id UUID;
  test_owner_id UUID;
  test_notification_id UUID;
BEGIN
  -- Trouver john
  SELECT id, owner_id INTO test_prospect_id, test_owner_id
  FROM public.prospects
  WHERE LOWER(name) LIKE '%john%'
  LIMIT 1;

  IF test_prospect_id IS NULL THEN
    RAISE NOTICE '❌ Prospect "john" introuvable';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Prospect trouvé: % (owner: %)', test_prospect_id, test_owner_id;

  -- Supprimer les anciennes notifications de test
  DELETE FROM public.notifications
  WHERE prospect_id = test_prospect_id 
    AND project_type = 'Autonomie';

  RAISE NOTICE '🗑️ Anciennes notifications supprimées';

  -- Créer une notification
  INSERT INTO public.notifications (
    prospect_id,
    owner_id,
    project_type,
    prospect_name,
    project_name,
    count,
    read
  ) VALUES (
    test_prospect_id,
    test_owner_id,
    'Autonomie',
    'john',
    'Autonomie',
    1,
    false
  ) RETURNING id INTO test_notification_id;

  RAISE NOTICE '✅ Notification créée avec count=1 (id: %)', test_notification_id;

  -- Simuler 4 nouveaux messages (total = 5)
  FOR i IN 1..4 LOOP
    UPDATE public.notifications
    SET count = count + 1,
        created_at = NOW()
    WHERE id = test_notification_id;
    
    RAISE NOTICE '📨 Message %: count=%', i+1, (SELECT count FROM public.notifications WHERE id = test_notification_id);
    
    -- Pause de 1 seconde entre chaque message
    PERFORM pg_sleep(0.5);
  END LOOP;

  -- Afficher le résultat final
  RAISE NOTICE '🎉 TEST TERMINÉ - Vérifiez le count final ci-dessous:';
END $$;

-- 7. Afficher le résultat final
SELECT 
  '✅ RÉSULTAT FINAL' as status,
  prospect_name,
  project_name,
  count as "Count (devrait être 5)",
  read as "Lu (devrait être false)",
  created_at
FROM public.notifications
WHERE LOWER(prospect_name) LIKE '%john%'
  AND project_type = 'Autonomie'
  AND read = false;
