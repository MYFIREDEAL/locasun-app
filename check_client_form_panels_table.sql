-- 🔍 VÉRIFICATION: État de la table client_form_panels dans Supabase
-- À exécuter dans SQL Editor de Supabase Dashboard

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ VÉRIFIER SI LA TABLE EXISTE
-- ═══════════════════════════════════════════════════════════════
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'client_form_panels'
) as table_exists;

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ VOIR LA STRUCTURE DE LA TABLE
-- ═══════════════════════════════════════════════════════════════
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'client_form_panels'
ORDER BY ordinal_position;

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ COMPTER LES FORMULAIRES DANS LA TABLE
-- ═══════════════════════════════════════════════════════════════
SELECT 
    COUNT(*) as total_formulaires,
    COUNT(DISTINCT prospect_id) as nombre_clients_avec_formulaires,
    COUNT(DISTINCT project_type) as nombre_types_projets
FROM client_form_panels;

-- ═══════════════════════════════════════════════════════════════
-- 4️⃣ VOIR TOUS LES FORMULAIRES (si moins de 50)
-- ═══════════════════════════════════════════════════════════════
SELECT 
    cfp.id,
    cfp.panel_id,
    cfp.prospect_id,
    cfp.project_type,
    cfp.form_id,
    cfp.status,
    cfp.created_at,
    p.name as client_name,
    p.email as client_email
FROM client_form_panels cfp
LEFT JOIN prospects p ON p.id = cfp.prospect_id
ORDER BY cfp.created_at DESC
LIMIT 50;

-- ═══════════════════════════════════════════════════════════════
-- 5️⃣ VÉRIFIER SI client_form_panels EST DANS LA PUBLICATION REALTIME
-- ═══════════════════════════════════════════════════════════════
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'client_form_panels'
        ) 
        THEN '✅ OUI - client_form_panels est dans la publication Realtime'
        ELSE '❌ NON - client_form_panels N''EST PAS dans Realtime'
    END as realtime_status;

-- ═══════════════════════════════════════════════════════════════
-- 6️⃣ VÉRIFIER LES POLITIQUES RLS
-- ═══════════════════════════════════════════════════════════════
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    CASE cmd
        WHEN 'SELECT' THEN '👁️ Lecture'
        WHEN 'INSERT' THEN '➕ Création'
        WHEN 'UPDATE' THEN '✏️ Modification'
        WHEN 'DELETE' THEN '🗑️ Suppression'
        ELSE cmd
    END as type_operation
FROM pg_policies
WHERE tablename = 'client_form_panels'
ORDER BY cmd, policyname;

-- ═══════════════════════════════════════════════════════════════
-- 7️⃣ SI LA TABLE N'EXISTE PAS, CRÉER LA TABLE
-- ═══════════════════════════════════════════════════════════════
/*
⚠️ DÉCOMMENTER SI LA TABLE N'EXISTE PAS :

CREATE TABLE IF NOT EXISTS client_form_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id TEXT UNIQUE NOT NULL,
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    project_type TEXT NOT NULL,
    form_id TEXT NOT NULL,
    message_timestamp BIGINT,
    status TEXT DEFAULT 'pending',
    user_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_client_form_panels_prospect ON client_form_panels(prospect_id);
CREATE INDEX IF NOT EXISTS idx_client_form_panels_status ON client_form_panels(status);

-- RLS Policies
ALTER TABLE client_form_panels ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout faire
CREATE POLICY "Admins can manage all form panels"
ON client_form_panels
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE users.user_id = auth.uid() 
        AND users.role IN ('Global Admin', 'Manager', 'Commercial')
    )
);

-- Clients peuvent voir leurs propres formulaires
CREATE POLICY "Clients can view their own form panels"
ON client_form_panels
FOR SELECT
TO authenticated
USING (
    prospect_id IN (
        SELECT id FROM prospects 
        WHERE user_id = auth.uid()
    )
);

-- Ajouter à la publication Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE client_form_panels;
*/
