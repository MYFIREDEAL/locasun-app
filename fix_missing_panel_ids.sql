-- 🔧 FIX: Ajouter panel_id manquants dans client_form_panels
-- Problème: Les anciens enregistrements n'ont peut-être pas de panel_id

-- ═══════════════════════════════════════════════════════════════
-- 1️⃣ VÉRIFIER LES ENREGISTREMENTS SANS panel_id
-- ═══════════════════════════════════════════════════════════════
SELECT 
    id,
    prospect_id,
    project_type,
    form_id,
    panel_id,
    created_at
FROM client_form_panels
WHERE panel_id IS NULL
ORDER BY created_at DESC;

-- ═══════════════════════════════════════════════════════════════
-- 2️⃣ GÉNÉRER panel_id POUR LES ENREGISTREMENTS EXISTANTS
-- ═══════════════════════════════════════════════════════════════
-- ⚠️ DÉCOMMENTER POUR EXÉCUTER (après avoir vérifié au-dessus)
/*
UPDATE client_form_panels
SET panel_id = CONCAT(
    'panel-',
    prospect_id,
    '-',
    project_type,
    '-',
    form_id,
    '-',
    EXTRACT(EPOCH FROM created_at)::bigint * 1000
)
WHERE panel_id IS NULL;
*/

-- ═══════════════════════════════════════════════════════════════
-- 3️⃣ VÉRIFIER LA STRUCTURE DE LA COLONNE panel_id
-- ═══════════════════════════════════════════════════════════════
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'client_form_panels'
AND column_name = 'panel_id';

-- ═══════════════════════════════════════════════════════════════
-- 4️⃣ RENDRE panel_id OBLIGATOIRE (si nécessaire)
-- ═══════════════════════════════════════════════════════════════
-- ⚠️ À exécuter APRÈS avoir généré les panel_id manquants
/*
ALTER TABLE client_form_panels 
ALTER COLUMN panel_id SET NOT NULL;

-- Ajouter une contrainte unique sur panel_id
ALTER TABLE client_form_panels 
ADD CONSTRAINT client_form_panels_panel_id_key UNIQUE (panel_id);
*/
