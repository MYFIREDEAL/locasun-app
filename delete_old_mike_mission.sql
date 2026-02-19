-- 🗑️ Supprimer l'ancienne mission pour mike (qui a NULL)
DELETE FROM missions WHERE title ILIKE '%mike%';

-- ✅ Vérifier que c'est bien supprimé
SELECT id, title, client_name, email, phone FROM missions WHERE title ILIKE '%mike%';
