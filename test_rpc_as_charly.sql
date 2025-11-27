-- =====================================================
-- TEST : Vérifier que get_accessible_users() retourne
-- Jack LUC pour Charly
-- =====================================================

-- Note: Cette requête simule l'appel RPC depuis le frontend
-- Elle devrait retourner 2 utilisateurs :
-- 1. Charly (lui-même)
-- 2. Jack LUC (via access_rights)

SELECT * FROM get_accessible_users();

-- Si vous voyez seulement Charly, vérifiez :
-- 1. Que Charly a bien access_rights.users = ['82be903d-9600-4c53-9cd4-113bfaaac12e']
SELECT name, access_rights FROM users WHERE name = 'charly';

-- 2. Que Jack LUC a bien le user_id '82be903d-9600-4c53-9cd4-113bfaaac12e'
SELECT name, user_id FROM users WHERE user_id = '82be903d-9600-4c53-9cd4-113bfaaac12e';
