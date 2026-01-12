-- ================================================
-- FIX SIMPLE: Supprimer la policy INSERT restrictive sur notifications
-- Description: Comme client_notifications, pas de policy INSERT = autorisé par défaut
-- Date : 12 janvier 2026
-- ================================================

-- Supprimer la policy INSERT restrictive
DROP POLICY IF EXISTS "Clients can create notifications for their admin" ON public.notifications;

-- Vérifier qu'il ne reste plus de policy INSERT
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'notifications'
ORDER BY policyname;
