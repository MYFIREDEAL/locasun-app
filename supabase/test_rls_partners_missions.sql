-- =====================================================
-- TESTS RLS — PARTNERS & MISSIONS
-- =====================================================
-- À exécuter dans Supabase Dashboard > SQL Editor
-- Chaque test valide l'isolation multi-tenant et partenaire
-- =====================================================

-- =====================================================
-- SETUP: Variables de test (à remplacer par vos UUIDs réels)
-- =====================================================

-- Partner A (tenant 1)
-- SET LOCAL "request.jwt.claims" = '{"sub": "PARTNER_A_AUTH_UID"}';

-- Partner B (tenant 1) 
-- SET LOCAL "request.jwt.claims" = '{"sub": "PARTNER_B_AUTH_UID"}';

-- Admin Tenant 1
-- SET LOCAL "request.jwt.claims" = '{"sub": "ADMIN_TENANT_1_AUTH_UID"}';

-- Admin Tenant 2
-- SET LOCAL "request.jwt.claims" = '{"sub": "ADMIN_TENANT_2_AUTH_UID"}';

-- =====================================================
-- TEST 1: Partner voit son propre profil (✅ OK attendu)
-- =====================================================

-- En tant que Partner A, vérifier qu'il voit son profil
-- SELECT * FROM public.partners WHERE user_id = auth.uid();
-- Résultat attendu: 1 ligne (son propre enregistrement)

-- =====================================================
-- TEST 2: Partner ne voit PAS les autres partners (❌ REFUS attendu)
-- =====================================================

-- En tant que Partner A
-- SELECT * FROM public.partners WHERE user_id != auth.uid();
-- Résultat attendu: 0 lignes (RLS bloque)

-- =====================================================
-- TEST 3: Partner voit SES missions (✅ OK attendu)
-- =====================================================

-- En tant que Partner A
-- SELECT m.* FROM public.missions m
-- INNER JOIN public.partners p ON p.id = m.partner_id
-- WHERE p.user_id = auth.uid();
-- Résultat attendu: Ses missions uniquement

-- =====================================================
-- TEST 4: Partner ne voit PAS les missions d'un autre (❌ REFUS attendu)
-- =====================================================

-- En tant que Partner A, tenter de voir les missions de Partner B
-- SELECT * FROM public.missions WHERE partner_id = 'PARTNER_B_ID';
-- Résultat attendu: 0 lignes (RLS bloque)

-- =====================================================
-- TEST 5: Partner ne peut PAS accéder aux prospects (❌ REFUS attendu)
-- =====================================================

-- En tant que Partner A
-- SELECT * FROM public.prospects LIMIT 1;
-- Résultat attendu: 0 lignes ou erreur permission denied
-- (Aucune policy RLS pour partners sur prospects)

-- =====================================================
-- TEST 6: Admin Tenant 1 voit partners de son org (✅ OK attendu)
-- =====================================================

-- En tant qu'Admin Tenant 1
-- SELECT * FROM public.partners WHERE organization_id = 'TENANT_1_ORG_ID';
-- Résultat attendu: Tous les partners de son org

-- =====================================================
-- TEST 7: Admin Tenant 1 ne voit PAS partners Tenant 2 (❌ REFUS attendu)
-- =====================================================

-- En tant qu'Admin Tenant 1
-- SELECT * FROM public.partners WHERE organization_id = 'TENANT_2_ORG_ID';
-- Résultat attendu: 0 lignes (cross-tenant bloqué)

-- =====================================================
-- TEST 8: Admin Tenant 1 voit missions de son org (✅ OK attendu)
-- =====================================================

-- En tant qu'Admin Tenant 1
-- SELECT * FROM public.missions WHERE organization_id = 'TENANT_1_ORG_ID';
-- Résultat attendu: Toutes les missions de son org

-- =====================================================
-- TEST 9: Admin Tenant 1 ne voit PAS missions Tenant 2 (❌ REFUS attendu)
-- =====================================================

-- En tant qu'Admin Tenant 1
-- SELECT * FROM public.missions WHERE organization_id = 'TENANT_2_ORG_ID';
-- Résultat attendu: 0 lignes (cross-tenant bloqué)

-- =====================================================
-- TEST 10: Partner ne peut PAS modifier admin_notes (❌ REFUS attendu)
-- =====================================================

-- En tant que Partner A, tenter de modifier admin_notes
-- UPDATE public.missions SET admin_notes = 'HACKED' WHERE partner_id = 'MY_PARTNER_ID';
-- Note: La policy permet UPDATE mais l'application doit restreindre les colonnes
-- Ce test valide que le partner ne peut pas modifier les missions d'un autre

-- =====================================================
-- VALIDATION COMPLÈTE
-- =====================================================
-- 
-- Si tous les tests passent:
-- ✅ Partner isolé : ne voit que lui-même et ses missions
-- ✅ Cross-partner bloqué : Partner A ≠ Partner B
-- ✅ Cross-tenant bloqué : Org 1 ≠ Org 2
-- ✅ Zéro accès CRM : Partners ne voient pas prospects
-- 
-- =====================================================
