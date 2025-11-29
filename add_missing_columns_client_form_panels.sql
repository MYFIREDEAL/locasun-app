-- Ajouter les colonnes manquantes pour le système d'auto-complete des étapes

-- 1. Ajouter prompt_id pour retrouver le prompt associé
ALTER TABLE public.client_form_panels
ADD COLUMN IF NOT EXISTS prompt_id TEXT;

COMMENT ON COLUMN public.client_form_panels.prompt_id IS 
  'ID du prompt qui a envoyé ce formulaire (pour auto-complete des étapes)';

-- 2. Ajouter current_step_index pour savoir quelle étape valider
ALTER TABLE public.client_form_panels
ADD COLUMN IF NOT EXISTS current_step_index INTEGER;

COMMENT ON COLUMN public.client_form_panels.current_step_index IS 
  'Index de l''étape du projet au moment de l''envoi du formulaire';

-- 3. Ajouter step_name pour l'affichage
ALTER TABLE public.client_form_panels
ADD COLUMN IF NOT EXISTS step_name TEXT;

COMMENT ON COLUMN public.client_form_panels.step_name IS 
  'Nom de l''étape du projet (pour affichage dans l''interface)';

-- 4. Modifier le status pour inclure 'submitted'
ALTER TABLE public.client_form_panels
DROP CONSTRAINT IF EXISTS client_form_panels_status_check;

ALTER TABLE public.client_form_panels
ADD CONSTRAINT client_form_panels_status_check 
CHECK (status IN ('pending', 'submitted', 'approved', 'rejected'));

COMMENT ON COLUMN public.client_form_panels.status IS 
  'Statut du formulaire : 
   - pending : En attente de soumission par le client
   - submitted : Soumis par le client (en attente de validation admin)
   - approved : Validé par l''admin
   - rejected : Rejeté par l''admin (client doit resoumettre)';

-- 5. Ajouter last_submitted_at pour tracking
ALTER TABLE public.client_form_panels
ADD COLUMN IF NOT EXISTS last_submitted_at TIMESTAMPTZ;

COMMENT ON COLUMN public.client_form_panels.last_submitted_at IS 
  'Date de la dernière soumission par le client';
