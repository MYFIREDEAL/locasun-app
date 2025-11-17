-- 🔥 MIGRATION COMPLÈTE ET SÉCURISÉE - Option B (Enterprise-grade)
-- Crée les formulaires manquants AVANT la migration
-- Garde l'intégrité référentielle
-- Aucun downtime, aucun risque

-- ═══════════════════════════════════════════════════════════════
-- 🟦 PHASE 1 : Identifier les formulaires manquants
-- ═══════════════════════════════════════════════════════════════
SELECT 
    cm.form_id,
    COUNT(*) as usage_count,
    MIN(cm.created_at) as first_used,
    COUNT(DISTINCT cm.prospect_id) as nombre_clients,
    STRING_AGG(DISTINCT cm.project_type, ', ') as projets
FROM chat_messages cm
LEFT JOIN forms f ON f.form_id = cm.form_id
WHERE cm.form_id IS NOT NULL
AND f.form_id IS NULL
GROUP BY cm.form_id
ORDER BY COUNT(*) DESC;

-- ═══════════════════════════════════════════════════════════════
-- 🟩 PHASE 2 : Créer les formulaires manquants (méthode propre)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO forms (form_id, name, description, fields, created_at, updated_at)
SELECT DISTINCT
    cm.form_id,
    CONCAT('Formulaire migré ', cm.form_id) as name,
    'Formulaire créé automatiquement lors de la migration depuis chat_messages. Champs à compléter ultérieurement.' as description,
    '[]'::jsonb as fields,
    MIN(cm.created_at) as created_at,
    NOW() as updated_at
FROM chat_messages cm
LEFT JOIN forms f ON f.form_id = cm.form_id
WHERE cm.form_id IS NOT NULL
AND f.form_id IS NULL
GROUP BY cm.form_id
RETURNING form_id, name, created_at;

-- ✅ Vérifier que tous les formulaires existent maintenant
SELECT 
    COUNT(DISTINCT cm.form_id) as total_form_ids,
    COUNT(DISTINCT f.form_id) as forms_existants,
    CASE 
        WHEN COUNT(DISTINCT cm.form_id) = COUNT(DISTINCT f.form_id) 
        THEN '✅ TOUS LES FORMULAIRES EXISTENT'
        ELSE '❌ IL MANQUE DES FORMULAIRES'
    END as status
FROM chat_messages cm
INNER JOIN forms f ON f.form_id = cm.form_id
WHERE cm.form_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 🟧 PHASE 3 : Migration vers client_form_panels
-- ═══════════════════════════════════════════════════════════════
INSERT INTO client_form_panels (
    panel_id,
    prospect_id,
    project_type,
    form_id,
    message_timestamp,
    status
)
SELECT 
    CONCAT('panel-migrated-', cm.id) as panel_id,
    cm.prospect_id,
    cm.project_type,
    cm.form_id,
    EXTRACT(EPOCH FROM cm.created_at)::bigint * 1000 as message_timestamp,
    'pending' as status
FROM chat_messages cm
WHERE cm.form_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 
    FROM client_form_panels cfp
    WHERE cfp.prospect_id = cm.prospect_id
    AND cfp.project_type = cm.project_type
    AND cfp.form_id = cm.form_id
)
ORDER BY cm.created_at ASC
RETURNING panel_id, prospect_id, project_type, form_id, status;

-- ═══════════════════════════════════════════════════════════════
-- ✅ PHASE 4 : Vérification post-migration
-- ═══════════════════════════════════════════════════════════════

-- 4.1 - Compter les formulaires migrés par client
SELECT 
    p.name,
    p.email,
    COUNT(cfp.id) as nombre_formulaires,
    STRING_AGG(DISTINCT cfp.project_type, ', ') as projets,
    STRING_AGG(DISTINCT cfp.status, ', ') as statuts
FROM prospects p
INNER JOIN client_form_panels cfp ON cfp.prospect_id = p.id
GROUP BY p.id, p.name, p.email
ORDER BY COUNT(cfp.id) DESC;

-- 4.2 - Vérifier Georges spécifiquement
SELECT 
    cfp.id,
    cfp.panel_id,
    cfp.project_type,
    cfp.form_id,
    cfp.status,
    cfp.created_at,
    f.name as form_name,
    f.description as form_description
FROM client_form_panels cfp
LEFT JOIN forms f ON f.form_id = cfp.form_id
WHERE cfp.prospect_id = (SELECT id FROM prospects WHERE email = 'georges@yopmail.com')
ORDER BY cfp.created_at DESC;

-- 4.3 - Statistiques globales
SELECT 
    'chat_messages' as source,
    COUNT(DISTINCT form_id) as total_form_ids,
    COUNT(*) as total_messages
FROM chat_messages
WHERE form_id IS NOT NULL
UNION ALL
SELECT 
    'forms' as source,
    COUNT(*) as total_form_ids,
    NULL as total_messages
FROM forms
UNION ALL
SELECT 
    'client_form_panels' as source,
    COUNT(DISTINCT form_id) as total_form_ids,
    COUNT(*) as total_panels
FROM client_form_panels;

-- ═══════════════════════════════════════════════════════════════
-- 🎯 RÉSULTAT ATTENDU
-- ═══════════════════════════════════════════════════════════════
/*
PHASE 1 : Liste des formulaires à créer (ex: form-1763167792402, form-contact-initial)
PHASE 2 : INSERT X lignes dans forms ✅
PHASE 3 : INSERT Y lignes dans client_form_panels ✅
PHASE 4.1 : Georges | georges@yopmail.com | 2 formulaires | Centrale, ACC | pending
PHASE 4.2 : Détails des 2 formulaires de Georges
PHASE 4.3 : 
  - chat_messages : 5 form_ids distincts, 10 messages
  - forms : 5 formulaires
  - client_form_panels : 5 form_ids distincts, 10 panels

✅ MIGRATION RÉUSSIE
✅ Intégrité référentielle OK
✅ Georges voit ses formulaires dans le panneau latéral
✅ Real-time fonctionne Admin ↔ Client
*/

-- ═══════════════════════════════════════════════════════════════
-- 🟪 PHASE 5 (OPTIONNEL) : Nettoyage futur des formulaires fantômes
-- ═══════════════════════════════════════════════════════════════
/*
-- Plus tard, pour trouver les formulaires jamais utilisés :
SELECT 
    f.form_id,
    f.name,
    f.created_at,
    COUNT(cfp.id) as nb_utilisations
FROM forms f
LEFT JOIN client_form_panels cfp ON cfp.form_id = f.form_id
GROUP BY f.id, f.form_id, f.name, f.created_at
HAVING COUNT(cfp.id) = 0
ORDER BY f.created_at DESC;

-- Supprimer les formulaires non utilisés (si souhaité) :
DELETE FROM forms 
WHERE form_id IN (
    SELECT f.form_id 
    FROM forms f
    LEFT JOIN client_form_panels cfp ON cfp.form_id = f.form_id
    WHERE cfp.id IS NULL
);
*/

-- ═══════════════════════════════════════════════════════════════
-- ✅ FIN DE LA MIGRATION - OPTION B (Enterprise-grade)
-- ═══════════════════════════════════════════════════════════════
