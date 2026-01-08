-- Ajouter la colonne action_id à la table client_form_panels
-- pour supporter le déclenchement séquentiel des actions workflow

ALTER TABLE public.client_form_panels
ADD COLUMN IF NOT EXISTS action_id TEXT;

COMMENT ON COLUMN public.client_form_panels.action_id IS 'ID de l''action du workflow qui a créé ce formulaire (pour déclenchement séquentiel)';
