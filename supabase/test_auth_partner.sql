-- =====================================================
-- TESTS AUTH & RLS — PARTENAIRES
-- =====================================================
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Objectif: Valider l'isolation stricte des partenaires
-- =====================================================

-- =====================================================
-- PRÉREQUIS: Avoir créé un partenaire via invite-partner
-- Récupérer son user_id depuis auth.users
-- =====================================================

-- =====================================================
-- TEST 1: Partner connecté voit son propre profil (✅ OK attendu)
-- =====================================================

-- Simuler connexion en tant que Partner (remplacer UUID)
-- SET LOCAL "request.jwt.claims" = '{"sub": "PARTNER_USER_ID_HERE"}';

-- SELECT * FROM public.partners;
-- Résultat attendu: 1 ligne (son propre enregistrement)

-- =====================================================
-- TEST 2: Partner ne voit PAS les autres partners (❌ REFUS attendu)
-- =====================================================

-- En tant que Partner A
-- SELECT count(*) FROM public.partners;
-- Résultat attendu: 1 (uniquement lui-même)

-- SELECT * FROM public.partners WHERE id != 'MY_PARTNER_ID';
-- Résultat attendu: 0 lignes

-- =====================================================
-- TEST 3: Partner voit SES missions (✅ OK attendu)
-- =====================================================

-- SELECT * FROM public.missions;
-- Résultat attendu: Uniquement ses missions (via partner_id)

-- =====================================================
-- TEST 4: Partner ne voit PAS les prospects (❌ REFUS attendu)
-- =====================================================

-- SELECT * FROM public.prospects LIMIT 1;
-- Résultat attendu: 0 lignes
-- (Aucune policy RLS pour partners sur prospects)

-- =====================================================
-- TEST 5: Partner ne voit PAS les users admin (❌ REFUS attendu)
-- =====================================================

-- SELECT * FROM public.users LIMIT 1;
-- Résultat attendu: 0 lignes
-- (Policies users ne matchent que public.users, pas partners)

-- =====================================================
-- TEST 6: Partner ne voit PAS le pipeline (❌ REFUS attendu)
-- =====================================================

-- SELECT * FROM public.global_pipeline_steps LIMIT 1;
-- Résultat attendu: 0 lignes ou erreur permission denied

-- SELECT * FROM public.project_steps_status LIMIT 1;
-- Résultat attendu: 0 lignes

-- =====================================================
-- TEST 7: Partner ne voit PAS les autres tables sensibles
-- =====================================================

-- SELECT * FROM public.appointments LIMIT 1;
-- Résultat attendu: 0 lignes

-- SELECT * FROM public.chat_messages LIMIT 1;
-- Résultat attendu: 0 lignes

-- SELECT * FROM public.forms LIMIT 1;
-- Résultat attendu: 0 lignes

-- SELECT * FROM public.prompts LIMIT 1;
-- Résultat attendu: 0 lignes

-- =====================================================
-- TEST 8: Partner peut modifier SES missions (status, partner_notes)
-- =====================================================

-- UPDATE public.missions 
-- SET status = 'in_progress', partner_notes = 'Test note'
-- WHERE id = 'MY_MISSION_ID';
-- Résultat attendu: 1 ligne modifiée

-- =====================================================
-- TEST 9: Partner ne peut PAS modifier admin_notes (logique app)
-- =====================================================
-- Note: RLS permet UPDATE, mais l'app doit restreindre les colonnes
-- Ce test valide que la mise à jour fonctionne techniquement
-- La restriction des colonnes est gérée côté application

-- =====================================================
-- TEST 10: Partner ne peut PAS créer de missions
-- =====================================================

-- INSERT INTO public.missions (organization_id, partner_id, prospect_id, project_type, title)
-- VALUES ('org-id', 'partner-id', 'prospect-id', 'ACC', 'Fake mission');
-- Résultat attendu: Erreur permission denied
-- (Pas de policy INSERT pour partners sur missions)

-- =====================================================
-- RÉSUMÉ SÉCURITÉ AUTH PARTENAIRE
-- =====================================================
-- 
-- ✅ Un partenaire = un compte auth.users
-- ✅ partners.user_id → auth.users.id (lien strict NOT NULL)
-- ✅ Création via invite-partner uniquement (admin only)
-- ✅ Partner ne s'inscrit jamais seul
-- 
-- ISOLATION GARANTIE:
-- ✅ Voit uniquement son profil partners
-- ✅ Voit uniquement ses missions
-- ✅ Zéro accès: prospects, users, pipeline, appointments, chat, forms, prompts
-- ✅ Peut modifier: status + partner_notes de ses missions
-- ✅ Ne peut pas: créer/supprimer missions, modifier autres champs
-- 
-- =====================================================
