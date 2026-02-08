-- ================================================================
-- RESET complet de bella57@yopmail.com (Locasun / evatime)
-- Supprime : form panels, chat, project steps, project files,
--            signature procedures, notifications, appointments liés
-- Remet le prospect à zéro (tags vidés, status nouveau, form_data vidé)
-- ================================================================

-- Étape 1 : Identifier le prospect
-- Exécuter d'abord cette requête pour vérifier :
SELECT id, name, email, tags, status, organization_id
FROM public.prospects
WHERE email = 'bella57@yopmail.com';

-- Étape 2 : Supprimer les données liées (à exécuter dans le SQL Editor Supabase)

-- Formulaires (panels)
DELETE FROM public.client_form_panels
WHERE prospect_id = (SELECT id FROM public.prospects WHERE email = 'bella57@yopmail.com');

-- Messages chat
DELETE FROM public.chat_messages
WHERE prospect_id = (SELECT id FROM public.prospects WHERE email = 'bella57@yopmail.com');

-- Étapes projet
DELETE FROM public.project_steps_status
WHERE prospect_id = (SELECT id FROM public.prospects WHERE email = 'bella57@yopmail.com');

-- Fichiers projet
DELETE FROM public.project_files
WHERE prospect_id = (SELECT id FROM public.prospects WHERE email = 'bella57@yopmail.com');

-- Procédures de signature
DELETE FROM public.signature_procedures
WHERE prospect_id = (SELECT id FROM public.prospects WHERE email = 'bella57@yopmail.com');

-- Notifications liées
DELETE FROM public.notifications
WHERE prospect_id = (SELECT id FROM public.prospects WHERE email = 'bella57@yopmail.com');

-- RDV / tâches liées
DELETE FROM public.appointments
WHERE contact_id = (SELECT id FROM public.prospects WHERE email = 'bella57@yopmail.com');

-- Étape 3 : Remettre le prospect à zéro (garder le compte, vider les projets)
UPDATE public.prospects
SET 
  tags = '{}',
  status = 'nouveau',
  form_data = '{}'::jsonb,
  project_status = '{}'::jsonb,
  updated_at = now()
WHERE email = 'bella57@yopmail.com';
