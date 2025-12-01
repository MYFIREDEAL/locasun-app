-- =====================================================
-- FONCTION POUR RÉCUPÉRER LE PREMIER STEP_ID DU PIPELINE
-- =====================================================
-- Date: 1 décembre 2025
-- Objectif: Permet aux pages d'inscription de récupérer le step_id de la première colonne

-- Créer la fonction
CREATE OR REPLACE FUNCTION public.get_first_pipeline_step_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_step_id TEXT;
BEGIN
  -- Récupérer le step_id de la première colonne (position = 0)
  SELECT step_id INTO v_step_id
  FROM public.global_pipeline_steps
  WHERE position = 0
  ORDER BY position ASC
  LIMIT 1;
  
  -- Si aucune colonne trouvée, retourner NULL
  RETURN COALESCE(v_step_id, NULL);
END;
$$;

COMMENT ON FUNCTION public.get_first_pipeline_step_id() IS
  'Retourne le step_id de la première colonne du pipeline global (position = 0).
   Utilisé par les pages d''inscription pour créer des prospects avec le bon status.
   Si aucune colonne trouvée, retourne NULL.';

-- Test de la fonction
SELECT get_first_pipeline_step_id() as "Premier step_id du pipeline";
