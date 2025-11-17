-- =====================================================
-- Ajouter le champ form_data à la table prospects
-- =====================================================
-- Date: 17 novembre 2025
-- Description: Stocke les réponses des formulaires dynamiques
-- Format: { "field-123": "valeur", "field-456": "autre valeur" }

-- Ajouter la colonne form_data (JSONB)
ALTER TABLE public.prospects 
ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.prospects.form_data IS 
'Réponses aux formulaires dynamiques remplis par l''admin dans la fiche prospect.
Structure :
{
  "field-123": "FR76 1234 5678 9012",  // RIB
  "field-456": "document-rib.pdf",     // Nom du fichier
  "field-789": "0612345678"            // Téléphone
}

Les clés correspondent aux field.id des formulaires créés dans ProfilePage.
Ce champ est modifiable par les admins uniquement (pas par les clients).

Différence avec client_form_panels :
- form_data : Admin remplit dans la fiche prospect (ProspectDetailsAdmin)
- client_form_panels : Client remplit depuis son dashboard (formulaire envoyé via chat)';

-- Index pour les recherches dans le JSONB
CREATE INDEX IF NOT EXISTS idx_prospects_form_data ON public.prospects USING GIN(form_data);

-- =====================================================
-- Mise à jour du trigger updated_at
-- =====================================================
-- Le trigger existant update_prospects_updated_at va automatiquement
-- mettre à jour updated_at quand form_data change

-- =====================================================
-- Test de validation
-- =====================================================
-- Vérifier que la colonne existe
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'prospects' AND column_name = 'form_data';

-- Test d'insertion
-- UPDATE prospects 
-- SET form_data = '{"field-123": "FR76 1234 5678", "field-456": "test.pdf"}'::jsonb
-- WHERE id = 'VOTRE_PROSPECT_ID';
