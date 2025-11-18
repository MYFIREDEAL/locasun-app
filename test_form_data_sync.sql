-- =====================================================
-- TESTS: Vérifier la synchronisation form_data
-- =====================================================

-- 1️⃣ Voir tous les prospects avec form_data
SELECT 
    id,
    name,
    email,
    form_data,
    updated_at
FROM public.prospects
WHERE form_data IS NOT NULL
ORDER BY updated_at DESC;

-- 2️⃣ Voir tous les client_form_panels
SELECT 
    id,
    panel_id,
    prospect_id,
    form_id,
    status,
    user_override,
    step_name,
    created_at,
    updated_at
FROM public.client_form_panels
ORDER BY updated_at DESC;

-- 3️⃣ Voir form_data de Georges spécifiquement
SELECT 
    name,
    email,
    form_data,
    updated_at
FROM public.prospects
WHERE name ILIKE '%georges%'
OR email ILIKE '%georges%';

-- 4️⃣ Vérifier les politiques RLS actives
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'client_form_panels'
ORDER BY policyname;

-- 5️⃣ Vérifier Real-time est activé
SELECT 
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND schemaname = 'public'
AND tablename IN ('prospects', 'client_form_panels', 'chat_messages')
ORDER BY tablename;
