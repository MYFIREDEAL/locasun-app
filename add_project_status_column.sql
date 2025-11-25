-- =====================================================
-- AJOUT DE LA COLONNE STATUS DANS PROJECT_INFOS
-- =====================================================
-- Mission EVATIME : Statut projet (Actif/Abandonné/Archivé)
-- Date : 25 novembre 2025
-- =====================================================

-- 1. Ajouter la colonne status
ALTER TABLE public.project_infos
ADD COLUMN status TEXT DEFAULT 'actif' CHECK (status IN ('actif', 'abandon', 'archive'));

-- 2. Mettre tous les projets existants à 'actif' par défaut
UPDATE public.project_infos
SET status = 'actif'
WHERE status IS NULL;

-- 3. Ajouter un commentaire pour la documentation
COMMENT ON COLUMN public.project_infos.status IS 
  'Statut du projet : actif (en cours), abandon (abandonné par le client), archive (terminé/archivé).
   Valeurs possibles : actif, abandon, archive.
   Par défaut : actif.';

-- 4. Vérification
SELECT 
  id, 
  prospect_id, 
  project_type, 
  status, 
  created_at
FROM public.project_infos
LIMIT 5;
