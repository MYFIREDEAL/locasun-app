-- =========================================================
-- STEP 1B — Migration platform_admin existant + vérification
-- =========================================================
-- Date : 5 février 2026
-- Prérequis : Step 1A exécuté
-- =========================================================

-- 1) Insérer le platform_admin existant (Jack Luc)
INSERT INTO public.platform_admins (user_id, email)
VALUES ('66adc899-0d3e-46f6-87ec-4c73b4fe4e26', 'jack.luc2021@gmail.com')
ON CONFLICT (user_id) DO NOTHING;

-- 2) Vérifier l'insertion
SELECT * FROM public.platform_admins;

-- 3) Tester le helper (devrait retourner true si connecté avec ce user_id)
-- Note: En SQL Editor, auth.uid() retourne NULL (pas de contexte auth)
-- Ce test sera fait côté frontend après adaptation
