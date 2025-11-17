-- 🔥 Ajouter le champ step_name pour afficher l'étape du pipeline
-- Au lieu d'utiliser currentStepIndex (qui n'existe pas), on stocke directement le nom de l'étape

ALTER TABLE public.client_form_panels
ADD COLUMN IF NOT EXISTS step_name TEXT;

COMMENT ON COLUMN public.client_form_panels.step_name IS 
  'Nom de l''étape du pipeline où le formulaire a été envoyé (ex: "Inscription", "Étude technique")';

-- ✅ Mettre à jour les formulaires existants avec un nom d'étape par défaut
UPDATE public.client_form_panels
SET step_name = 'Inscription'
WHERE step_name IS NULL;

-- ✅ Vérifier les résultats
SELECT 
    cfp.id,
    cfp.panel_id,
    cfp.project_type,
    cfp.step_name,
    cfp.status,
    p.name as prospect_name
FROM client_form_panels cfp
LEFT JOIN prospects p ON p.id = cfp.prospect_id
ORDER BY cfp.created_at DESC
LIMIT 10;
