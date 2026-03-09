-- ═══════════════════════════════════════════════════════════════════
-- DEBUG: Vérifier les panels et messages pour le prospect mikllll
-- Exécuter dans Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. Trouver le prospect "mikllll" 
SELECT id, first_name, last_name, tags 
FROM prospects 
WHERE first_name ILIKE '%mik%' OR last_name ILIKE '%mik%'
LIMIT 5;

-- 2. Voir TOUS les panels pour ce prospect (remplacer le UUID)
-- SELECT id, panel_id, action_id, action_type, status, form_id, step_name, created_at
-- FROM client_form_panels 
-- WHERE prospect_id = 'REMPLACER_PAR_UUID'
-- ORDER BY created_at DESC;

-- 3. Voir les messages chat récents
-- SELECT id, sender, text, metadata, created_at
-- FROM chat_messages
-- WHERE prospect_id = 'REMPLACER_PAR_UUID'
-- AND project_type = 'piscine'
-- ORDER BY created_at DESC
-- LIMIT 10;

-- 4. Vérifier le template V2 pour decouverte
-- SELECT module_id, config_json->'actions' as actions, 
--        jsonb_array_length(config_json->'actions') as action_count
-- FROM workflow_module_templates
-- WHERE project_type = 'piscine'
-- AND module_id = 'decouverte'
-- ORDER BY updated_at DESC
-- LIMIT 1;

-- 5. Vérifier les logs du trigger (si accessible)
-- SELECT * FROM postgres_logs WHERE message LIKE '%V2 Chain%' ORDER BY timestamp DESC LIMIT 20;
