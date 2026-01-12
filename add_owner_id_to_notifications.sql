-- ================================================
-- MIGRATION : Ajouter owner_id à la table notifications
-- Description : Permet le filtrage des notifications par utilisateur
-- Date : 12 janvier 2026
-- ================================================

-- 1. Ajouter la colonne owner_id
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.users(user_id) ON DELETE CASCADE;

-- 2. Migrer les données existantes : récupérer owner_id depuis prospects
UPDATE public.notifications n
SET owner_id = p.owner_id
FROM public.prospects p
WHERE n.prospect_id = p.id
  AND n.owner_id IS NULL;

-- 3. Créer un index pour optimiser les requêtes filtrées par owner_id
CREATE INDEX IF NOT EXISTS idx_notifications_owner_id ON public.notifications(owner_id);

-- 4. Ajouter une contrainte NOT NULL (après vérification : table vide, OK pour activer)
ALTER TABLE public.notifications ALTER COLUMN owner_id SET NOT NULL;
-- ✅ Activé car aucune donnée existante à migrer (vérification : 0 lignes)

-- ================================================
-- VÉRIFICATION
-- ================================================

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
  AND column_name = 'owner_id';

-- Vérifier que toutes les notifications ont un owner_id
SELECT COUNT(*) as total, COUNT(owner_id) as with_owner
FROM public.notifications;

-- Afficher quelques notifications pour vérifier
SELECT id, prospect_name, project_name, owner_id, read
FROM public.notifications
ORDER BY created_at DESC
LIMIT 5;
