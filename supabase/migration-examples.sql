-- =====================================================
-- EXEMPLES DE MIGRATION DE DONNÉES
-- localStorage → Supabase
-- =====================================================

-- =====================================================
-- 1. MIGRER LES UTILISATEURS
-- =====================================================

-- Note: Les utilisateurs doivent d'abord être créés dans Supabase Auth
-- Ensuite, on peut insérer leurs profils dans la table users

-- Exemple d'insertion d'un utilisateur
-- (après création dans auth.users via l'interface ou l'API)

INSERT INTO public.users (id, name, email, role, manager_id, access_rights, phone)
VALUES
  ('user-uuid-1', 'Jack Luc', 'jack.luc@icloud.com', 'Global Admin', NULL, 
   '{"modules": ["Pipeline", "Agenda", "Contacts"], "users": []}'::jsonb, NULL),
  ('user-uuid-2', 'Charly', 'charly.rosca.ai@gmail.com', 'Manager', NULL,
   '{"modules": ["Pipeline", "Agenda", "Contacts"], "users": []}'::jsonb, NULL),
  ('user-uuid-3', 'Lucas', 'luca23@yopmail.com', 'Commercial', 'user-uuid-2',
   '{"modules": ["Pipeline", "Agenda", "Contacts"], "users": []}'::jsonb, NULL);

-- =====================================================
-- 2. MIGRER LES PROSPECTS
-- =====================================================

-- Exemple depuis les données localStorage
-- localStorage.getItem('evatime_prospects')

INSERT INTO public.prospects (id, name, email, phone, company_name, address, owner_id, status, tags, has_appointment)
VALUES
  ('prospect-1', 'Jean Dupont', 'jean.dupont@example.com', '01 23 45 67 89', 'Dupont SA', 
   '123 Rue de la Paix, 75001 Paris', 'user-uuid-1', 'Lead', ARRAY['ACC'], FALSE),
  ('prospect-2', 'Marie Martin', 'marie.martin@example.com', '09 87 65 43 21', 'Martin & Co',
   '456 Avenue des Champs, 69000 Lyon', 'user-uuid-1', 'Qualified', ARRAY['Centrale'], FALSE),
  ('prospect-3', 'Pierre Durand', 'pierre.durand@example.com', '04 56 78 90 12', 'Durand Industries',
   '789 Boulevard du Commerce, 13000 Marseille', 'user-uuid-1', 'Opportunity', ARRAY['Investissement'], FALSE);

-- =====================================================
-- 3. MIGRER LES RENDEZ-VOUS
-- =====================================================

-- localStorage.getItem('evatime_appointments')

INSERT INTO public.appointments (title, start_time, end_time, contact_id, assigned_user_id, project_id, step, status, share, notes)
VALUES
  ('RDV commercial - Jean Dupont', '2025-11-15 10:00:00+00', '2025-11-15 11:00:00+00', 
   'prospect-1', 'user-uuid-1', 'ACC', 'Étude', 'pending', TRUE, 'Premier rendez-vous'),
  ('Visite technique - Marie Martin', '2025-11-20 14:00:00+00', '2025-11-20 16:00:00+00',
   'prospect-2', 'user-uuid-2', 'Centrale', 'Installation', 'pending', FALSE, 'Vérifier le toit');

-- =====================================================
-- 4. MIGRER LES APPELS PLANIFIÉS
-- =====================================================

-- localStorage.getItem('evatime_calls')

INSERT INTO public.calls (name, date, time, contact_id, assigned_user_id, status, notes)
VALUES
  ('Appel commercial urgent', '2025-11-12', '14:30:00', 'prospect-1', 'user-uuid-1', 'pending', 'Relance importante'),
  ('Suivi client important', '2025-11-13', '10:00:00', 'prospect-2', 'user-uuid-1', 'pending', 'Point d''avancement'),
  ('Appel de suivi', '2025-11-14', '16:00:00', 'prospect-3', 'user-uuid-1', 'pending', 'Proposition commerciale');

-- =====================================================
-- 5. MIGRER LES TÂCHES
-- =====================================================

-- localStorage.getItem('evatime_tasks')

INSERT INTO public.tasks (text, date, contact_id, assigned_user_id, done, notes)
VALUES
  ('Préparer devis pour client VIP', '2025-11-12', 'prospect-1', 'user-uuid-1', FALSE, 'Urgent'),
  ('Envoyer documentation technique', '2025-11-13', 'prospect-2', 'user-uuid-1', FALSE, 'Centrale solaire'),
  ('Finaliser présentation', '2025-11-14', 'prospect-3', 'user-uuid-1', FALSE, 'Investissement');

-- =====================================================
-- 6. MIGRER LES MESSAGES DE CHAT
-- =====================================================

-- localStorage.getItem('evatime_chat_messages')
-- Format: { "chat_prospect-1_ACC": [...messages] }

INSERT INTO public.chat_messages (prospect_id, project_type, sender, text, file, read, created_at)
VALUES
  ('prospect-1', 'ACC', 'admin', 'Bonjour Jean, bienvenue chez Locasun !', NULL, TRUE, '2025-11-10 09:00:00+00'),
  ('prospect-1', 'ACC', 'client', 'Merci ! J''ai une question sur le contrat.', NULL, TRUE, '2025-11-10 09:15:00+00'),
  ('prospect-1', 'ACC', 'admin', 'Je vous envoie les détails par email.', NULL, FALSE, '2025-11-10 09:20:00+00');

-- Exemple avec fichier
INSERT INTO public.chat_messages (prospect_id, project_type, sender, text, file, read, created_at)
VALUES
  ('prospect-1', 'ACC', 'client', 'Voici mon RIB', 
   '{"name": "rib.pdf", "size": 12345, "type": "application/pdf", "url": "storage/rib-prospect-1.pdf"}'::jsonb, 
   FALSE, '2025-11-10 10:00:00+00');

-- =====================================================
-- 7. MIGRER LES ÉTAPES DE PROJET
-- =====================================================

-- localStorage.getItem('evatime_project_steps_status')
-- Format: { "prospect_prospect-1_project_ACC": [...steps] }

INSERT INTO public.project_steps_status (prospect_id, project_type, steps)
VALUES
  ('prospect-1', 'ACC', 
   '[
     {"name": "Inscription", "status": "completed", "icon": "✅"},
     {"name": "Connexion à la centrale", "status": "in_progress", "icon": "⚡"},
     {"name": "Contrat", "status": "pending", "icon": "📝"}
   ]'::jsonb),
  ('prospect-2', 'Centrale',
   '[
     {"name": "Inscription", "status": "completed", "icon": "✅"},
     {"name": "Étude technique", "status": "completed", "icon": "📝"},
     {"name": "Contrat", "status": "in_progress", "icon": "✍️"}
   ]'::jsonb);

-- =====================================================
-- 8. MIGRER LES INFOS DE PROJET
-- =====================================================

-- localStorage.getItem('evatime_project_infos')
-- Format: { "prospect-1": { "ACC": { ribFile: "rib.pdf", ... } } }

INSERT INTO public.project_infos (prospect_id, project_type, data)
VALUES
  ('prospect-1', 'ACC', 
   '{"ribFile": "rib.pdf", "kbis": "kbis.pdf", "validated": true}'::jsonb),
  ('prospect-2', 'Centrale',
   '{"surface": 500, "orientation": "Sud", "inclinaison": 30, "type_toiture": "Bac acier"}'::jsonb);

-- =====================================================
-- 9. MIGRER LES NOTIFICATIONS
-- =====================================================

-- localStorage.getItem('evatime_notifications')

INSERT INTO public.notifications (prospect_id, project_type, prospect_name, project_name, count, read)
VALUES
  ('prospect-1', 'ACC', 'Jean Dupont', 'Autoconsommation Collective', 3, FALSE),
  ('prospect-2', 'Centrale', 'Marie Martin', 'Centrale Solaire', 1, FALSE);

-- localStorage.getItem('evatime_client_notifications')

INSERT INTO public.client_notifications (prospect_id, project_type, project_name, message, count, read)
VALUES
  ('prospect-1', 'ACC', 'Autoconsommation Collective', 'Nouveau message de votre conseiller', 2, FALSE);

-- =====================================================
-- 10. MIGRER LES FORMULAIRES
-- =====================================================

-- localStorage.getItem('evatime_forms')

INSERT INTO public.forms (form_id, name, fields)
VALUES
  ('ACC_CONNECTION', 'Formulaire de connexion ACC',
   '[
     {"id": "pdl", "label": "Numéro PDL", "type": "text", "required": true},
     {"id": "address", "label": "Adresse", "type": "text", "required": true}
   ]'::jsonb);

-- =====================================================
-- 11. MIGRER LES PROMPTS CHARLY AI
-- =====================================================

-- localStorage.getItem('evatime_prompts')

INSERT INTO public.prompts (prompt_id, name, content)
VALUES
  ('welcome_acc', 'Message de bienvenue ACC',
   '{"steps": ["Bonjour {name}, bienvenue !", "Voici les prochaines étapes..."]}'::jsonb);

-- =====================================================
-- 12. VÉRIFICATION DES DONNÉES MIGRÉES
-- =====================================================

-- Compter les enregistrements par table
SELECT 
  'users' AS table_name, COUNT(*) AS count FROM public.users
UNION ALL
SELECT 'prospects', COUNT(*) FROM public.prospects
UNION ALL
SELECT 'appointments', COUNT(*) FROM public.appointments
UNION ALL
SELECT 'calls', COUNT(*) FROM public.calls
UNION ALL
SELECT 'tasks', COUNT(*) FROM public.tasks
UNION ALL
SELECT 'chat_messages', COUNT(*) FROM public.chat_messages
UNION ALL
SELECT 'notifications', COUNT(*) FROM public.notifications
UNION ALL
SELECT 'project_steps_status', COUNT(*) FROM public.project_steps_status
UNION ALL
SELECT 'project_infos', COUNT(*) FROM public.project_infos;

-- Vérifier les relations (foreign keys)
SELECT 
  p.name AS prospect_name,
  u.name AS owner_name,
  COUNT(a.id) AS appointments_count,
  COUNT(c.id) AS calls_count,
  COUNT(t.id) AS tasks_count
FROM public.prospects p
LEFT JOIN public.users u ON p.owner_id = u.id
LEFT JOIN public.appointments a ON a.contact_id = p.id
LEFT JOIN public.calls c ON c.contact_id = p.id
LEFT JOIN public.tasks t ON t.contact_id = p.id
GROUP BY p.id, p.name, u.name;

-- =====================================================
-- 13. SCRIPT DE NETTOYAGE (SI BESOIN)
-- =====================================================

-- ⚠️ ATTENTION : Ceci supprime TOUTES les données !
-- À utiliser uniquement en développement

-- TRUNCATE TABLE public.chat_messages CASCADE;
-- TRUNCATE TABLE public.notifications CASCADE;
-- TRUNCATE TABLE public.client_notifications CASCADE;
-- TRUNCATE TABLE public.project_steps_status CASCADE;
-- TRUNCATE TABLE public.project_infos CASCADE;
-- TRUNCATE TABLE public.appointments CASCADE;
-- TRUNCATE TABLE public.calls CASCADE;
-- TRUNCATE TABLE public.tasks CASCADE;
-- TRUNCATE TABLE public.prospects CASCADE;
-- TRUNCATE TABLE public.users CASCADE;

-- =====================================================
-- FIN DES EXEMPLES DE MIGRATION
-- =====================================================
