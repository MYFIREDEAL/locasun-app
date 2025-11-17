-- 🔍 DEBUG: Pourquoi les formulaires sont dupliqués ?

-- 1️⃣ Voir TOUS les panneaux de Georges (groupés par formulaire)
SELECT 
    cfp.form_id,
    cfp.project_type,
    COUNT(*) as nb_duplicates,
    STRING_AGG(cfp.panel_id, ', ') as panel_ids,
    MIN(cfp.created_at) as first_created,
    MAX(cfp.created_at) as last_created
FROM client_form_panels cfp
WHERE cfp.prospect_id = (SELECT id FROM prospects WHERE email = 'georges@yopmail.com')
GROUP BY cfp.form_id, cfp.project_type
ORDER BY nb_duplicates DESC, cfp.project_type;

-- 2️⃣ Voir les messages chat qui ont créé ces panneaux
SELECT 
    cm.id,
    cm.form_id,
    cm.project_type,
    cm.created_at,
    cm.sender,
    LEFT(cm.text, 50) as message_preview
FROM chat_messages cm
WHERE cm.prospect_id = (SELECT id FROM prospects WHERE email = 'georges@yopmail.com')
AND cm.form_id IS NOT NULL
ORDER BY cm.project_type, cm.form_id, cm.created_at;

-- 3️⃣ Identifier les doublons exacts (même form_id + même project_type)
SELECT 
    cfp.form_id,
    cfp.project_type,
    COUNT(*) as duplicates,
    ARRAY_AGG(cfp.id ORDER BY cfp.created_at) as cfp_ids_to_keep_first
FROM client_form_panels cfp
WHERE cfp.prospect_id = (SELECT id FROM prospects WHERE email = 'georges@yopmail.com')
GROUP BY cfp.form_id, cfp.project_type
HAVING COUNT(*) > 1;

-- ═══════════════════════════════════════════════════════════════
-- 🧹 SOLUTION : Supprimer les doublons (garder le plus ancien)
-- ═══════════════════════════════════════════════════════════════

-- ⚠️ NE PAS EXÉCUTER CETTE REQUÊTE AVANT D'AVOIR VU LES RÉSULTATS CI-DESSUS !
/*
DELETE FROM client_form_panels
WHERE id IN (
    SELECT cfp.id
    FROM client_form_panels cfp
    INNER JOIN (
        -- Garder seulement le plus ancien panel pour chaque (form_id, project_type, prospect_id)
        SELECT 
            form_id,
            project_type,
            prospect_id,
            MIN(id) as id_to_keep
        FROM client_form_panels
        GROUP BY form_id, project_type, prospect_id
        HAVING COUNT(*) > 1
    ) duplicates ON cfp.form_id = duplicates.form_id
                AND cfp.project_type = duplicates.project_type
                AND cfp.prospect_id = duplicates.prospect_id
    WHERE cfp.id != duplicates.id_to_keep
);
*/
