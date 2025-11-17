-- 🧪 TEST : Vérifier Georges et ses formulaires
-- Exécute après avoir envoyé un formulaire à Georges

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ Georges existe dans prospects ?
-- ═══════════════════════════════════════════════════════════════
SELECT 
    id,
    name,
    email,
    user_id,
    tags as projets,
    created_at
FROM prospects 
WHERE email ILIKE '%georges%' OR name ILIKE '%georges%';

-- Si 0 ligne → Georges n'existe pas
-- Si user_id NULL → Georges pas lié à auth.users (ne peut pas se connecter)

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ Formulaires de Georges
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
WHERE cfp.prospect_id IN (
    SELECT id FROM prospects 
    WHERE email ILIKE '%georges%' OR name ILIKE '%georges%'
)
ORDER BY cfp.created_at DESC;

-- Si 0 ligne → Aucun formulaire envoyé à Georges
-- Si 1+ lignes → Formulaires existent dans Supabase ✅

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ Messages chat avec formulaires pour Georges
-- ═══════════════════════════════════════════════════════════════
SELECT 
    cm.id,
    cm.project_type,
    cm.sender,
    cm.form_id,
    cm.created_at,
    f.name as form_name
FROM chat_messages cm
LEFT JOIN forms f ON f.form_id = cm.form_id
WHERE cm.prospect_id IN (
    SELECT id FROM prospects 
    WHERE email ILIKE '%georges%' OR name ILIKE '%georges%'
)
AND cm.form_id IS NOT NULL
ORDER BY cm.created_at DESC
LIMIT 10;

-- Si 0 ligne → Aucun message chat avec formulaire
-- Si 1+ lignes → Messages existent mais peut-être pas dans client_form_panels

-- ═══════════════════════════════════════════════════════════════
-- 4️⃣ CRÉER UN FORMULAIRE TEST MANUELLEMENT (si besoin)
-- ═══════════════════════════════════════════════════════════════
-- DÉCOMMENTER pour insérer un formulaire test :

/*
INSERT INTO client_form_panels (
    panel_id,
    prospect_id,
    project_type,
    form_id,
    message_timestamp,
    status
)
SELECT 
    CONCAT('panel-test-', id, '-', EXTRACT(EPOCH FROM NOW())::bigint),
    id,
    'ACC',
    'form_test_manuel',
    EXTRACT(EPOCH FROM NOW())::bigint * 1000,
    'pending'
FROM prospects 
WHERE email ILIKE '%georges%' OR name ILIKE '%georges%'
LIMIT 1
RETURNING *;
*/

-- ═══════════════════════════════════════════════════════════════
-- 5️⃣ COMPTER LES FORMULAIRES PAR CLIENT
-- ═══════════════════════════════════════════════════════════════
SELECT 
    p.name,
    p.email,
    COUNT(cfp.id) as nombre_formulaires,
    STRING_AGG(DISTINCT cfp.project_type, ', ') as projets,
    STRING_AGG(DISTINCT cfp.status, ', ') as statuts
FROM prospects p
LEFT JOIN client_form_panels cfp ON cfp.prospect_id = p.id
WHERE p.email ILIKE '%georges%' OR p.name ILIKE '%georges%'
GROUP BY p.id, p.name, p.email;

-- ═══════════════════════════════════════════════════════════════
-- 📊 INTERPRÉTATION
-- ═══════════════════════════════════════════════════════════════
/*
✅ SI Georges a 1+ formulaire dans client_form_panels
   → Migration OK, le client devrait voir le formulaire

❌ SI Georges a 0 formulaire dans client_form_panels
   → Mais 1+ message chat avec form_id
   → Alors registerClientForm() n'a pas été appelé ou a échoué

❌ SI Georges n'existe pas dans prospects
   → Créer Georges d'abord

⚠️ SI user_id de Georges est NULL
   → Georges ne peut pas se connecter (pas de compte auth.users)
*/
