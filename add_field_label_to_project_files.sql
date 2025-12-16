-- ═══════════════════════════════════════════════════════════════
-- 🔧 Ajouter la colonne field_label à project_files
-- ═══════════════════════════════════════════════════════════════

-- 1️⃣ Ajouter la colonne field_label (nullable car les anciens fichiers n'ont pas de label)
ALTER TABLE public.project_files
ADD COLUMN IF NOT EXISTS field_label TEXT;

-- 2️⃣ Vérifier la structure mise à jour
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_files'
ORDER BY ordinal_position;
