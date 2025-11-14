-- =====================================================
-- SETUP COMPLET - GESTION DES PIPELINES GLOBALES
-- =====================================================
-- Date: 14 novembre 2025
-- Objectif: Créer/configurer TOUT pour les pipelines globales dans Supabase

-- =====================================================
-- 1. CRÉER LA TABLE global_pipeline_steps (si pas déjà fait)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.global_pipeline_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  step_id TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,           -- Ex: "MARKET", "ETUDE", "OFFRE"
  color TEXT NOT NULL,            -- Ex: "bg-blue-100", "bg-yellow-100"
  position INTEGER NOT NULL,      -- Ordre d'affichage: 0, 1, 2, 3...
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.global_pipeline_steps IS 
  'Configuration des colonnes du pipeline commercial Kanban.
   Ces colonnes sont affichées dans FinalPipeline.jsx (vue admin).
   Les prospects peuvent être déplacés entre ces colonnes (drag & drop).
   Modifiable depuis ProfilePage > Gestion des Pipelines Globales (Global Admin uniquement).';

COMMENT ON COLUMN public.global_pipeline_steps.step_id IS 
  'Identifiant unique de la colonne (ex: "default-global-pipeline-step-0").';

COMMENT ON COLUMN public.global_pipeline_steps.label IS 
  'Nom de la colonne affiché dans le pipeline (ex: "MARKET", "ETUDE", "OFFRE", "SIGNATURE").';

COMMENT ON COLUMN public.global_pipeline_steps.color IS 
  'Classe CSS Tailwind pour la couleur de la colonne (ex: "bg-blue-100", "bg-yellow-100", "bg-green-100").';

COMMENT ON COLUMN public.global_pipeline_steps.position IS 
  'Ordre d''affichage de la colonne (0 = première colonne à gauche, 1 = deuxième, etc.).';

-- =====================================================
-- 2. CRÉER L'INDEX SUR position
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_global_pipeline_steps_position 
  ON public.global_pipeline_steps(position);

-- =====================================================
-- 3. CRÉER LE TRIGGER AUTO-UPDATE updated_at
-- =====================================================
-- Note: La fonction update_updated_at_column() doit déjà exister dans votre base
CREATE TRIGGER update_global_pipeline_steps_updated_at
  BEFORE UPDATE ON public.global_pipeline_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. ACTIVER ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE public.global_pipeline_steps ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. CRÉER LA POLICY RLS - Seul Global Admin peut gérer
-- =====================================================
DROP POLICY IF EXISTS "Admins can manage pipeline steps" ON public.global_pipeline_steps;

CREATE POLICY "Admins can manage pipeline steps"
  ON public.global_pipeline_steps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid() AND role = 'Global Admin'
    )
  );

COMMENT ON POLICY "Admins can manage pipeline steps" ON public.global_pipeline_steps IS
  'Seuls les utilisateurs avec role = "Global Admin" peuvent créer/modifier/supprimer les colonnes du pipeline.
   Ceci assure que seul l''administrateur principal peut restructurer le pipeline commercial.';

-- =====================================================
-- 6. POLICY RLS - Lecture pour tous les users PRO
-- =====================================================
DROP POLICY IF EXISTS "All users can view pipeline steps" ON public.global_pipeline_steps;

CREATE POLICY "All users can view pipeline steps"
  ON public.global_pipeline_steps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "All users can view pipeline steps" ON public.global_pipeline_steps IS
  'Tous les utilisateurs PRO (Commercial, Manager, Global Admin) peuvent voir les colonnes du pipeline.
   Nécessaire pour afficher le pipeline Kanban dans FinalPipeline.jsx.';

-- =====================================================
-- 7. ACTIVER REAL-TIME SUR LA TABLE
-- =====================================================
-- Active les notifications real-time pour synchroniser tous les admins connectés
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_pipeline_steps;

-- =====================================================
-- 8. INSÉRER LES DONNÉES PAR DÉFAUT (si table vide)
-- =====================================================
INSERT INTO public.global_pipeline_steps (step_id, label, color, position)
VALUES
  ('default-global-pipeline-step-0', 'MARKET', 'bg-blue-100', 0),
  ('default-global-pipeline-step-1', 'ETUDE', 'bg-yellow-100', 1),
  ('default-global-pipeline-step-2', 'OFFRE', 'bg-green-100', 2)
ON CONFLICT (step_id) DO NOTHING;  -- Évite les doublons si déjà insérés

-- =====================================================
-- 9. VÉRIFIER QUE TOUT EST OK
-- =====================================================

-- 9.1. Voir les données insérées
SELECT 
  id,
  step_id,
  label,
  color,
  position,
  created_at
FROM public.global_pipeline_steps
ORDER BY position;

-- 9.2. Vérifier les policies RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'global_pipeline_steps';

-- 9.3. Vérifier le real-time
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'global_pipeline_steps';

-- =====================================================
-- 10. NETTOYER L'ANCIEN SYSTÈME (company_settings)
-- =====================================================
-- ATTENTION: À exécuter UNIQUEMENT après avoir migré le code frontend !
-- Cette commande supprime les pipelines stockés en JSONB dans company_settings

-- UPDATE public.company_settings
-- SET settings = settings - 'global_pipeline_steps'
-- WHERE settings ? 'global_pipeline_steps';

-- ⚠️  NE PAS DÉCOMMENTER CETTE LIGNE TANT QUE LE CODE N'EST PAS MIGRÉ !

-- =====================================================
-- FIN DU SETUP
-- =====================================================
-- ✅ Table créée avec structure complète
-- ✅ Index optimisé sur position
-- ✅ Trigger auto-update created/updated_at
-- ✅ RLS activé avec policies (Global Admin = CRUD, autres users = READ)
-- ✅ Real-time activé pour sync multi-admins
-- ✅ Données par défaut insérées (MARKET, ETUDE, OFFRE)
-- 
-- 🔧 PROCHAINES ÉTAPES :
-- 1. Créer le hook useSupabaseGlobalPipeline.js (CRUD + real-time)
-- 2. Migrer ProfilePage pour utiliser le hook au lieu de company_settings
-- 3. Migrer FinalPipeline.jsx pour charger depuis global_pipeline_steps
-- 4. Supprimer localStorage.getItem('global_pipeline_steps')
-- 5. Tester en multi-admins (2 onglets ouverts = sync real-time)
-- 6. Nettoyer company_settings.settings.global_pipeline_steps (commande ci-dessus)
