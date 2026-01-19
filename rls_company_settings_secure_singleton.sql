-- =====================================================
-- 🔒 SÉCURISATION RLS - COMPANY_SETTINGS (SINGLETON)
-- =====================================================
-- Phase 2 (version corrigée) : Réduction surface d'attaque
-- Auteur : Dev VS Code (équipe EVATIME)
-- Date : 2026-01-19
-- Validation requise : ChatGPT + Jack (PO)
-- =====================================================
-- ⚠️ IMPORTANT : Cette table reste un SINGLETON global
-- ❌ PAS de organization_id
-- ❌ PAS de refactoring multi-tenant
-- ✅ Juste verrouillage des accès
-- =====================================================

-- =====================================================
-- ÉTAPE 1 : VÉRIFIER / ACTIVER RLS
-- =====================================================

-- Activer RLS si pas déjà actif (idempotent)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Note : RLS déjà activé dans schema.sql ligne 841
-- Cette commande est idempotente (ne fait rien si déjà actif)

-- =====================================================
-- ÉTAPE 2 : SUPPRIMER POLICIES EXISTANTES
-- =====================================================

-- Drop la policy trop permissive "Global Admin can manage company settings"
-- (permet FOR ALL = SELECT + INSERT + UPDATE + DELETE)
DROP POLICY IF EXISTS "Global Admin can manage company settings" ON public.company_settings;

-- =====================================================
-- ÉTAPE 3 : CRÉER POLICIES RESTRICTIVES
-- =====================================================

-- -----------------------------------------------------
-- 🔐 POLICY SELECT : Lecture pour authenticated
-- -----------------------------------------------------

CREATE POLICY "company_settings_select_authenticated"
  ON public.company_settings
  FOR SELECT
  USING (
    -- Tous les utilisateurs authentifiés peuvent lire
    -- (nécessaire pour afficher logo/branding dans l'app)
    auth.uid() IS NOT NULL
  );

COMMENT ON POLICY "company_settings_select_authenticated" 
ON public.company_settings IS 
'Lecture seule pour tous les utilisateurs authentifiés (admin + clients). Nécessaire pour branding UI.';

-- -----------------------------------------------------
-- ✏️ POLICY UPDATE : Platform admin uniquement
-- -----------------------------------------------------

CREATE POLICY "company_settings_update_platform_admin_only"
  ON public.company_settings
  FOR UPDATE
  USING (
    -- Seul platform_admin peut modifier
    (auth.jwt()->>'role') = 'platform_admin'
  );

COMMENT ON POLICY "company_settings_update_platform_admin_only" 
ON public.company_settings IS 
'Modification réservée exclusivement aux platform admins. Protège contre modifications accidentelles.';

-- -----------------------------------------------------
-- ➕ POLICY INSERT : Bloqué
-- -----------------------------------------------------

-- ❌ AUCUNE policy INSERT
-- La table est un singleton déjà initialisé
-- Aucun insert ne doit être possible via PostgREST

-- Note : Sans policy INSERT, tous les INSERT sont bloqués par défaut (RLS)

-- -----------------------------------------------------
-- 🗑️ POLICY DELETE : Bloqué pour tous
-- -----------------------------------------------------

-- ❌ AUCUNE policy DELETE
-- Même platform_admin ne peut pas supprimer
-- (protection contre suppression accidentelle du singleton)

-- Note : Sans policy DELETE, tous les DELETE sont bloqués par défaut (RLS)

-- =====================================================
-- ✅ RÉCAPITULATIF POLICIES CRÉÉES
-- =====================================================

-- SELECT : ✅ Tous les authenticated (admin + clients)
-- UPDATE : ✅ Platform admin uniquement
-- INSERT : ❌ Bloqué pour tous (pas de policy)
-- DELETE : ❌ Bloqué pour tous (pas de policy)

-- =====================================================
-- 🧪 CHECKLIST DE TESTS (à exécuter après ce script)
-- =====================================================

-- TEST 1 : Admin authentifié peut LIRE
-- Connecté comme Global Admin (org quelconque) :
-- SELECT * FROM company_settings;
-- ✅ Attendu : Retourne la ligne singleton (logo, company_name, etc.)

-- TEST 2 : Client authentifié peut LIRE
-- Connecté comme client (user dans prospects) :
-- SELECT * FROM company_settings;
-- ✅ Attendu : Retourne la ligne singleton (pour affichage branding)

-- TEST 3 : Utilisateur non authentifié (anon) NE PEUT PAS lire
-- Non connecté (anon key) :
-- SELECT * FROM company_settings;
-- ❌ Attendu : Aucune ligne (bloqué par USING auth.uid() IS NOT NULL)

-- TEST 4 : Global Admin NE PEUT PAS modifier
-- Connecté comme Global Admin :
-- UPDATE company_settings SET company_name = 'Hack' WHERE id = '9769af46-b3ac-4909-8810-a8cf3fd6e307';
-- ❌ Attendu : Erreur "permission denied" (seul platform_admin autorisé)

-- TEST 5 : Manager NE PEUT PAS modifier
-- Connecté comme Manager :
-- UPDATE company_settings SET logo_url = 'hack.png' WHERE id = '9769af46-b3ac-4909-8810-a8cf3fd6e307';
-- ❌ Attendu : Erreur "permission denied"

-- TEST 6 : Platform admin PEUT modifier
-- Connecté comme platform_admin (JWT avec role='platform_admin') :
-- UPDATE company_settings SET company_name = 'New Name' WHERE id = '9769af46-b3ac-4909-8810-a8cf3fd6e307';
-- ✅ Attendu : Succès

-- TEST 7 : Aucun rôle ne peut INSERT
-- Connecté comme n'importe quel user (même platform_admin) :
-- INSERT INTO company_settings (company_name) VALUES ('Test');
-- ❌ Attendu : Erreur "permission denied" (pas de policy INSERT)

-- TEST 8 : Aucun rôle ne peut DELETE
-- Connecté comme platform_admin :
-- DELETE FROM company_settings WHERE id = '9769af46-b3ac-4909-8810-a8cf3fd6e307';
-- ❌ Attendu : Erreur "permission denied" (pas de policy DELETE)

-- =====================================================
-- 🚨 NOTES IMPORTANTES
-- =====================================================

-- 1. HOOKS FRONTEND
--    ✅ useSupabaseCompanySettings.js fonctionne tel quel
--    Le SELECT continue de marcher car authenticated = OK
--    Les UPDATE via le hook seront bloqués sauf platform_admin

-- 2. QUI PEUT MODIFIER LE LOGO/SETTINGS ?
--    Actuellement : Seul platform_admin
--    Si besoin d'autoriser Global Admin :
--    → Modifier la policy UPDATE pour ajouter :
--    OR EXISTS (
--      SELECT 1 FROM public.users
--      WHERE user_id = auth.uid() AND role = 'Global Admin'
--    )

-- 3. SINGLETON vs MULTI-TENANT
--    Cette table reste GLOBALE (pas de organization_id)
--    C'est un choix d'architecture accepté pour cette phase
--    Migration future possible mais hors scope

-- 4. PROTECTION EDGE FUNCTIONS
--    Les Edge Functions avec service_role_key peuvent toujours
--    INSERT/UPDATE/DELETE (bypass RLS)
--    C'est le comportement attendu pour l'admin système

-- 5. SURFACE D'ATTAQUE RÉDUITE
--    Avant : Global Admin pouvait tout modifier (FOR ALL)
--    Après : Seul platform_admin peut modifier
--    Lecture reste accessible (nécessaire pour UI)

-- =====================================================
-- 🔍 VÉRIFICATION POST-EXÉCUTION
-- =====================================================

-- Lister les policies actives sur company_settings :
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'company_settings';

-- Attendu :
-- - company_settings_select_authenticated (FOR SELECT)
-- - company_settings_update_platform_admin_only (FOR UPDATE)

-- Vérifier RLS activé :
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE tablename = 'company_settings';

-- Attendu : rowsecurity = true

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
