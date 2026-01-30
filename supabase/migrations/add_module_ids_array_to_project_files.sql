-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Ajouter module_ids (array) pour documents IA multi-étapes
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Permet à un document IA d'être partagé sur plusieurs étapes
-- Ex: FAQ_ACC.pdf utilisé sur [inscription, pdb, signature]
--
-- À exécuter dans Supabase Dashboard > SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- 1️⃣ Ajouter la colonne module_ids (array de TEXT)
ALTER TABLE public.project_files 
ADD COLUMN IF NOT EXISTS module_ids TEXT[] DEFAULT '{}';

-- 2️⃣ Migrer les données existantes : extraire moduleId du field_label
-- field_label = 'ia-knowledge:ACC:inscription' → module_ids = ['inscription']
UPDATE public.project_files
SET module_ids = ARRAY[split_part(field_label, ':', 3)]
WHERE field_label LIKE 'ia-knowledge:%'
  AND (module_ids IS NULL OR module_ids = '{}')
  AND split_part(field_label, ':', 3) != '';

-- 3️⃣ Index pour requêtes avec ANY sur module_ids
CREATE INDEX IF NOT EXISTS idx_project_files_module_ids 
ON public.project_files USING GIN (module_ids);

-- 4️⃣ Vérification
SELECT 
  id,
  file_name,
  project_type,
  field_label,
  module_ids
FROM public.project_files
WHERE field_label LIKE 'ia-knowledge:%'
LIMIT 10;
