-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Ajout colonnes relance automatique à client_form_panels
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Ajoute les colonnes nécessaires au système de relances automatiques :
-- - auto_reminder_enabled: Activation des relances (bool)
-- - reminder_delay_days: Délai entre relances (1-4 jours)
-- - max_reminders_before_task: Nombre de relances avant création tâche (1-5)
-- - reminder_count: Compteur de relances envoyées
-- - last_reminder_at: Timestamp dernière relance
-- - task_created: Flag indiquant qu'une tâche a été créée (bloque relances)
-- 
-- Date: 30 janvier 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- Ajout des colonnes
ALTER TABLE public.client_form_panels
  ADD COLUMN IF NOT EXISTS auto_reminder_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_delay_days INTEGER DEFAULT 1 CHECK (reminder_delay_days BETWEEN 1 AND 4),
  ADD COLUMN IF NOT EXISTS max_reminders_before_task INTEGER DEFAULT 3 CHECK (max_reminders_before_task BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS task_created BOOLEAN DEFAULT false;

-- Commentaires
COMMENT ON COLUMN public.client_form_panels.auto_reminder_enabled IS 
  'Active/désactive les relances automatiques pour ce formulaire';

COMMENT ON COLUMN public.client_form_panels.reminder_delay_days IS 
  'Délai en jours entre chaque relance (1-4). Ex: 2 = relance tous les 2 jours';

COMMENT ON COLUMN public.client_form_panels.max_reminders_before_task IS 
  'Nombre max de relances avant création d''une tâche pour le commercial (1-5)';

COMMENT ON COLUMN public.client_form_panels.reminder_count IS 
  'Compteur du nombre de relances déjà envoyées';

COMMENT ON COLUMN public.client_form_panels.last_reminder_at IS 
  'Timestamp de la dernière relance envoyée (Europe/Paris)';

COMMENT ON COLUMN public.client_form_panels.task_created IS 
  'Flag indiquant qu''une tâche a été créée. Bloque l''envoi de nouvelles relances.';

-- Index pour optimiser les requêtes du cron
CREATE INDEX IF NOT EXISTS idx_client_form_panels_reminder_lookup 
  ON public.client_form_panels(status, auto_reminder_enabled, task_created)
  WHERE status = 'pending' AND auto_reminder_enabled = true AND task_created = false;

COMMENT ON INDEX idx_client_form_panels_reminder_lookup IS 
  'Index pour optimiser la recherche des formulaires nécessitant une relance';
