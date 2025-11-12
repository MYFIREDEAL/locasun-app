-- Voir le contenu complet d'un appointment
SELECT id, title, start_time, end_time, contact_id, assigned_user_id, type, status
FROM public.appointments
LIMIT 1;
