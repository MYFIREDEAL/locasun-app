-- ========================================
-- SUPPRIMER LE TRIGGER AUTO-CONFIRM
-- ========================================
-- Ce trigger empêche l'envoi du Magic Link en connectant automatiquement l'utilisateur

DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_user();

-- Vérification
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users'
  AND trigger_name LIKE '%confirm%';
