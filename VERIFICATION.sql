-- 🔍 VÉRIFICATION : Tout est bien configuré ?
-- Exécute après EXECUTE_MOI.sql

-- ═══════════════════════════════════════════════════════════════
-- ✅ CHECK 1 : La table existe ?
-- ═══════════════════════════════════════════════════════════════
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'client_form_panels'
        ) 
        THEN '✅ OUI - Table client_form_panels existe'
        ELSE '❌ NON - Table N''EXISTE PAS'
    END as check_table;

-- ═══════════════════════════════════════════════════════════════
-- ✅ CHECK 2 : Combien de colonnes ?
-- ═══════════════════════════════════════════════════════════════
SELECT 
    COUNT(*) as nombre_colonnes,
    STRING_AGG(column_name, ', ' ORDER BY ordinal_position) as colonnes
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'client_form_panels';

-- ═══════════════════════════════════════════════════════════════
-- ✅ CHECK 3 : RLS activé ?
-- ═══════════════════════════════════════════════════════════════
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ OUI - RLS activé'
        ELSE '❌ NON - RLS désactivé'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'client_form_panels';

-- ═══════════════════════════════════════════════════════════════
-- ✅ CHECK 4 : Combien de policies RLS ?
-- ═══════════════════════════════════════════════════════════════
SELECT 
    COUNT(*) as nombre_policies,
    STRING_AGG(
        policyname || ' (' || 
        CASE cmd
            WHEN 'SELECT' THEN '👁️ READ'
            WHEN 'INSERT' THEN '➕ CREATE'
            WHEN 'UPDATE' THEN '✏️ UPDATE'
            WHEN 'DELETE' THEN '🗑️ DELETE'
            ELSE 'ALL'
        END || ')',
        ', '
    ) as policies
FROM pg_policies
WHERE tablename = 'client_form_panels';

-- ═══════════════════════════════════════════════════════════════
-- ✅ CHECK 5 : Realtime activé ?
-- ═══════════════════════════════════════════════════════════════
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'client_form_panels'
        ) 
        THEN '✅ OUI - Real-time activé'
        ELSE '❌ NON - Real-time PAS activé'
    END as realtime_status;

-- ═══════════════════════════════════════════════════════════════
-- ✅ CHECK 6 : Combien de formulaires dans la table ?
-- ═══════════════════════════════════════════════════════════════
SELECT 
    COUNT(*) as total_formulaires,
    COUNT(DISTINCT prospect_id) as nombre_clients,
    COUNT(DISTINCT project_type) as nombre_projets,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM client_form_panels;

-- ═══════════════════════════════════════════════════════════════
-- 📊 RÉSULTAT ATTENDU
-- ═══════════════════════════════════════════════════════════════
/*
CHECK 1 : ✅ OUI - Table client_form_panels existe
CHECK 2 : 10 colonnes
CHECK 3 : ✅ OUI - RLS activé
CHECK 4 : 3 policies (admin_all, client_select, client_update)
CHECK 5 : ✅ OUI - Real-time activé
CHECK 6 : 0 formulaires (normal si première fois)
*/
