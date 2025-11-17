-- 🔄 MIGRATION: Tous les formulaires chat_messages → client_form_panels
-- Exécute ce script pour migrer tous les formulaires existants

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ COMPTER LES FORMULAIRES À MIGRER
-- ═══════════════════════════════════════════════════════════════
SELECT 
    COUNT(*) as total_messages_avec_form,
    COUNT(DISTINCT prospect_id) as nombre_clients,
    COUNT(DISTINCT project_type) as nombre_projets
FROM chat_messages
WHERE form_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ VOIR LES FORMULAIRES PAR CLIENT (avant migration)
-- ═══════════════════════════════════════════════════════════════
SELECT 
    p.name,
    p.email,
    COUNT(cm.id) as nombre_formulaires,
    STRING_AGG(DISTINCT cm.project_type, ', ') as projets,
    STRING_AGG(DISTINCT cm.form_id, ', ') as form_ids
FROM prospects p
INNER JOIN chat_messages cm ON cm.prospect_id = p.id
WHERE cm.form_id IS NOT NULL
GROUP BY p.id, p.name, p.email
ORDER BY COUNT(cm.id) DESC;

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ MIGRER TOUS LES FORMULAIRES (INSERT sans doublons)
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
    CONCAT('panel-migrated-', cm.id),
    cm.prospect_id,
    cm.project_type,
    cm.form_id,
    EXTRACT(EPOCH FROM cm.created_at)::bigint * 1000,
    'pending'
FROM chat_messages cm
WHERE cm.form_id IS NOT NULL
AND NOT EXISTS (
    -- Éviter les doublons
    SELECT 1 FROM client_form_panels cfp
    WHERE cfp.prospect_id = cm.prospect_id
    AND cfp.project_type = cm.project_type
    AND cfp.form_id = cm.form_id
)
ORDER BY cm.created_at ASC;

-- ═══════════════════════════════════════════════════════════════
-- 4️⃣ VÉRIFIER APRÈS MIGRATION
-- ═══════════════════════════════════════════════════════════════
SELECT 
    p.name,
    p.email,
    COUNT(cfp.id) as nombre_formulaires,
    STRING_AGG(DISTINCT cfp.project_type, ', ') as projets,
    STRING_AGG(DISTINCT cfp.form_id, ', ') as form_ids,
    STRING_AGG(DISTINCT cfp.status, ', ') as statuts
FROM prospects p
LEFT JOIN client_form_panels cfp ON cfp.prospect_id = p.id
GROUP BY p.id, p.name, p.email
HAVING COUNT(cfp.id) > 0
ORDER BY COUNT(cfp.id) DESC;

-- ═══════════════════════════════════════════════════════════════
-- 5️⃣ SPÉCIFIQUE GEORGES
-- ═══════════════════════════════════════════════════════════════
SELECT 
    cfp.id,
    cfp.panel_id,
    cfp.project_type,
    cfp.form_id,
    cfp.status,
    cfp.created_at,
    f.name as form_name
FROM client_form_panels cfp
LEFT JOIN forms f ON f.form_id = cfp.form_id
WHERE cfp.prospect_id = (SELECT id FROM prospects WHERE email = 'georges@yopmail.com')
ORDER BY cfp.created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- 📊 RÉSULTAT ATTENDU
-- ═══════════════════════════════════════════════════════════════
/*
Étape 1 : Voir combien de formulaires existent dans chat_messages
Étape 2 : Voir par client (Georges devrait apparaître avec 2+ formulaires)
Étape 3 : INSERT des formulaires dans client_form_panels
Étape 4 : Vérification post-migration (Georges doit avoir ses formulaires)
Étape 5 : Détails des formulaires de Georges

✅ SI Georges a 2+ formulaires après migration
   → Le client devrait voir les formulaires dans le panneau latéral

❌ SI Georges a 0 formulaires après migration
   → Les formulaires n'existent pas dans chat_messages
   → Ils viennent peut-être de localStorage (ancien système)
*/
