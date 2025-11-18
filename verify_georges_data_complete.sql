-- ============================================================================
-- 🔍 VÉRIFICATION COMPLÈTE DES DONNÉES DE GEORGES
-- ============================================================================
-- Ce script vérifie si les formulaires de Georges sont bien dans Supabase
-- ou s'ils sont restés dans localStorage côté client
-- ============================================================================

-- 1️⃣ Trouver l'ID de Georges dans la table prospects
SELECT 
    id,
    name,
    email,
    tags,
    status,
    owner_id,
    user_id,
    created_at,
    form_data -- JSONB avec les données de formulaire
FROM prospects
WHERE name ILIKE '%george%'
ORDER BY created_at DESC;

-- 2️⃣ Vérifier les client_form_panels pour Georges
SELECT 
    cfp.id,
    cfp.prospect_id,
    cfp.project_type,
    cfp.form_id,
    cfp.step_name,
    cfp.status,
    cfp.form_data,
    cfp.created_at,
    cfp.updated_at,
    f.title as form_title,
    p.name as prospect_name
FROM client_form_panels cfp
LEFT JOIN forms f ON cfp.form_id = f.id
LEFT JOIN prospects p ON cfp.prospect_id = p.id
WHERE p.name ILIKE '%george%'
ORDER BY cfp.created_at DESC;

-- 3️⃣ Vérifier le form_data JSONB dans prospects (ancien système)
SELECT 
    id,
    name,
    form_data,
    jsonb_array_length(form_data) as nombre_formulaires_dans_jsonb
FROM prospects
WHERE name ILIKE '%george%'
  AND form_data IS NOT NULL
  AND form_data != '[]'::jsonb;

-- 4️⃣ Compter tous les formulaires ACC de Georges
SELECT 
    COUNT(*) as total_formulaires_acc,
    COUNT(CASE WHEN status = 'submitted' THEN 1 END) as formulaires_soumis,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as formulaires_en_attente,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as formulaires_approuves,
    COUNT(CASE WHEN status = 'rejected' THEN 1 END) as formulaires_rejetes
FROM client_form_panels cfp
JOIN prospects p ON cfp.prospect_id = p.id
WHERE p.name ILIKE '%george%'
  AND cfp.project_type = 'ACC';

-- 5️⃣ Vérifier l'historique des messages chat pour voir si formulaire envoyé
SELECT 
    cm.id,
    cm.prospect_id,
    cm.project_type,
    cm.sender,
    cm.content,
    cm.created_at,
    p.name as prospect_name
FROM chat_messages cm
JOIN prospects p ON cm.prospect_id = p.id
WHERE p.name ILIKE '%george%'
  AND cm.project_type = 'ACC'
  AND (
    cm.content ILIKE '%formulaire%'
    OR cm.content ILIKE '%FORMULAIRE ACC%'
    OR cm.content ILIKE '%envoyé%'
  )
ORDER BY cm.created_at DESC
LIMIT 10;

-- 6️⃣ Vérifier si Georges a un user_id (connexion auth.users)
SELECT 
    p.id as prospect_id,
    p.name,
    p.email,
    p.user_id,
    au.email as auth_email,
    au.created_at as auth_created_at,
    au.last_sign_in_at
FROM prospects p
LEFT JOIN auth.users au ON p.user_id = au.id
WHERE p.name ILIKE '%george%'
ORDER BY p.created_at DESC;

-- ============================================================================
-- 🎯 RÉSULTAT ATTENDU
-- ============================================================================
-- Si tout est OK dans Supabase:
--   - Query 1: Doit retourner 1 ligne avec Georges
--   - Query 2: Doit retourner 1+ lignes avec des client_form_panels
--   - Query 4: total_formulaires_acc > 0 et formulaires_soumis > 0
--   - Query 6: user_id NOT NULL et last_sign_in_at récent
--
-- Si données dans localStorage uniquement:
--   - Query 2: Retourne 0 ligne
--   - Query 3: Peut contenir des données (ancien système)
--   - Query 4: total_formulaires_acc = 0
--
-- ❌ Si Query 2 et 4 retournent 0, alors le formulaire n'est PAS dans Supabase
-- ✅ Si Query 2 et 4 retournent > 0, alors le problème est uniquement UI (déjà fixé)
-- ============================================================================
