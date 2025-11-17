-- 🔥 SETUP COMPLET client_form_panels
-- Copie-colle TOUT ce script dans Supabase SQL Editor et exécute

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ CRÉER LA TABLE
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
-- 2️⃣ ACTIVER RLS
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE client_form_panels ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ POLICIES RLS - ADMINS
-- ═══════════════════════════════════════════════════════════════
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
-- 4️⃣ POLICIES RLS - CLIENTS
-- ═══════════════════════════════════════════════════════════════
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
-- 5️⃣ ACTIVER REALTIME
-- ═══════════════════════════════════════════════════════════════
DO $$ 
BEGIN
    -- Retirer si existe (pour forcer refresh)
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'client_form_panels'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE client_form_panels;
        RAISE NOTICE '♻️ Table retirée de supabase_realtime';
    END IF;
    
    -- Ajouter
    ALTER PUBLICATION supabase_realtime ADD TABLE client_form_panels;
    RAISE NOTICE '✅ Table ajoutée à supabase_realtime';
END $$;
