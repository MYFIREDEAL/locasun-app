-- 🔥 SCRIPT COMPLET : Vérifier + Créer + Configurer client_form_panels
-- À exécuter dans SQL Editor de Supabase Dashboard

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ VÉRIFIER SI LA TABLE EXISTE
-- ═══════════════════════════════════════════════════════════════
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'client_form_panels'
    ) THEN
        RAISE NOTICE '✅ Table client_form_panels existe déjà';
    ELSE
        RAISE NOTICE '❌ Table client_form_panels N''EXISTE PAS - Création nécessaire';
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ CRÉER LA TABLE (si elle n'existe pas)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS client_form_panels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    panel_id TEXT UNIQUE NOT NULL,
    prospect_id UUID NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    project_type TEXT NOT NULL,
    form_id TEXT NOT NULL,
    message_timestamp BIGINT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
    user_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_client_form_panels_prospect ON client_form_panels(prospect_id);
CREATE INDEX IF NOT EXISTS idx_client_form_panels_status ON client_form_panels(status);
CREATE INDEX IF NOT EXISTS idx_client_form_panels_project ON client_form_panels(project_type);

-- Trigger pour updated_at automatique
CREATE OR REPLACE FUNCTION update_client_form_panels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_client_form_panels_updated_at ON client_form_panels;
CREATE TRIGGER trigger_update_client_form_panels_updated_at
    BEFORE UPDATE ON client_form_panels
    FOR EACH ROW
    EXECUTE FUNCTION update_client_form_panels_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ ACTIVER RLS (Row Level Security)
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE client_form_panels ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- 4️⃣ POLITIQUES RLS - ADMINS (Global Admin, Manager, Commercial)
-- ═══════════════════════════════════════════════════════════════

-- ✅ Admins peuvent TOUT FAIRE sur tous les formulaires
DROP POLICY IF EXISTS "admin_all_client_form_panels" ON client_form_panels;
CREATE POLICY "admin_all_client_form_panels"
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

-- ═══════════════════════════════════════════════════════════════
-- 5️⃣ POLITIQUES RLS - CLIENTS
-- ═══════════════════════════════════════════════════════════════

-- ✅ Clients peuvent LIRE leurs propres formulaires
DROP POLICY IF EXISTS "client_select_own_form_panels" ON client_form_panels;
CREATE POLICY "client_select_own_form_panels"
ON client_form_panels
FOR SELECT
TO authenticated
USING (
    prospect_id IN (
        SELECT id FROM prospects 
        WHERE user_id = auth.uid()
    )
);

-- ✅ Clients peuvent MODIFIER le statut de leurs formulaires (soumission)
DROP POLICY IF EXISTS "client_update_own_form_panels" ON client_form_panels;
CREATE POLICY "client_update_own_form_panels"
ON client_form_panels
FOR UPDATE
TO authenticated
USING (
    prospect_id IN (
        SELECT id FROM prospects 
        WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    prospect_id IN (
        SELECT id FROM prospects 
        WHERE user_id = auth.uid()
    )
);

-- ═══════════════════════════════════════════════════════════════
-- 6️⃣ ACTIVER REALTIME
-- ═══════════════════════════════════════════════════════════════

-- Vérifier si déjà dans la publication
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'client_form_panels'
    ) THEN
        RAISE NOTICE '✅ client_form_panels déjà dans supabase_realtime';
    ELSE
        RAISE NOTICE '➕ Ajout de client_form_panels à supabase_realtime';
        ALTER PUBLICATION supabase_realtime ADD TABLE client_form_panels;
    END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 7️⃣ VÉRIFICATION FINALE
-- ═══════════════════════════════════════════════════════════════

-- Voir la structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'client_form_panels'
ORDER BY ordinal_position;

-- Voir les policies RLS
SELECT 
    policyname,
    cmd as operation,
    CASE cmd
        WHEN 'SELECT' THEN '👁️ Lecture'
        WHEN 'INSERT' THEN '➕ Création'
        WHEN 'UPDATE' THEN '✏️ Modification'
        WHEN 'DELETE' THEN '🗑️ Suppression'
        ELSE 'ALL'
    END as type
FROM pg_policies
WHERE tablename = 'client_form_panels'
ORDER BY cmd, policyname;

-- Vérifier Realtime
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

-- Compter les formulaires existants
SELECT 
    COUNT(*) as total_formulaires,
    COUNT(DISTINCT prospect_id) as nombre_clients,
    COUNT(DISTINCT project_type) as nombre_projets
FROM client_form_panels;

-- ═══════════════════════════════════════════════════════════════
-- ✅ SUCCÈS !
-- ═══════════════════════════════════════════════════════════════
RAISE NOTICE '🎉 Configuration client_form_panels terminée avec succès !';
