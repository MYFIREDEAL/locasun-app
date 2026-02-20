-- Ajouter la colonne rejection_reason à la table client_form_panels
-- Cette colonne stocke la raison du refus pour l'afficher côté partenaire

ALTER TABLE public.client_form_panels
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

COMMENT ON COLUMN public.client_form_panels.rejection_reason IS 'Raison du refus du formulaire (affichée au partenaire)';
