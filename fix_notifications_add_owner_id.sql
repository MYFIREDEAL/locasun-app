-- 🔥 FIX DÉFINITIF: Ajouter owner_id dans notifications pour le real-time

-- 1. Ajouter la colonne owner_id
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS owner_id uuid;

-- 2. Remplir owner_id pour les notifications existantes (via prospects.owner_id)
UPDATE notifications
SET owner_id = prospects.owner_id
FROM prospects
WHERE notifications.prospect_id = prospects.id
  AND notifications.owner_id IS NULL;

-- 3. Supprimer l'ancienne policy SELECT complexe (avec EXISTS)
DROP POLICY IF EXISTS admins_select_notifications ON notifications;

-- 4. Créer une nouvelle policy SELECT simple (sans JOIN)
CREATE POLICY admins_select_notifications ON notifications
FOR SELECT
USING (owner_id = auth.uid());

-- 5. Vérifier que tout est OK
SELECT 
  id, 
  prospect_id, 
  owner_id,
  project_type,
  prospect_name,
  read
FROM notifications
ORDER BY created_at DESC
LIMIT 5;

-- ✅ Maintenant le real-time pourra utiliser: filter: "owner_id=eq.${userId}"
