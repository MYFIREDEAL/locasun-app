-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Ajout colonne presence_message_sent à client_form_panels
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Objectif : Tracker si le message "Vous êtes toujours là ?" a été envoyé
-- pour éviter les doublons (1 seul envoi par panel/action).
-- 
-- ⚠️ Cette colonne est INDÉPENDANTE du système de relance cron :
--    - N'est PAS lue par auto-form-reminders
--    - N'impacte PAS reminder_count
--    - N'impacte PAS task_created
-- 
-- Date: 1 février 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- Ajout de la colonne
ALTER TABLE public.client_form_panels
  ADD COLUMN IF NOT EXISTS presence_message_sent BOOLEAN DEFAULT false;

-- Commentaire
COMMENT ON COLUMN public.client_form_panels.presence_message_sent IS 
  'Flag indiquant si le message "Vous êtes toujours là ?" a été envoyé. Un seul envoi par panel.';

-- Vérification
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'client_form_panels' 
    AND column_name = 'presence_message_sent'
  ) THEN
    RAISE NOTICE '✅ Colonne presence_message_sent ajoutée avec succès';
  ELSE
    RAISE EXCEPTION '❌ Échec ajout colonne presence_message_sent';
  END IF;
END $$;
