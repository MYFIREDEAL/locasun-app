-- =====================================================
-- NETTOYAGE: Supprimer les politiques RLS en double sur client_form_panels
-- =====================================================
-- Date: 18 novembre 2025
-- Problème: 6 politiques au lieu de 3 (doublons)
-- Solution: Supprimer les anciennes et garder les bonnes
-- =====================================================

-- 📋 ÉTAT ACTUEL (6 politiques) :
-- 1. "Admins can manage client form panels" (ALL, public)
-- 2. "admin_all_client_form_panels" (ALL, authenticated) ✅ À GARDER
-- 3. "Clients can manage their own form panels" (ALL, public)
-- 4. "client_select_own_form_panels" (SELECT, authenticated) ✅ À GARDER
-- 5. "client_update_own_form_panels" (UPDATE, authenticated) ✅ À GARDER
-- 6. "Clients can update their own form panel status" (UPDATE, authenticated) ❌ DOUBLON

-- =====================================================
-- ÉTAPE 1: Supprimer les doublons
-- =====================================================

-- Supprimer les politiques avec noms en anglais (anciennes)
DROP POLICY IF EXISTS "Admins can manage client form panels" ON public.client_form_panels;
DROP POLICY IF EXISTS "Clients can manage their own form panels" ON public.client_form_panels;
DROP POLICY IF EXISTS "Clients can update their own form panel status" ON public.client_form_panels;

-- =====================================================
-- ÉTAPE 2: Vérifier qu'il reste 3 politiques
-- =====================================================

SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE tablename = 'client_form_panels'
ORDER BY policyname;

-- Résultat attendu (3 politiques) :
-- 1. admin_all_client_form_panels (ALL)
-- 2. client_select_own_form_panels (SELECT)
-- 3. client_update_own_form_panels (UPDATE)

-- =====================================================
-- EXPLICATION DES POLITIQUES FINALES
-- =====================================================

-- 1️⃣ admin_all_client_form_panels
--    - Admins (Global Admin, Manager, Commercial) peuvent tout faire
--    - SELECT, INSERT, UPDATE, DELETE

-- 2️⃣ client_select_own_form_panels
--    - Clients peuvent voir leurs propres formulaires
--    - SELECT uniquement

-- 3️⃣ client_update_own_form_panels
--    - Clients peuvent mettre à jour leurs propres formulaires
--    - UPDATE (status, user_override, etc.)

-- =====================================================
-- TEST APRÈS NETTOYAGE
-- =====================================================

-- Test 1: Compter les politiques (doit être 3)
SELECT COUNT(*) as nb_policies 
FROM pg_policies 
WHERE tablename = 'client_form_panels';

-- Test 2: Vérifier aucun doublon
SELECT policyname, COUNT(*) as count
FROM pg_policies
WHERE tablename = 'client_form_panels'
GROUP BY policyname
HAVING COUNT(*) > 1;
-- ☝️ Doit retourner 0 ligne (aucun doublon)
