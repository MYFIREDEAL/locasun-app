-- Migration: Ajouter le champ 'audience' à la table forms
-- Date: 5 janvier 2026
-- Description: Distinction formulaires client / internes

-- Ajouter la colonne 'audience' avec valeur par défaut 'client'
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS audience TEXT DEFAULT 'client' 
CHECK (audience IN ('client', 'internal'));

-- Mettre à jour les formulaires existants (s'ils existent)
UPDATE public.forms 
SET audience = 'client' 
WHERE audience IS NULL;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN public.forms.audience IS 
  'Définit la destination du formulaire :
   - "client" : Formulaire envoyé au client via le chat (comportement par défaut)
   - "internal" : Formulaire interne rempli uniquement par l''équipe (visible dans fiche prospect)';

-- Créer un index pour améliorer les performances de filtrage
CREATE INDEX IF NOT EXISTS idx_forms_audience ON public.forms(audience);
