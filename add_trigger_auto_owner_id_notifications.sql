-- ================================================
-- TRIGGER: Auto-remplir owner_id dans notifications
-- Description: Quand un client crée une notification, récupérer automatiquement l'owner_id depuis prospects
-- Date : 12 janvier 2026
-- ================================================

-- Fonction trigger pour auto-remplir owner_id
CREATE OR REPLACE FUNCTION public.auto_fill_notification_owner_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Si owner_id n'est pas fourni, le récupérer depuis prospects
  IF NEW.owner_id IS NULL THEN
    SELECT owner_id INTO NEW.owner_id
    FROM public.prospects
    WHERE id = NEW.prospect_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trigger_auto_fill_notification_owner_id ON public.notifications;

CREATE TRIGGER trigger_auto_fill_notification_owner_id
  BEFORE INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_fill_notification_owner_id();

-- Mettre à jour la policy INSERT pour ne PAS vérifier owner_id
DROP POLICY IF EXISTS "Clients can create notifications for their admin" ON public.notifications;

CREATE POLICY "Clients can create notifications for their admin"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    -- Le client doit être le propriétaire du prospect
    prospect_id IN (
      SELECT id FROM public.prospects WHERE user_id = auth.uid()
    )
  );

-- Vérification
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'notifications'
ORDER BY trigger_name;
