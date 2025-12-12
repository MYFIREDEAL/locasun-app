-- 🔙 ROLLBACK : Supprimer la fonction admin_update_user_email
-- À exécuter UNIQUEMENT si la fonction cause des problèmes

-- 1. Supprimer la fonction
DROP FUNCTION IF EXISTS admin_update_user_email(UUID, TEXT);

-- 2. Vérifier que la fonction a bien été supprimée
SELECT proname 
FROM pg_proc 
WHERE proname = 'admin_update_user_email';
-- ✅ Si aucun résultat → fonction supprimée avec succès

-- 📝 Note: Ce rollback ne touche PAS aux données existantes
-- Les emails déjà modifiés restent modifiés
-- Cette commande supprime juste la fonction pour empêcher de futurs changements

-- ⚠️ Après rollback:
-- - Les admins ne pourront plus changer les emails depuis l'interface
-- - L'interface affichera une erreur "function admin_update_user_email does not exist"
-- - Pour restaurer: ré-exécuter create_admin_update_user_email.sql
